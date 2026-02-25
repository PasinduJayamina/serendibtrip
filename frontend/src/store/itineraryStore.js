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
        accommodationType: 'midrange',
        transportMode: 'tuktuk',
      },

      // Metadata for all trips (persists dates, budget, etc. across navigation)
      tripsMetadata: {},

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

          // Persist trip metadata so dates/budget are available on itinerary page
          const newTripsMetadata = { ...state.tripsMetadata };
          if (newTripDetails.tripId) {
            newTripsMetadata[newTripDetails.tripId] = {
              destination: newTripDetails.destination,
              startDate: newTripDetails.startDate,
              endDate: newTripDetails.endDate,
              duration: newTripDetails.duration,
              budget: newTripDetails.budget,
              groupSize: newTripDetails.groupSize,
              accommodationType: newTripDetails.accommodationType,
              transportMode: newTripDetails.transportMode,
            };
          }

          return {
            tripDetails: newTripDetails,
            tripsMetadata: newTripsMetadata,
            budgetAllocation: newBudgetAllocation,
          };
        }),

      // Update metadata for a specific trip (for editing dates/budget from itinerary page)
      updateTripMeta: (tripId, updates) =>
        set((state) => {
          const newTripsMetadata = { ...state.tripsMetadata };
          newTripsMetadata[tripId] = {
            ...(newTripsMetadata[tripId] || {}),
            ...updates,
          };
          // If editing the currently active trip, also update tripDetails
          const newTripDetails = state.tripDetails?.tripId === tripId
            ? { ...state.tripDetails, ...updates }
            : state.tripDetails;
          return {
            tripsMetadata: newTripsMetadata,
            tripDetails: newTripDetails,
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
          // Check if already saved in the CURRENT trip (not other trips)
          const currentTripId = state.tripDetails?.tripId;
          if (state.savedItems.some((i) => i.name === item.name && (!currentTripId || i.tripId === currentTripId))) {
            return state;
          }

          // Categorize the expense
          const expenseCategory = categorizeExpense(item);
          const itemCost = item.cost || item.entryFee || 0;

          // Auto-assign to next available day if not specified
          let assignedDay = dayNumber;
          if (!assignedDay && state.tripDetails.duration > 0) {
            const duration = state.tripDetails.duration;
            const currentTripItems = state.savedItems.filter(
              i => i.tripId === currentTripId && i.assignedDay && !i.showOnAllDays
            );
            
            // Count items per day
            const itemsPerDay = {};
            for (let d = 1; d <= duration; d++) itemsPerDay[d] = [];
            currentTripItems.forEach(i => {
              if (itemsPerDay[i.assignedDay]) itemsPerDay[i.assignedDay].push(i);
            });
            
            // Try proximity-based assignment: find the day with closest items
            const itemCoords = item.coordinates || item.location?.coordinates;
            if (itemCoords && itemCoords.lat && itemCoords.lng) {
              const haversineDistance = (lat1, lng1, lat2, lng2) => {
                const R = 6371; // Earth radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              };
              
              // Calculate average distance to items on each day
              let bestDay = null;
              let bestAvgDist = Infinity;
              const maxItemsPerDay = Math.ceil(currentTripItems.length / duration) + 2; // Allow slight imbalance
              
              for (let d = 1; d <= duration; d++) {
                const dayItems = itemsPerDay[d];
                if (dayItems.length >= maxItemsPerDay) continue; // Skip overfull days
                
                if (dayItems.length === 0) continue; // No items yet, skip for now
                
                // Average distance to all items on this day
                let totalDist = 0;
                let coordCount = 0;
                dayItems.forEach(di => {
                  const diCoords = di.coordinates || di.location?.coordinates;
                  if (diCoords && diCoords.lat && diCoords.lng) {
                    totalDist += haversineDistance(itemCoords.lat, itemCoords.lng, diCoords.lat, diCoords.lng);
                    coordCount++;
                  }
                });
                
                if (coordCount > 0) {
                  const avgDist = totalDist / coordCount;
                  if (avgDist < bestAvgDist) {
                    bestAvgDist = avgDist;
                    bestDay = d;
                  }
                }
              }
              
              // Use proximity day if found and distance is reasonable (<5km avg)
              if (bestDay && bestAvgDist < 5) {
                assignedDay = bestDay;
              }
            }
            
            // Fallback: assign to day with minimum items (balanced distribution)
            if (!assignedDay) {
              let minItems = Infinity;
              assignedDay = 1;
              for (let d = 1; d <= duration; d++) {
                const count = (itemsPerDay[d] || []).length;
                if (count < minItems) {
                  minItems = count;
                  assignedDay = d;
                }
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

      // Clear all items for a specific trip (cascade delete)
      clearTripItems: (tripId) =>
        set((state) => ({
          savedItems: state.savedItems.filter((item) => item.tripId !== tripId),
        })),

      // Update item cost (for editing prices) - with validation
      updateItemCost: (itemId, newCost) => {
        // Sanitize cost: must be between 0 and 10 million LKR
        const MAX_PRICE = 10000000;
        let sanitizedCost = Math.max(0, Math.min(newCost || 0, MAX_PRICE));
        // Round to integer
        sanitizedCost = Math.round(sanitizedCost);
        
        set((state) => ({
          savedItems: state.savedItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  cost: sanitizedCost,
                  entryFee: sanitizedCost,
                  trackedCost: sanitizedCost,
                }
              : item
          ),
        }));
      },

      // Check if item is saved (scoped to current trip to avoid false positives across trips)
      isSaved: (itemName) => {
        const currentTripId = get().tripDetails?.tripId;
        if (currentTripId) {
          return get().savedItems.some((i) => i.name === itemName && i.tripId === currentTripId);
        }
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
        
        console.log('🔄 Sync triggered with', savedItems.length, 'items');
        
        // Skip if no items to sync
        if (!savedItems || savedItems.length === 0) {
          console.log('No items to sync');
          return;
        }
        
        // Check if user is authenticated
        const userStorage = localStorage.getItem('user-storage');
        const token = localStorage.getItem('token');
        console.log('🔐 Auth check - userStorage exists:', !!userStorage, '| token exists:', !!token);
        
        const isAuthenticated = userStorage && JSON.parse(userStorage)?.state?.isAuthenticated;
        if (!isAuthenticated) {
          console.log('❌ Not authenticated (isAuthenticated:', isAuthenticated, '), skipping sync');
          return;
        }
        
        if (!token) {
          console.log('❌ No token found, skipping sync');
          return;
        }
        
        console.log('✅ Auth check passed - proceeding with sync');
        
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
              // Use per-trip metadata (tripsMetadata) as primary source, fallback to current tripDetails
              const perTripMeta = get().tripsMetadata?.[tripId] || {};
              const tripMeta = {
                destination: perTripMeta.destination || tripDetails.destination,
                startDate: perTripMeta.startDate || tripDetails.startDate,
                endDate: perTripMeta.endDate || tripDetails.endDate,
                budget: perTripMeta.budget || tripDetails.budget,
                groupSize: perTripMeta.groupSize || tripDetails.groupSize || tripDetails.travelers,
                interests: tripDetails.interests,
                duration: perTripMeta.duration || tripDetails.duration,
                accommodationType: perTripMeta.accommodationType || tripDetails.accommodationType || 'midrange',
                transportMode: perTripMeta.transportMode || tripDetails.transportMode || 'tuktuk',
              };
              console.log(`📤 Syncing trip ${tripId} with meta:`, tripMeta);
              await updateTripSavedItems(tripId, items, tripMeta);
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

      // Mark a specific day as paid/unpaid for showOnAllDays items
      markDayAsPaid: (itemId, dayNum, isPaid) =>
        set((state) => {
          const newSavedItems = state.savedItems.map((item) => {
            if (item.id === itemId) {
              // Use paidDays array to track which days are paid
              const paidDays = item.paidDays || [];
              let newPaidDays;
              if (isPaid) {
                // Add day to paidDays if not already there
                newPaidDays = paidDays.includes(dayNum) ? paidDays : [...paidDays, dayNum];
              } else {
                // Remove day from paidDays
                newPaidDays = paidDays.filter(d => d !== dayNum);
              }
              return {
                ...item,
                paidDays: newPaidDays,
                // Also set isPaid to true if any days are paid
                isPaid: newPaidDays.length > 0,
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
      // Now calculates from savedItems which are persisted in localStorage
      getBudgetAlerts: () => {
        const { savedItems, tripDetails } = get();
        const alerts = [];
        
        // Use the first trip's budget if tripDetails.budget is not set
        const budget = tripDetails.budget || 0;
        
        if (!budget || budget <= 0) {
          return alerts;
        }

        // Normalize category helper - expanded to catch more types
        const normalizeCategory = (item) => {
          const cat = (item.category || item.type || 'misc').toLowerCase();
          const name = (item.name || '').toLowerCase();
          
          // 1. STRONGEST SIGNAL: If we explicitly assigned this as accommodation or transport (from our own app buttons), TRUST IT 100%
          if (cat === 'accommodation' || cat === 'hotel' || cat === 'guesthouse' || cat === 'hostel') return 'accommodation';
          if (cat === 'transport' || cat === 'taxi' || cat === 'tuktuk') return 'transport';
          
          // IMPORTANT: Check name-based overrides NEXT — the AI sometimes wrong-categorizes items
          // e.g., 'Pedro Tea Estate' gets category='food' but it's a sightseeing activity
          if (name.includes('tea estate') || name.includes('tea factory') || name.includes('tea plantation') ||
              name.includes('botanical garden') || name.includes('national park') ||
              name.includes('waterfall') || name.includes('museum') || name.includes('fort') ||
              name.includes('temple') || name.includes('lake') || name.includes('park') ||
              name.includes('viewpoint') || name.includes('world\'s end') || name.includes('plains') ||
              name.includes('safari') || name.includes('reserve') || name.includes('sanctuary')) {
            return 'activities';
          }
          
          // Name-based food detection (restaurants, bars, kitchens)
          if (name.includes('restaurant') || name.includes('bar/') || name.includes('kitchen') ||
              name.includes('cafe') || name.includes('bakery') || name.includes('dining')) {
            return 'food';
          }
          
          // Accommodation types - but NOT if it's a restaurant/bar within a hotel
          if (cat === 'accommodation' || cat === 'hotel' || cat === 'guesthouse' || 
              cat === 'hostel' || cat === 'resort' || cat === 'villa' || cat === 'homestay' ||
              cat === 'midrange' || cat === 'budget' || cat === 'luxury' ||
              name.includes('hotel') || name.includes('inn') || name.includes('resort') ||
              name.includes('hostel') || name.includes('guest')) {
            // But NOT if it's clearly a restaurant/bar within a hotel
            if (name.includes('bar') || name.includes('restaurant') || name.includes('kitchen') || name.includes('dining')) {
              return 'food';
            }
            return 'accommodation';
          }
          
          // Transport types
          if (cat === 'transport' || cat === 'transportation' || cat === 'taxi' ||
              cat === 'tuktuk' || cat === 'bus' || cat === 'train' ||
              name.includes('transport') || name.includes('taxi')) {
            return 'transport';
          }
          
          // Food types (after name-based checks)
          if (cat === 'food' || cat === 'restaurant' || cat === 'dining' || cat === 'cafe' ||
              cat === 'eatery') {
            return 'food';
          }
          
          // Activities - expanded list
          if (['activity', 'attraction', 'nature', 'beach', 'culture', 'heritage', 
               'wildlife', 'adventure', 'photography', 'shopping', 'nightlife', 
               'history', 'viewpoint', 'temple', 'museum', 'park', 'garden',
               'religious', 'landmark', 'market', 'tourist', 'safari', 'tour',
               'national park', 'unesco', 'fort', 'pagoda', 'lighthouse', 'monument',
               'gallery', 'zoo', 'aquarium', 'waterfall', 'lake', 'river',
               'diving', 'snorkeling', 'hiking', 'trekking', 'sightseeing'].includes(cat) ||
              name.includes('museum') || name.includes('fort') || name.includes('beach') ||
              name.includes('temple') || name.includes('pagoda') || name.includes('safari') ||
              name.includes('park') || name.includes('tour')) {
            return 'activities';
          }
          
          return 'misc';
        };

        // Calculate spent by category from savedItems
        const categorySpending = savedItems.reduce((acc, item) => {
          const cat = normalizeCategory(item);
          const cost = item.cost || item.entryFee || 0;
          if (!acc[cat]) acc[cat] = 0;
          acc[cat] += cost;
          return acc;
        }, {});

        // Use trip details to smartly calculate expected category allocations (matching AI logic)
        const duration = tripDetails.duration || 1;
        const groupSize = tripDetails.groupSize || 1;
        const accommodationType = tripDetails.accommodationType || 'midrange';
        const transportMode = tripDetails.transportMode || 'tuktuk';

        // Base averages (matching aiCostOptimizer)
        const accomAvgs = { budget: 10000, midrange: 35000, luxury: 150000 };
        const transportAvgs = { public: 1000, tuktuk: 3500, private: 12000, mix: 2500 };
        const effectiveAccomAvg = accomAvgs[accommodationType] || accomAvgs.midrange;
        const transportAvg = transportAvgs[transportMode] || transportAvgs.tuktuk;

        const maxAccomBudget = Math.round(budget * 0.45);
        const accomEstimate = Math.min(maxAccomBudget, effectiveAccomAvg * duration);
        const transportEstimate = transportAvg * duration;
        const miscEstimate = Math.round((budget / duration) * 0.05 * duration);

        const remainingAfterTransport = Math.max(0, budget - transportEstimate);
        const remainingAfterAccom = Math.max(0, remainingAfterTransport - accomEstimate);

        const foodEstimate = Math.round(remainingAfterAccom * 0.35);
        const activitiesEstimate = Math.round(remainingAfterAccom * 0.55);

        // Calculate dynamic percentages based on estimates
        const dynamicPercentages = {
          accommodation: { percent: budget > 0 ? accomEstimate / budget : 0.40, label: 'Accommodation' },
          food: { percent: budget > 0 ? foodEstimate / budget : 0.25, label: 'Food & Dining' },
          transport: { percent: budget > 0 ? transportEstimate / budget : 0.15, label: 'Transport' },
          activities: { percent: budget > 0 ? activitiesEstimate / budget : 0.15, label: 'Activities' },
          misc: { percent: budget > 0 ? miscEstimate / budget : 0.05, label: 'Miscellaneous' },
        };


        // Calculate total spent
        const totalSpent = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
        const overallPercentage = Math.round((totalSpent / budget) * 100);
        
        // Overall budget check
        if (overallPercentage >= 100) {
          alerts.push({
            type: 'danger',
            category: 'overall',
            message: `Over budget by LKR ${(totalSpent - budget).toLocaleString()}!`,
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

        // Per-category checks based on dynamic allocation
        Object.entries(dynamicPercentages).forEach(([key, config]) => {
          const allocated = Math.round(budget * config.percent);
          const spent = categorySpending[key] || 0;
          
          if (allocated > 0 && spent > 0) {
            const catPercentage = Math.round((spent / allocated) * 100);
            if (catPercentage >= 100) {
              alerts.push({
                type: 'danger',
                category: key,
                message: `${config.label} over budget by LKR ${(spent - allocated).toLocaleString()}`,
                percentage: catPercentage,
              });
            } else if (catPercentage >= 80) {
              alerts.push({
                type: 'warning',
                category: key,
                message: `${config.label} at ${catPercentage}% of allocated budget`,
                percentage: catPercentage,
              });
            }
          }
        });

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
