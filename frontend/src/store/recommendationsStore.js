import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateItinerary } from '../services/recommendationsApi';

/**
 * Zustand store for AI recommendations
 * Now caches recommendations PER DESTINATION so each trip has its own cache
 * Recommendations persist until user explicitly refreshes or 24 hours pass
 */
export const useRecommendationsStore = create(
  persist(
    (set, get) => ({
      // Cache of recommendations by destination (key = destination name lowercase)
      recommendationsByDestination: {},

      // Current active destination (for backward compatibility)
      currentDestination: null,

      // Loading state
      loading: false,

      // Error state
      error: null,

      // Active fetch tracking (prevents stale responses)
      _activeFetchId: null,

      // Fetch recommendations - runs in store so it survives navigation
      fetchRecommendations: async (params, { forceRefresh = false } = {}) => {
        const destination = params.destination;
        if (!destination) {
          set({ error: 'Destination is required', loading: false });
          return null;
        }

        // If not forcing refresh and we have valid cache, return cached
        if (!forceRefresh) {
          const cached = get().getCachedByDestination(destination);
          if (cached) {
            const hasItems = ((cached.topAttractions?.length || 0) + (cached.recommendedRestaurants?.length || 0)) > 0;
            if (hasItems) {
              console.log('Store: Using cached recommendations for:', destination);
              return cached;
            }
          }
        }

        // Generate a unique fetch ID to handle race conditions
        const fetchId = Date.now() + '-' + Math.random().toString(36).slice(2);
        set({ loading: true, error: null, _activeFetchId: fetchId });

        console.log('Store: Fetching FRESH recommendations for:', destination);

        try {
          const response = await generateItinerary(params);

          // Check if this fetch is still the active one (not stale)
          if (get()._activeFetchId !== fetchId) {
            console.log('Store: Fetch was superseded, discarding results');
            return null;
          }

          if (response.success) {
            const data = response.data;
            get().setRecommendations(data, params);
            set({ loading: false, _activeFetchId: null });
            return data;
          } else {
            throw new Error(response.error || 'Failed to get recommendations');
          }
        } catch (err) {
          // Only set error if this is still the active fetch
          if (get()._activeFetchId === fetchId) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch recommendations';
            set({ error: errorMessage, loading: false, _activeFetchId: null });
          }
          return null;
        }
      },

      // ============ ACTIONS ============

      // Set recommendations for a specific destination
      setRecommendations: (data, params) => {
        const destination = params.destination?.toLowerCase() || 'default';
        set((state) => ({
          recommendationsByDestination: {
            ...state.recommendationsByDestination,
            [destination]: {
              recommendations: data,
              params: params,
              fetchedAt: Date.now(),
            },
          },
          currentDestination: destination,
          error: null,
        }));
      },

      // Set loading state
      setLoading: (loading) => set({ loading }),

      // Set error
      setError: (error) => set({ error, loading: false }),

      // Clear recommendations for a specific destination
      clearRecommendationsForDestination: (destination) => {
        const key = destination?.toLowerCase() || 'default';
        set((state) => {
          const newCache = { ...state.recommendationsByDestination };
          delete newCache[key];
          return { recommendationsByDestination: newCache };
        });
      },

      // Clear all recommendations
      clearRecommendations: () =>
        set({
          recommendationsByDestination: {},
          currentDestination: null,
          error: null,
        }),

      // Get cached recommendations for a destination
      getCachedByDestination: (destination) => {
        const key = destination?.toLowerCase() || 'default';
        const cached = get().recommendationsByDestination[key];
        
        if (!cached) return null;
        
        // Check if still valid (24 hours)
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - cached.fetchedAt > TWENTY_FOUR_HOURS) {
          // Expired, clear it
          get().clearRecommendationsForDestination(destination);
          return null;
        }
        
        return cached.recommendations;
      },

      // Get params for a destination
      getParamsByDestination: (destination) => {
        const key = destination?.toLowerCase() || 'default';
        return get().recommendationsByDestination[key]?.params || null;
      },

      // Check if we have valid cached recommendations for a destination
      hasCachedFor: (destination) => {
        const cached = get().getCachedByDestination(destination);
        return cached !== null && cached.length > 0;
      },

      // Get all cached destinations
      getCachedDestinations: () => {
        return Object.keys(get().recommendationsByDestination);
      },

      // Backward compatibility: get current recommendations
      get recommendations() {
        const { currentDestination, recommendationsByDestination } = get();
        if (!currentDestination) return null;
        return recommendationsByDestination[currentDestination]?.recommendations || null;
      },

      // Backward compatibility: get current params
      get params() {
        const { currentDestination, recommendationsByDestination } = get();
        if (!currentDestination) return null;
        return recommendationsByDestination[currentDestination]?.params || null;
      },

      // Backward compatibility: Check if current params match stored params
      paramsMatch: (newParams) => {
        const key = newParams.destination?.toLowerCase() || 'default';
        const cached = get().recommendationsByDestination[key];
        if (!cached?.params) return false;

        const params = cached.params;
        return (
          params.destination?.toLowerCase() === newParams.destination?.toLowerCase() &&
          params.duration === newParams.duration &&
          params.budget === newParams.budget &&
          params.groupSize === newParams.groupSize &&
          JSON.stringify(params.interests?.sort()) ===
            JSON.stringify(newParams.interests?.sort())
        );
      },

      // Backward compatibility: Check if recommendations are still valid
      isValid: () => {
        const { currentDestination, recommendationsByDestination } = get();
        if (!currentDestination) return false;
        const cached = recommendationsByDestination[currentDestination];
        if (!cached) return false;

        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        return Date.now() - cached.fetchedAt < TWENTY_FOUR_HOURS;
      },

      // Backward compatibility: Get cached recommendations if valid and params match
      getCachedRecommendations: (newParams) => {
        const destination = newParams.destination?.toLowerCase() || 'default';
        const cached = get().getCachedByDestination(destination);
        
        if (cached && get().paramsMatch(newParams)) {
          return cached;
        }
        return null;
      },

      // Backward compatibility: Get stored params
      getStoredParams: () => {
        return get().params;
      },

      // Backward compatibility: Check if we have any stored recommendations
      hasStoredRecommendations: () => {
        const { recommendationsByDestination } = get();
        return Object.keys(recommendationsByDestination).length > 0;
      },
    }),
    {
      name: 'serendibtrip-recommendations',
      version: 4, // Bumped version - moved fetch to store
      // Only persist recommendation cache, not transient loading/error state
      partialize: (state) => ({
        recommendationsByDestination: state.recommendationsByDestination,
        currentDestination: state.currentDestination,
      }),
    }
  )
);

export default useRecommendationsStore;
