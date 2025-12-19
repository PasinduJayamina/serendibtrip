import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as userApi from '../services/userApi';

/**
 * Zustand store for user profile management
 * Persists authentication state to localStorage
 */
export const useUserStore = create(
  persist(
    (set, get) => ({
      // User data
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Favorites
      favorites: [],
      favoritesLoading: false,

      // Trips
      trips: [],
      tripsLoading: false,

      // Reviews
      reviews: [],
      reviewsLoading: false,

      // ============ AUTH ACTIONS ============

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          isAuthenticated: false,
          favorites: [],
          trips: [],
          reviews: [],
          error: null,
        });
      },

      // ============ PROFILE ACTIONS ============

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await userApi.getProfile();
          set({
            user: response.data,
            isAuthenticated: true,
            favorites: response.data.favoriteAttractions || [],
            trips: response.data.savedTrips || [],
            reviews: response.data.reviews || [],
            isLoading: false,
          });
          return response.data;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Failed to fetch profile',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await userApi.updateProfile(profileData);
          set((state) => ({
            user: { ...state.user, ...response.data },
            isLoading: false,
          }));
          return response.data;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Failed to update profile',
            isLoading: false,
          });
          throw error;
        }
      },

      updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
          const response = await userApi.updatePreferences(preferences);
          set((state) => ({
            user: {
              ...state.user,
              preferences: response.data,
            },
            isLoading: false,
          }));
          return response.data;
        } catch (error) {
          set({
            error:
              error.response?.data?.message || 'Failed to update preferences',
            isLoading: false,
          });
          throw error;
        }
      },

      // ============ FAVORITES ACTIONS ============

      fetchFavorites: async () => {
        set({ favoritesLoading: true });
        try {
          const response = await userApi.getFavorites();
          set({
            favorites: response.data,
            favoritesLoading: false,
          });
          return response.data;
        } catch (error) {
          set({ favoritesLoading: false });
          throw error;
        }
      },

      addFavorite: async (attractionId, attractionData) => {
        try {
          const response = await userApi.addFavorite(
            attractionId,
            attractionData
          );
          set({ favorites: response.data });
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      removeFavorite: async (attractionId) => {
        try {
          const response = await userApi.removeFavorite(attractionId);
          set({ favorites: response.data });
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      isFavorite: (attractionId) => {
        return get().favorites.some((fav) => fav.attractionId === attractionId);
      },

      // ============ TRIPS ACTIONS ============

      fetchTrips: async () => {
        set({ tripsLoading: true });
        try {
          const response = await userApi.getTrips();
          set({
            trips: response.data,
            tripsLoading: false,
          });
          return response.data;
        } catch (error) {
          set({ tripsLoading: false });
          throw error;
        }
      },

      saveTrip: async (tripData) => {
        try {
          const response = await userApi.saveTrip(tripData);
          set((state) => ({
            trips: [...state.trips, response.data],
          }));
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      updateTrip: async (tripId, tripData) => {
        try {
          const response = await userApi.updateTrip(tripId, tripData);
          set((state) => ({
            trips: state.trips.map((trip) =>
              trip.tripId === tripId ? response.data : trip
            ),
          }));
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      deleteTrip: async (tripId) => {
        try {
          await userApi.deleteTrip(tripId);
          set((state) => ({
            trips: state.trips.filter((trip) => trip.tripId !== tripId),
          }));
        } catch (error) {
          throw error;
        }
      },

      // ============ REVIEWS ACTIONS ============

      fetchReviews: async () => {
        set({ reviewsLoading: true });
        try {
          const response = await userApi.getReviews();
          set({
            reviews: response.data,
            reviewsLoading: false,
          });
          return response.data;
        } catch (error) {
          set({ reviewsLoading: false });
          throw error;
        }
      },

      addReview: async (reviewData) => {
        try {
          const response = await userApi.addReview(reviewData);
          set((state) => ({
            reviews: [...state.reviews, response.data],
          }));
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      // ============ UTILITY ACTIONS ============

      clearError: () => set({ error: null }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useUserStore;
