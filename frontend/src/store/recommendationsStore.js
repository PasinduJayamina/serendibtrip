import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      version: 3, // Bumped version for migration
      // Use localStorage for persistence across sessions
    }
  )
);

export default useRecommendationsStore;
