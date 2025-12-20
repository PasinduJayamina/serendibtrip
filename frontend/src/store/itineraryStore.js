import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  calculateBudgetAllocation,
  categorizeExpense,
} from '../services/budgetService';

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
        interests: [],
      },

      // Added recommendations (not yet assigned to days)
      savedItems: [],

      // AI-generated full itinerary
      generatedItinerary: null,

      // Last recommendations (to persist across navigation)
      lastRecommendations: null,
      lastRecommendationsParams: null,

      // Expense tracking
      expenses: {
        accommodation: { allocated: 0, spent: 0, items: [] },
        food: { allocated: 0, spent: 0, items: [] },
        transportation: { allocated: 0, spent: 0, items: [] },
        activities: { allocated: 0, spent: 0, items: [] },
        misc: { allocated: 0, spent: 0, items: [] },
      },

      // Budget allocation
      budgetAllocation: null,

      // ============ ACTIONS ============

      // Set trip details
      setTripDetails: (details) =>
        set((state) => {
          const newTripDetails = { ...state.tripDetails, ...details };

          // Recalculate budget allocation when trip details change
          let newBudgetAllocation = state.budgetAllocation;
          if (
            newTripDetails.budget > 0 &&
            newTripDetails.duration > 0 &&
            newTripDetails.groupSize > 0
          ) {
            newBudgetAllocation = calculateBudgetAllocation({
              totalBudget: newTripDetails.budget,
              duration: newTripDetails.duration,
              groupSize: newTripDetails.groupSize,
              destination: newTripDetails.destination,
              interests: newTripDetails.interests || [],
              savedItems: state.savedItems,
            });
          }

          return {
            tripDetails: newTripDetails,
            budgetAllocation: newBudgetAllocation,
          };
        }),

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

          // Categorize the expense
          const expenseCategory = categorizeExpense(item);
          const itemCost = item.cost || item.entryFee || 0;

          // Create the new saved item
          const newItem = {
            ...item,
            savedAt: new Date().toISOString(),
            id: `${item.name}-${Date.now()}`,
            expenseCategory,
            trackedCost: itemCost,
          };

          const newSavedItems = [...state.savedItems, newItem];

          // Update expense tracking
          const newExpenses = { ...state.expenses };
          if (newExpenses[expenseCategory]) {
            newExpenses[expenseCategory] = {
              ...newExpenses[expenseCategory],
              spent: newExpenses[expenseCategory].spent + itemCost,
              items: [...newExpenses[expenseCategory].items, newItem],
            };
          }

          // Recalculate budget allocation
          let newBudgetAllocation = state.budgetAllocation;
          if (state.tripDetails.budget > 0) {
            newBudgetAllocation = calculateBudgetAllocation({
              totalBudget: state.tripDetails.budget,
              duration: state.tripDetails.duration,
              groupSize: state.tripDetails.groupSize,
              destination: state.tripDetails.destination,
              interests: state.tripDetails.interests || [],
              savedItems: newSavedItems,
            });
          }

          return {
            savedItems: newSavedItems,
            expenses: newExpenses,
            budgetAllocation: newBudgetAllocation,
          };
        }),

      // Remove from saved items
      removeFromSaved: (itemName) =>
        set((state) => {
          const itemToRemove = state.savedItems.find(
            (i) => i.name === itemName
          );
          if (!itemToRemove) return state;

          const expenseCategory = itemToRemove.expenseCategory || 'misc';
          const itemCost = itemToRemove.trackedCost || 0;

          // Update expense tracking
          const newExpenses = { ...state.expenses };
          if (newExpenses[expenseCategory]) {
            newExpenses[expenseCategory] = {
              ...newExpenses[expenseCategory],
              spent: Math.max(0, newExpenses[expenseCategory].spent - itemCost),
              items: newExpenses[expenseCategory].items.filter(
                (i) => i.name !== itemName
              ),
            };
          }

          const newSavedItems = state.savedItems.filter(
            (i) => i.name !== itemName
          );

          // Recalculate budget allocation
          let newBudgetAllocation = state.budgetAllocation;
          if (state.tripDetails.budget > 0) {
            newBudgetAllocation = calculateBudgetAllocation({
              totalBudget: state.tripDetails.budget,
              duration: state.tripDetails.duration,
              groupSize: state.tripDetails.groupSize,
              destination: state.tripDetails.destination,
              interests: state.tripDetails.interests || [],
              savedItems: newSavedItems,
            });
          }

          return {
            savedItems: newSavedItems,
            expenses: newExpenses,
            budgetAllocation: newBudgetAllocation,
          };
        }),

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
            interests: [],
          },
          expenses: {
            accommodation: { allocated: 0, spent: 0, items: [] },
            food: { allocated: 0, spent: 0, items: [] },
            transportation: { allocated: 0, spent: 0, items: [] },
            activities: { allocated: 0, spent: 0, items: [] },
            misc: { allocated: 0, spent: 0, items: [] },
          },
          budgetAllocation: null,
        }),

      // Get expense summary
      getExpenseSummary: () => {
        const { expenses, tripDetails, budgetAllocation } = get();
        const totalSpent = Object.values(expenses).reduce(
          (sum, cat) => sum + cat.spent,
          0
        );

        return {
          totalBudget: tripDetails.budget,
          totalSpent,
          remaining: tripDetails.budget - totalSpent,
          percentageUsed:
            tripDetails.budget > 0
              ? Math.round((totalSpent / tripDetails.budget) * 100)
              : 0,
          byCategory: expenses,
          allocation: budgetAllocation,
        };
      },

      // Export itinerary as JSON
      exportItinerary: () => {
        const state = get();
        return {
          tripDetails: state.tripDetails,
          days: state.days,
          savedItems: state.savedItems,
          expenses: state.expenses,
          budgetAllocation: state.budgetAllocation,
          exportedAt: new Date().toISOString(),
        };
      },
    }),
    {
      name: 'serendibtrip-itinerary',
      version: 2,
    }
  )
);

export default useItineraryStore;
