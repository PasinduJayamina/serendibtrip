import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand store for managing user's custom itinerary
 * Persists to localStorage so data survives page refreshes
 */
export const useItineraryStore = create(
  persist(
    (set, get) => ({
      // Itinerary items organized by day
      days: [],

      // Trip details
      tripDetails: {
        destination: '',
        startDate: '',
        endDate: '',
        duration: 0,
        budget: 0,
        groupSize: 1,
      },

      // Added recommendations (not yet assigned to days)
      savedItems: [],

      // AI-generated full itinerary
      generatedItinerary: null,

      // Last recommendations (to persist across navigation)
      lastRecommendations: null,
      lastRecommendationsParams: null,

      // ============ ACTIONS ============

      // Set trip details
      setTripDetails: (details) =>
        set((state) => ({
          tripDetails: { ...state.tripDetails, ...details },
        })),

      // Initialize days based on duration
      initializeDays: (duration, startDate) => {
        const days = [];
        const start = new Date(startDate);

        for (let i = 0; i < duration; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          days.push({
            day: i + 1,
            date: date.toISOString().split('T')[0],
            activities: [],
          });
        }

        set({ days });
      },

      // Add item to saved items (not yet in itinerary)
      addToSaved: (item) =>
        set((state) => {
          // Check if already saved
          if (state.savedItems.some((i) => i.name === item.name)) {
            return state;
          }
          return {
            savedItems: [
              ...state.savedItems,
              {
                ...item,
                savedAt: new Date().toISOString(),
                id: `${item.name}-${Date.now()}`,
              },
            ],
          };
        }),

      // Remove from saved items
      removeFromSaved: (itemName) =>
        set((state) => ({
          savedItems: state.savedItems.filter((i) => i.name !== itemName),
        })),

      // Check if item is saved
      isSaved: (itemName) => {
        return get().savedItems.some((i) => i.name === itemName);
      },

      // Add activity to a specific day
      addActivityToDay: (dayIndex, activity) =>
        set((state) => {
          const newDays = [...state.days];
          if (newDays[dayIndex]) {
            newDays[dayIndex].activities.push({
              ...activity,
              id: `${activity.name}-${Date.now()}`,
              addedAt: new Date().toISOString(),
            });
          }
          return { days: newDays };
        }),

      // Remove activity from a day
      removeActivityFromDay: (dayIndex, activityId) =>
        set((state) => {
          const newDays = [...state.days];
          if (newDays[dayIndex]) {
            newDays[dayIndex].activities = newDays[dayIndex].activities.filter(
              (a) => a.id !== activityId
            );
          }
          return { days: newDays };
        }),

      // Move activity between days
      moveActivity: (fromDay, toDay, activityId) =>
        set((state) => {
          const newDays = [...state.days];
          const activity = newDays[fromDay]?.activities.find(
            (a) => a.id === activityId
          );

          if (activity) {
            newDays[fromDay].activities = newDays[fromDay].activities.filter(
              (a) => a.id !== activityId
            );
            newDays[toDay].activities.push(activity);
          }

          return { days: newDays };
        }),

      // Reorder activities within a day
      reorderActivities: (dayIndex, activities) =>
        set((state) => {
          const newDays = [...state.days];
          if (newDays[dayIndex]) {
            newDays[dayIndex].activities = activities;
          }
          return { days: newDays };
        }),

      // Set generated itinerary from AI
      setGeneratedItinerary: (itinerary) =>
        set({ generatedItinerary: itinerary }),

      // Save last recommendations for persistence
      setLastRecommendations: (recommendations, params) =>
        set({
          lastRecommendations: recommendations,
          lastRecommendationsParams: params,
        }),

      // Clear last recommendations
      clearLastRecommendations: () =>
        set({
          lastRecommendations: null,
          lastRecommendationsParams: null,
        }),

      // Get total saved items count
      getSavedCount: () => get().savedItems.length,

      // Get total activities across all days
      getTotalActivities: () => {
        return get().days.reduce((sum, day) => sum + day.activities.length, 0);
      },

      // Calculate estimated budget
      getEstimatedBudget: () => {
        const { days, savedItems } = get();
        let total = 0;

        // From day activities
        days.forEach((day) => {
          day.activities.forEach((activity) => {
            total += activity.cost || activity.entryFee || 0;
          });
        });

        // From saved items
        savedItems.forEach((item) => {
          total += item.cost || item.entryFee || 0;
        });

        return total;
      },

      // Clear everything
      clearItinerary: () =>
        set({
          days: [],
          savedItems: [],
          generatedItinerary: null,
          tripDetails: {
            destination: '',
            startDate: '',
            endDate: '',
            duration: 0,
            budget: 0,
            groupSize: 1,
          },
        }),

      // Export itinerary as JSON
      exportItinerary: () => {
        const state = get();
        return {
          tripDetails: state.tripDetails,
          days: state.days,
          savedItems: state.savedItems,
          exportedAt: new Date().toISOString(),
        };
      },
    }),
    {
      name: 'serendibtrip-itinerary',
      version: 1,
    }
  )
);

export default useItineraryStore;
