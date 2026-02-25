import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as userApi from '../services/userApi';
import * as authApi from '../services/authApi';

// Import other stores to clear on auth changes
import useTripStore from './tripStore';
import { useRecommendationsStore } from './recommendationsStore';
import { useItineraryStore } from './itineraryStore';

/**
 * Clear browser-persisted cache data (NOT user itinerary data)
 * Called on login/register to ensure fresh recommendations but preserve saved items
 * Note: Itinerary is NOT cleared - it should persist with the user
 */
const clearCacheOnUserChange = () => {
  // Clear trip store (serendibtrip-store in localStorage) - this is form cache, ok to clear
  useTripStore.getState().reset();
  
  // Clear recommendations store (serendibtrip-recommendations in localStorage) - cache, ok to clear
  useRecommendationsStore.getState().clearRecommendations();
  
  // NOTE: Do NOT clear itinerary store - user's saved items should persist
  // Itinerary items are associated with tripId (destination-date) which links to user's trips
};

/**
 * Clear ALL local data including itinerary
 * Called ONLY on logout to ensure complete cleanup
 */
const clearAllDataOnLogout = () => {
  useTripStore.getState().reset();
  useRecommendationsStore.getState().clearRecommendations();
  useItineraryStore.getState().clearItinerary();
};

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

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          authApi.storeTokens(
            response.data.accessToken,
            response.data.refreshToken
          );
          
          // Clear all local data before setting new user
          // This ensures a fresh start and no leftover data from previous users
          clearCacheOnUserChange();
          
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          // Fetch full profile after login
          get().fetchProfile();
          return response;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({
            email,
            password,
            fullName,
          });
          authApi.storeTokens(
            response.data.accessToken,
            response.data.refreshToken
          );
          
          // Clear all local data for new user
          // This ensures new accounts start completely fresh
          clearCacheOnUserChange();
          
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return response;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      logout: () => {
        authApi.clearTokens();
        
        // Clear all local data on logout (including itinerary)
        clearAllDataOnLogout();
        
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
          const trips = response.data;
          set({
            trips: trips,
            tripsLoading: false,
          });
          
          // Also load savedItems from trips into itineraryStore
          // This enables persistence of itinerary items across logins
          const itineraryStore = useItineraryStore.getState();
          const allSavedItems = [];
          trips.forEach(trip => {
            if (trip.savedItems && trip.savedItems.length > 0) {
              trip.savedItems.forEach(item => {
                // Add tripId to each item if not present
                allSavedItems.push({
                  ...item,
                  tripId: item.tripId || `${trip.destination}-${trip.startDate}`.toLowerCase().replace(/\s+/g, '-'),
                });
              });
            }
          });
          
          // Only set if we have items from backend that aren't already in store
          if (allSavedItems.length > 0 && itineraryStore.savedItems.length === 0) {
            // Import savedItems by setting them directly (we'll add a setter for this)
            useItineraryStore.setState({ savedItems: allSavedItems });
            console.log('Loaded', allSavedItems.length, 'saved items from trips');
          }
          
          return trips;
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
          // Remove trip from user's trips
          set((state) => ({
            trips: state.trips.filter((trip) => trip.tripId !== tripId),
          }));
          // Also clear all itinerary items for this trip
          useItineraryStore.getState().clearTripItems(tripId);
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
