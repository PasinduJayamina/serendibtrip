import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  calculateBudgetAllocation,
  categorizeExpense,
} from '../services/budgetService';
import { updateTripSavedItems } from '../services/userApi';

/**
 * Zustand store for managing user's custom itinerary
 * Persists to localStorage so data survives page refreshes
 */
export const useItineraryStore = create(
  persist(
    (set, get) => ({
      // Itinerary items organized by day
      days: [],

      // Trip details (current active trip)
      tripDetails: {
        tripId: null, // Unique identifier to link items to this trip
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

      // Add item to saved items (optionally assigned to a specific day)
      addToSaved: (item, dayNumber = null) =>
        set((state) => {
          // Check if already saved
          if (state.savedItems.some((i) => i.name === item.name)) {
            return state;
          }

          // Categorize the expense
          const expenseCategory = categorizeExpense(item);
          const itemCost = item.cost || item.entryFee || 0;

          // Auto-assign to next available day if not specified
          let assignedDay = dayNumber;
          if (!assignedDay && state.tripDetails.duration > 0) {
            // Distribute items across days - find day with least items
            const itemsPerDay = {};
            state.savedItems.forEach(i => {
              if (i.assignedDay) {
                itemsPerDay[i.assignedDay] = (itemsPerDay[i.assignedDay] || 0) + 1;
              }
            });
            
            // Find day with minimum items
            let minItems = Infinity;
            for (let d = 1; d <= state.tripDetails.duration; d++) {
              const count = itemsPerDay[d] || 0;
              if (count < minItems) {
                minItems = count;
                assignedDay = d;
              }
            }
          }

          // Create the new saved item - linked to current trip
          const newItem = {
            ...item,
            savedAt: new Date().toISOString(),
            id: `${item.name}-${Date.now()}`,
            expenseCategory,
            trackedCost: itemCost,
            assignedDay: assignedDay || 1, // Default to day 1 if no duration set
            tripId: state.tripDetails.tripId, // Link to current trip
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

      // Add item to saved and sync to backend (use this for persistence)
      addToSavedAndSync: async (item, dayNumber = null) => {
        get().addToSaved(item, dayNumber);
        // Debounce/delay sync slightly to allow for multiple rapid adds
        setTimeout(() => {
          get().syncSavedItemsToBackend();
        }, 500);
      },

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

      // Remove item and sync to backend (use this for persistence)
      removeFromSavedAndSync: async (itemName) => {
        get().removeFromSaved(itemName);
        setTimeout(() => {
          get().syncSavedItemsToBackend();
        }, 500);
      },

      // Change item's assigned day
      changeItemDay: (itemId, newDay) =>
        set((state) => ({
          savedItems: state.savedItems.map((item) =>
            item.id === itemId ? { ...item, assignedDay: newDay } : item
          ),
        })),

      // Get items for a specific trip
      getItemsForTrip: (tripId) => {
        return get().savedItems.filter((item) => item.tripId === tripId);
      },

      // Update item cost (for editing prices)
      updateItemCost: (itemId, newCost) =>
        set((state) => ({
          savedItems: state.savedItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  cost: newCost,
                  entryFee: newCost,
                  trackedCost: newCost,
                }
              : item
          ),
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

      // Sync saved items to backend (for each trip)
      // Call this after adding/removing items to persist to backend
      syncSavedItemsToBackend: async () => {
        const { savedItems, tripDetails } = get();
        
        // Skip if no items to sync
        if (!savedItems || savedItems.length === 0) {
          console.log('No items to sync');
          return;
        }
        
        // Check if user is authenticated
        const userStorage = localStorage.getItem('user-storage');
        const isAuthenticated = userStorage && JSON.parse(userStorage)?.state?.isAuthenticated;
        if (!isAuthenticated) {
          console.log('Not authenticated, skipping sync');
          return;
        }
        
        // Generate tripId from tripDetails if not available on items
        const fallbackTripId = tripDetails.tripId || 
          (tripDetails.destination && tripDetails.startDate 
            ? `${tripDetails.destination.toLowerCase().replace(/\s+/g, '-')}-${tripDetails.startDate}`
            : null);
        
        // Group items by tripId, using fallback for items without tripId
        const itemsByTrip = {};
        savedItems.forEach(item => {
          const tripId = item.tripId || fallbackTripId || 'default';
          if (!itemsByTrip[tripId]) {
            itemsByTrip[tripId] = [];
          }
          itemsByTrip[tripId].push(item);
        });
        
        console.log('Syncing items by trip:', Object.keys(itemsByTrip).map(k => `${k}: ${itemsByTrip[k].length} items`));
        
        // Sync each trip's items to backend
        const syncPromises = Object.entries(itemsByTrip).map(async ([tripId, items]) => {
          if (tripId && tripId !== 'default') {
            try {
              await updateTripSavedItems(tripId, items);
              console.log(`✅ Synced ${items.length} items for trip ${tripId}`);
            } catch (error) {
              console.error(`❌ Failed to sync items for trip ${tripId}:`, error.message);
            }
          } else {
            console.warn(`⚠️ Cannot sync ${items.length} items - no valid tripId`);
          }
        });
        
        await Promise.all(syncPromises);
      },

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

      // Mark an item as paid/unpaid
      markItemAsPaid: (itemId, isPaid, actualAmount = null) =>
        set((state) => {
          const newSavedItems = state.savedItems.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                isPaid,
                actualCost: actualAmount !== null ? actualAmount : item.trackedCost,
                paidAt: isPaid ? new Date().toISOString() : null,
              };
            }
            return item;
          });
          return { savedItems: newSavedItems };
        }),

      // Update actual cost for an item
      updateActualCost: (itemId, actualCost) =>
        set((state) => {
          const newSavedItems = state.savedItems.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                actualCost: actualCost,
              };
            }
            return item;
          });
          return { savedItems: newSavedItems };
        }),

      // Get budget alerts (warnings when approaching or exceeding budget)
      getBudgetAlerts: () => {
        const { expenses, tripDetails, budgetAllocation } = get();
        const alerts = [];
        
        if (!tripDetails.budget || tripDetails.budget <= 0) {
          return alerts;
        }

        // Overall budget check
        const totalSpent = Object.values(expenses).reduce(
          (sum, cat) => sum + cat.spent, 0
        );
        const overallPercentage = Math.round((totalSpent / tripDetails.budget) * 100);
        
        if (overallPercentage >= 100) {
          alerts.push({
            type: 'danger',
            category: 'overall',
            message: `Over budget by LKR ${(totalSpent - tripDetails.budget).toLocaleString()}!`,
            percentage: overallPercentage,
          });
        } else if (overallPercentage >= 80) {
          alerts.push({
            type: 'warning',
            category: 'overall',
            message: `Approaching budget limit (${overallPercentage}% used)`,
            percentage: overallPercentage,
          });
        }

        // Per-category checks
        if (budgetAllocation?.categories) {
          Object.entries(expenses).forEach(([key, catData]) => {
            const allocated = budgetAllocation.categories[key]?.total || 0;
            if (allocated > 0) {
              const catPercentage = Math.round((catData.spent / allocated) * 100);
              if (catPercentage >= 100) {
                alerts.push({
                  type: 'danger',
                  category: key,
                  message: `${budgetAllocation.categories[key].label} over budget by LKR ${(catData.spent - allocated).toLocaleString()}`,
                  percentage: catPercentage,
                });
              } else if (catPercentage >= 80) {
                alerts.push({
                  type: 'warning',
                  category: key,
                  message: `${budgetAllocation.categories[key].label} at ${catPercentage}%`,
                  percentage: catPercentage,
                });
              }
            }
          });
        }

        return alerts;
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
