import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand store for AI recommendations
 * Persists to sessionStorage so recommendations survive page navigation
 * but clear when the browser tab is closed
 */
export const useRecommendationsStore = create(
  persist(
    (set, get) => ({
      // Current recommendations data
      recommendations: null,

      // Parameters used to generate current recommendations
      params: null,

      // Timestamp of when recommendations were fetched
      fetchedAt: null,

      // Loading state
      loading: false,

      // Error state
      error: null,

      // ============ ACTIONS ============

      // Set recommendations
      setRecommendations: (data, params) =>
        set({
          recommendations: data,
          params: params,
          fetchedAt: Date.now(),
          error: null,
        }),

      // Set loading state
      setLoading: (loading) => set({ loading }),

      // Set error
      setError: (error) => set({ error, loading: false }),

      // Clear recommendations
      clearRecommendations: () =>
        set({
          recommendations: null,
          params: null,
          fetchedAt: null,
          error: null,
        }),

      // Check if current params match stored params
      paramsMatch: (newParams) => {
        const { params } = get();
        if (!params) return false;

        // Compare key fields
        return (
          params.destination === newParams.destination &&
          params.duration === newParams.duration &&
          params.budget === newParams.budget &&
          params.groupSize === newParams.groupSize &&
          JSON.stringify(params.interests?.sort()) ===
            JSON.stringify(newParams.interests?.sort())
        );
      },

      // Check if recommendations are still valid (1 hour cache)
      isValid: () => {
        const { fetchedAt, recommendations } = get();
        if (!recommendations || !fetchedAt) return false;

        const ONE_HOUR = 60 * 60 * 1000;
        return Date.now() - fetchedAt < ONE_HOUR;
      },

      // Get cached recommendations if valid and params match
      getCachedRecommendations: (newParams) => {
        const { recommendations, paramsMatch, isValid } = get();

        if (recommendations && isValid() && paramsMatch(newParams)) {
          return recommendations;
        }
        return null;
      },
    }),
    {
      name: 'serendibtrip-recommendations',
      version: 1,
      // Use sessionStorage instead of localStorage
      // This clears when tab is closed but persists during navigation
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useRecommendationsStore;
