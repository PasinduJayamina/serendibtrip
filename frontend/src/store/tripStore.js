import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * @typedef {Object} Activity
 * @property {string} id - Unique activity identifier
 * @property {string} name - Activity name
 * @property {string} [description] - Activity description
 * @property {string} [location] - Activity location
 * @property {string} [startTime] - Start time (HH:mm)
 * @property {string} [endTime] - End time (HH:mm)
 * @property {number} [cost] - Estimated cost in LKR
 * @property {string} [category] - Activity category
 * @property {Object} [coordinates] - GPS coordinates
 * @property {number} coordinates.lat - Latitude
 * @property {number} coordinates.lng - Longitude
 */

/**
 * @typedef {Object} DayItinerary
 * @property {number} day - Day number (1-indexed)
 * @property {string} date - Date string (YYYY-MM-DD)
 * @property {string} [title] - Day title/theme
 * @property {Activity[]} activities - List of activities for the day
 */

/**
 * @typedef {Object} Trip
 * @property {string} id - Unique trip identifier
 * @property {string} destination - Trip destination
 * @property {string} startDate - Start date (YYYY-MM-DD)
 * @property {string} endDate - End date (YYYY-MM-DD)
 * @property {number} budget - Total budget in LKR
 * @property {number} groupSize - Number of travelers
 * @property {string[]} interests - Selected interests
 * @property {number} tripDuration - Duration in days
 * @property {number} budgetPerPerson - Budget per person in LKR
 * @property {DayItinerary[]} [itinerary] - Day-by-day itinerary
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 * @property {string} [status] - Trip status (draft, planned, completed)
 */

/**
 * @typedef {Object} Attraction
 * @property {string} id - Unique attraction identifier
 * @property {string} name - Attraction name
 * @property {string} [description] - Attraction description
 * @property {string} [location] - Location name
 * @property {string} [imageUrl] - Image URL
 * @property {number} [rating] - Rating (0-5)
 * @property {string[]} [categories] - Categories
 * @property {Object} [coordinates] - GPS coordinates
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} id - Unique recommendation identifier
 * @property {string} type - Recommendation type (attraction, restaurant, activity)
 * @property {string} name - Recommendation name
 * @property {string} [description] - Description
 * @property {string} [reason] - Why it was recommended
 * @property {string} savedAt - Save timestamp
 */

/**
 * @typedef {Object} TripState
 * @property {Trip[]} trips - All trips
 * @property {Trip|null} currentTrip - Currently selected trip
 * @property {DayItinerary[]} itinerary - Current trip's itinerary
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message
 * @property {Attraction[]} favorites - Favorite attractions
 * @property {Recommendation[]} savedRecommendations - Saved AI recommendations
 */

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current ISO timestamp
 * @returns {string} ISO timestamp
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Zustand store for managing trip data
 * Features: localStorage persistence, immer for immutable updates
 */
const useTripStore = create(
  persist(
    immer((set, get) => ({
      // ============ STATE ============
      /** @type {Trip[]} */
      trips: [],

      /** @type {Trip|null} */
      currentTrip: null,

      /** @type {DayItinerary[]} */
      itinerary: [],

      /** @type {boolean} */
      loading: false,

      /** @type {string|null} */
      error: null,

      /** @type {Attraction[]} */
      favorites: [],

      /** @type {Recommendation[]} */
      savedRecommendations: [],

      // ============ TRIP MANAGEMENT ============

      /**
       * Add a new trip
       * @param {Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>} tripData - Trip data without auto-generated fields
       * @returns {string} The new trip's ID
       */
      addTrip: (tripData) => {
        const id = generateId();
        const timestamp = getTimestamp();

        set((state) => {
          const newTrip = {
            ...tripData,
            id,
            status: 'draft',
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          state.trips.push(newTrip);
          state.currentTrip = newTrip;
          state.error = null;
        });

        return id;
      },

      /**
       * Update an existing trip
       * @param {string} tripId - Trip ID to update
       * @param {Partial<Trip>} updates - Fields to update
       * @returns {boolean} Success status
       */
      updateTrip: (tripId, updates) => {
        const tripIndex = get().trips.findIndex((t) => t.id === tripId);

        if (tripIndex === -1) {
          set((state) => {
            state.error = 'Trip not found';
          });
          return false;
        }

        set((state) => {
          state.trips[tripIndex] = {
            ...state.trips[tripIndex],
            ...updates,
            updatedAt: getTimestamp(),
          };

          // Update currentTrip if it's the one being updated
          if (state.currentTrip?.id === tripId) {
            state.currentTrip = state.trips[tripIndex];
          }
          state.error = null;
        });

        return true;
      },

      /**
       * Delete a trip
       * @param {string} tripId - Trip ID to delete
       * @returns {boolean} Success status
       */
      deleteTrip: (tripId) => {
        const tripExists = get().trips.some((t) => t.id === tripId);

        if (!tripExists) {
          set((state) => {
            state.error = 'Trip not found';
          });
          return false;
        }

        set((state) => {
          state.trips = state.trips.filter((t) => t.id !== tripId);

          // Clear currentTrip if it's the one being deleted
          if (state.currentTrip?.id === tripId) {
            state.currentTrip = null;
            state.itinerary = [];
          }
          state.error = null;
        });

        return true;
      },

      /**
       * Set the current active trip
       * @param {string|null} tripId - Trip ID to set as current, or null to clear
       */
      setCurrentTrip: (tripId) => {
        if (tripId === null) {
          set((state) => {
            state.currentTrip = null;
            state.itinerary = [];
          });
          return;
        }

        const trip = get().trips.find((t) => t.id === tripId);

        if (!trip) {
          set((state) => {
            state.error = 'Trip not found';
          });
          return;
        }

        set((state) => {
          state.currentTrip = trip;
          state.itinerary = trip.itinerary || [];
          state.error = null;
        });
      },

      /**
       * Get a single trip by ID
       * @param {string} tripId - Trip ID to retrieve
       * @returns {Trip|undefined} The trip if found
       */
      getTrip: (tripId) => {
        return get().trips.find((t) => t.id === tripId);
      },

      // ============ ITINERARY MANAGEMENT ============

      /**
       * Set the full itinerary for the current trip
       * @param {DayItinerary[]} itineraryData - Complete itinerary data
       */
      setItinerary: (itineraryData) => {
        set((state) => {
          state.itinerary = itineraryData;

          // Also update the current trip's itinerary
          if (state.currentTrip) {
            const tripIndex = state.trips.findIndex(
              (t) => t.id === state.currentTrip.id
            );
            if (tripIndex !== -1) {
              state.trips[tripIndex].itinerary = itineraryData;
              state.trips[tripIndex].updatedAt = getTimestamp();
              state.currentTrip.itinerary = itineraryData;
            }
          }
          state.error = null;
        });
      },

      /**
       * Add an activity to a specific day
       * @param {number} dayIndex - Day index (0-based)
       * @param {Omit<Activity, 'id'>} activity - Activity data without ID
       * @returns {string|null} The new activity's ID or null if failed
       */
      addActivityToDay: (dayIndex, activity) => {
        const itinerary = get().itinerary;

        if (dayIndex < 0 || dayIndex >= itinerary.length) {
          set((state) => {
            state.error = 'Invalid day index';
          });
          return null;
        }

        const activityId = generateId();

        set((state) => {
          const newActivity = { ...activity, id: activityId };
          state.itinerary[dayIndex].activities.push(newActivity);

          // Sync with current trip
          if (state.currentTrip) {
            const tripIndex = state.trips.findIndex(
              (t) => t.id === state.currentTrip.id
            );
            if (tripIndex !== -1) {
              if (!state.trips[tripIndex].itinerary) {
                state.trips[tripIndex].itinerary = state.itinerary;
              } else {
                state.trips[tripIndex].itinerary[dayIndex].activities.push(
                  newActivity
                );
              }
              state.trips[tripIndex].updatedAt = getTimestamp();
            }
          }
          state.error = null;
        });

        return activityId;
      },

      /**
       * Remove an activity from a specific day
       * @param {number} dayIndex - Day index (0-based)
       * @param {string} activityId - Activity ID to remove
       * @returns {boolean} Success status
       */
      removeActivity: (dayIndex, activityId) => {
        const itinerary = get().itinerary;

        if (dayIndex < 0 || dayIndex >= itinerary.length) {
          set((state) => {
            state.error = 'Invalid day index';
          });
          return false;
        }

        const activityExists = itinerary[dayIndex].activities.some(
          (a) => a.id === activityId
        );

        if (!activityExists) {
          set((state) => {
            state.error = 'Activity not found';
          });
          return false;
        }

        set((state) => {
          state.itinerary[dayIndex].activities = state.itinerary[
            dayIndex
          ].activities.filter((a) => a.id !== activityId);

          // Sync with current trip
          if (state.currentTrip) {
            const tripIndex = state.trips.findIndex(
              (t) => t.id === state.currentTrip.id
            );
            if (tripIndex !== -1 && state.trips[tripIndex].itinerary) {
              state.trips[tripIndex].itinerary[dayIndex].activities =
                state.itinerary[dayIndex].activities;
              state.trips[tripIndex].updatedAt = getTimestamp();
            }
          }
          state.error = null;
        });

        return true;
      },

      /**
       * Update an activity in a specific day
       * @param {number} dayIndex - Day index (0-based)
       * @param {string} activityId - Activity ID to update
       * @param {Partial<Activity>} updates - Fields to update
       * @returns {boolean} Success status
       */
      updateActivity: (dayIndex, activityId, updates) => {
        const itinerary = get().itinerary;

        if (dayIndex < 0 || dayIndex >= itinerary.length) {
          set((state) => {
            state.error = 'Invalid day index';
          });
          return false;
        }

        const activityIndex = itinerary[dayIndex].activities.findIndex(
          (a) => a.id === activityId
        );

        if (activityIndex === -1) {
          set((state) => {
            state.error = 'Activity not found';
          });
          return false;
        }

        set((state) => {
          state.itinerary[dayIndex].activities[activityIndex] = {
            ...state.itinerary[dayIndex].activities[activityIndex],
            ...updates,
          };

          // Sync with current trip
          if (state.currentTrip) {
            const tripIndex = state.trips.findIndex(
              (t) => t.id === state.currentTrip.id
            );
            if (tripIndex !== -1 && state.trips[tripIndex].itinerary) {
              state.trips[tripIndex].itinerary[dayIndex].activities[
                activityIndex
              ] = state.itinerary[dayIndex].activities[activityIndex];
              state.trips[tripIndex].updatedAt = getTimestamp();
            }
          }
          state.error = null;
        });

        return true;
      },

      /**
       * Reorder activities within a day
       * @param {number} dayIndex - Day index (0-based)
       * @param {string[]} newOrder - Array of activity IDs in new order
       * @returns {boolean} Success status
       */
      reorderActivities: (dayIndex, newOrder) => {
        const itinerary = get().itinerary;

        if (dayIndex < 0 || dayIndex >= itinerary.length) {
          set((state) => {
            state.error = 'Invalid day index';
          });
          return false;
        }

        const currentActivities = itinerary[dayIndex].activities;
        const activityMap = new Map(currentActivities.map((a) => [a.id, a]));

        // Validate all IDs exist
        const allIdsValid = newOrder.every((id) => activityMap.has(id));
        if (!allIdsValid || newOrder.length !== currentActivities.length) {
          set((state) => {
            state.error = 'Invalid activity order';
          });
          return false;
        }

        set((state) => {
          state.itinerary[dayIndex].activities = newOrder.map((id) =>
            activityMap.get(id)
          );

          // Sync with current trip
          if (state.currentTrip) {
            const tripIndex = state.trips.findIndex(
              (t) => t.id === state.currentTrip.id
            );
            if (tripIndex !== -1 && state.trips[tripIndex].itinerary) {
              state.trips[tripIndex].itinerary[dayIndex].activities =
                state.itinerary[dayIndex].activities;
              state.trips[tripIndex].updatedAt = getTimestamp();
            }
          }
          state.error = null;
        });

        return true;
      },

      // ============ RECOMMENDATIONS & FAVORITES ============

      /**
       * Add an attraction to favorites
       * @param {Attraction} attraction - Attraction to add
       * @returns {boolean} Success status (false if already exists)
       */
      addToFavorites: (attraction) => {
        const exists = get().favorites.some((f) => f.id === attraction.id);

        if (exists) {
          return false;
        }

        set((state) => {
          state.favorites.push({
            ...attraction,
            savedAt: getTimestamp(),
          });
          state.error = null;
        });

        return true;
      },

      /**
       * Remove an attraction from favorites
       * @param {string} attractionId - Attraction ID to remove
       * @returns {boolean} Success status
       */
      removeFromFavorites: (attractionId) => {
        const exists = get().favorites.some((f) => f.id === attractionId);

        if (!exists) {
          set((state) => {
            state.error = 'Favorite not found';
          });
          return false;
        }

        set((state) => {
          state.favorites = state.favorites.filter(
            (f) => f.id !== attractionId
          );
          state.error = null;
        });

        return true;
      },

      /**
       * Save an AI recommendation/suggestion
       * @param {Omit<Recommendation, 'id' | 'savedAt'>} suggestion - Suggestion to save
       * @returns {string} The saved recommendation's ID
       */
      saveRecommendation: (suggestion) => {
        const id = generateId();

        set((state) => {
          state.savedRecommendations.push({
            ...suggestion,
            id,
            savedAt: getTimestamp(),
          });
          state.error = null;
        });

        return id;
      },

      /**
       * Remove a saved recommendation
       * @param {string} recommendationId - Recommendation ID to remove
       * @returns {boolean} Success status
       */
      removeRecommendation: (recommendationId) => {
        const exists = get().savedRecommendations.some(
          (r) => r.id === recommendationId
        );

        if (!exists) {
          set((state) => {
            state.error = 'Recommendation not found';
          });
          return false;
        }

        set((state) => {
          state.savedRecommendations = state.savedRecommendations.filter(
            (r) => r.id !== recommendationId
          );
          state.error = null;
        });

        return true;
      },

      // ============ UI STATE ============

      /**
       * Set loading state
       * @param {boolean} isLoading - Loading state
       */
      setLoading: (isLoading) => {
        set((state) => {
          state.loading = isLoading;
        });
      },

      /**
       * Set error message
       * @param {string|Error|null} error - Error message or Error object
       */
      setError: (error) => {
        set((state) => {
          state.error = error instanceof Error ? error.message : error;
        });
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      /**
       * Reset store to initial state (useful for logout)
       */
      reset: () => {
        set((state) => {
          state.trips = [];
          state.currentTrip = null;
          state.itinerary = [];
          state.loading = false;
          state.error = null;
          state.favorites = [];
          state.savedRecommendations = [];
        });
      },
    })),
    {
      name: 'serendibtrip-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        trips: state.trips,
        currentTrip: state.currentTrip,
        itinerary: state.itinerary,
        favorites: state.favorites,
        savedRecommendations: state.savedRecommendations,
      }),
    }
  )
);

// ============ SELECTORS ============

/**
 * Get all trips sorted by creation date (newest first)
 * @param {TripState} state - Store state
 * @returns {Trip[]} Sorted trips
 */
export const selectTripsSortedByDate = (state) =>
  [...state.trips].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

/**
 * Get trips by status
 * @param {string} status - Trip status to filter by
 * @returns {function(TripState): Trip[]} Selector function
 */
export const selectTripsByStatus = (status) => (state) =>
  state.trips.filter((t) => t.status === status);

/**
 * Get total number of trips
 * @param {TripState} state - Store state
 * @returns {number} Trip count
 */
export const selectTripCount = (state) => state.trips.length;

/**
 * Check if an attraction is in favorites
 * @param {string} attractionId - Attraction ID to check
 * @returns {function(TripState): boolean} Selector function
 */
export const selectIsFavorite = (attractionId) => (state) =>
  state.favorites.some((f) => f.id === attractionId);

/**
 * Get activities for a specific day
 * @param {number} dayIndex - Day index (0-based)
 * @returns {function(TripState): Activity[]} Selector function
 */
export const selectActivitiesForDay = (dayIndex) => (state) =>
  state.itinerary[dayIndex]?.activities || [];

/**
 * Get total activities count across all days
 * @param {TripState} state - Store state
 * @returns {number} Total activities count
 */
export const selectTotalActivities = (state) =>
  state.itinerary.reduce((total, day) => total + day.activities.length, 0);

/**
 * Get upcoming trips (start date in future)
 * @param {TripState} state - Store state
 * @returns {Trip[]} Upcoming trips
 */
export const selectUpcomingTrips = (state) => {
  const today = new Date().toISOString().split('T')[0];
  return state.trips.filter((t) => t.startDate >= today);
};

/**
 * Get past trips (end date in past)
 * @param {TripState} state - Store state
 * @returns {Trip[]} Past trips
 */
export const selectPastTrips = (state) => {
  const today = new Date().toISOString().split('T')[0];
  return state.trips.filter((t) => t.endDate < today);
};

export default useTripStore;
