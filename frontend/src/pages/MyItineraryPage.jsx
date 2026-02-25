import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  BanknotesIcon,
  CloudIcon,
  ShoppingBagIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { useUserStore } from '../store/userStore';
import { formatCurrency, CategoryBadge } from '../utils/categoryIcons';
import { getAllCategories } from '../services/budgetService';
import WeatherWidget from '../components/WeatherWidget';
import PackingListGenerator from '../components/PackingListGenerator';

const MyItineraryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [showPackingList, setShowPackingList] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingPrice, setEditingPrice] = useState('');
  // Misc expense modal state
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [miscExpense, setMiscExpense] = useState({ name: '', cost: '', category: 'misc', tripId: '' });
  // Trip editing state
  const [editingTripId, setEditingTripId] = useState(null);
  const [editTripData, setEditTripData] = useState({ startDate: '', endDate: '', budget: 0 });

  const {
    savedItems,
    tripDetails,
    tripsMetadata,
    removeFromSavedAndSync,
    addToSavedAndSync,
    clearItinerary,
    getEstimatedBudget,
    getExpenseSummary,
    getBudgetAlerts,
    markItemAsPaid,
    markDayAsPaid,
    updateItemCost,
    updateTripMeta,
    budgetAllocation,
  } = useItineraryStore();

  // Get user's saved trips
  const { trips, fetchTrips, isAuthenticated } = useUserStore();

  // Fetch trips on mount to ensure budget data is available for progress bar
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrips();
    }
  }, [isAuthenticated, fetchTrips]);

  // Get stored recommendations params for navigation
  const { params: storedParams, hasStoredRecommendations } =
    useRecommendationsStore();

  const estimatedBudget = getEstimatedBudget();
  const expenseSummary = getExpenseSummary();
  const budgetAlerts = getBudgetAlerts();
  const categories = getAllCategories();

  // Group saved items by tripId, then by day
  const itemsByTrip = savedItems.reduce((acc, item) => {
    const tripId = item.tripId || 'default';
    
    if (!acc[tripId]) {
      acc[tripId] = { items: [], byDay: {}, allDayItems: [] };
    }
    acc[tripId].items.push(item);
    
    // Items with showOnAllDays should be stored separately for later distribution
    if (item.showOnAllDays) {
      // Avoid duplicate all-day items (same name)
      if (!acc[tripId].allDayItems.some(existing => existing.name === item.name)) {
        acc[tripId].allDayItems.push(item);
      }
    } else {
      const day = item.assignedDay || 1;
      if (!acc[tripId].byDay[day]) {
        acc[tripId].byDay[day] = [];
      }
      acc[tripId].byDay[day].push(item);
    }
    return acc;
  }, {});

  // Helper function to extract destination from tripId
  // Handles multi-word destinations like "nuwara-eliya-2024-02-14" -> "Nuwara Eliya"
  const extractDestinationFromTripId = (tripId) => {
    if (!tripId) return 'Trip';
    // Split tripId and find where the date part starts (format: YYYY-MM-DD)
    const parts = tripId.split('-');
    // Find the index where date starts (4-digit year)
    const dateStartIndex = parts.findIndex(part => /^\d{4}$/.test(part));
    if (dateStartIndex > 0) {
      // Join all parts before the date, capitalize each word
      const destinationParts = parts.slice(0, dateStartIndex);
      return destinationParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    // Fallback: capitalize first part
    return parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || 'Trip';
  };

  // Get trip info from user's saved trips
  const getTrip = (tripId) => {
    if (!trips || trips.length === 0) return null;
    
    // Extract destination from tripId (handles multi-word destinations)
    const tripDestination = extractDestinationFromTripId(tripId).toLowerCase();
    
    // 1. Try exact tripId match first (most reliable)
    const exactMatch = trips.find(t => t.tripId === tripId);
    if (exactMatch) return exactMatch;
    
    // 2. Try constructed ID pattern match (destination-startDate)
    const constructedMatch = trips.find(t => {
      const constructedId = `${t.destination}-${t.startDate}`.toLowerCase().replace(/\s+/g, '-');
      return constructedId === tripId;
    });
    if (constructedMatch) return constructedMatch;
    
    // 3. Only match by destination name if there's exactly ONE trip to that destination
    // This avoids the bug where two Colombo trips both get the same backend trip
    const destinationMatches = trips.filter(t => t.destination?.toLowerCase() === tripDestination);
    if (destinationMatches.length === 1) return destinationMatches[0];
    
    // 4. If multiple trips to same destination, try matching by date extracted from tripId
    if (destinationMatches.length > 1) {
      // Extract date from tripId format: "colombo-2026-02-25" -> "2026-02-25"
      const parts = tripId.split('-');
      const dateStartIndex = parts.findIndex(part => /^\d{4}$/.test(part));
      if (dateStartIndex > 0 && parts.length >= dateStartIndex + 3) {
        const dateFromId = parts.slice(dateStartIndex, dateStartIndex + 3).join('-');
        const dateMatch = destinationMatches.find(t => t.startDate === dateFromId);
        if (dateMatch) return dateMatch;
      }
    }
    
    return null;
  };

  // Calculate expense summary for a specific trip
  const getTripExpenseSummary = (tripId, tripItems, trip) => {
    // Sanitize cost: clamp to max 10 million LKR (fixes corrupted data)
    const MAX_PRICE = 10000000;
    const sanitizeCost = (cost) => Math.max(0, Math.min(cost || 0, MAX_PRICE));
    
    // Get trip metadata from our local store (for when backend trip is not yet synced)
    const meta = tripsMetadata?.[tripId];
    
    // Get trip duration for showOnAllDays items
    // Try multiple sources: trip.duration, tripsMetadata, calculate from dates, or max assigned day
    let tripDuration = trip?.duration || meta?.duration;
    if (!tripDuration && (trip?.startDate || meta?.startDate) && (trip?.endDate || meta?.endDate)) {
      const start = new Date(trip?.startDate || meta?.startDate);
      const end = new Date(trip?.endDate || meta?.endDate);
      tripDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    if (!tripDuration) {
      // Use max assigned day from items as fallback
      tripDuration = Math.max(...tripItems.map(i => i.assignedDay || 1), 1);
    }

    // IMPORTANT: Deduplicate items by id/name to avoid counting showOnAllDays items multiple times
    // (they appear once per day in the display but should only be counted once in expenses)
    const uniqueItems = tripItems.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id || t.name === item.name)
    );
    
    // Calculate cost for an item (estimated total)
    const getItemCost = (item) => {
      const baseCost = sanitizeCost(item.cost || item.entryFee || item.trackedCost);
      // If item shows on all days, multiply by duration
      if (item.showOnAllDays) {
        return baseCost * tripDuration;
      }
      return baseCost;
    };
    
    // Calculate PAID cost for an item (only count paid days for showOnAllDays items)
    const getPaidCost = (item) => {
      const baseCost = sanitizeCost(item.cost || item.entryFee || item.trackedCost);
      if (item.showOnAllDays) {
        // For showOnAllDays items, count cost based on number of paid days
        const paidDaysCount = item.paidDays?.length || 0;
        return baseCost * paidDaysCount;
      }
      // For regular items, return full cost if paid
      return item.isPaid ? baseCost : 0;
    };
    
    // Filter paid items first (from unique items)
    // For showOnAllDays items, isPaid is true if any day is paid
    const paidItems = uniqueItems.filter(i => i.isPaid || (i.paidDays?.length > 0));
    
    // Total spent = sum of PAID costs (uses paidDays for showOnAllDays items)
    const totalSpent = uniqueItems.reduce((sum, item) => sum + getPaidCost(item), 0);
    // Total estimated = all unique items (for budget comparison)
    const totalEstimated = uniqueItems.reduce((sum, item) => sum + getItemCost(item), 0);
    const budget = trip?.budget || meta?.budget || 0;
    
    // Category breakdown - normalize category names
    const normalizeCategory = (item) => {
      // Priority: category > type > expenseCategory > 'misc'
      // (transport items have correct category but sometimes wrong expenseCategory)
      const cat = (item.category || item.type || item.expenseCategory || 'misc').toLowerCase();
      const name = (item.name || '').toLowerCase();
      
      // 1. STRONGEST SIGNAL: If we explicitly assigned this as accommodation or transport (from our own app buttons), TRUST IT 100%
      if (cat === 'accommodation' || cat === 'hotel' || cat === 'guesthouse' || cat === 'hostel') return 'accommodation';
      if (cat === 'transport' || cat === 'taxi' || cat === 'tuktuk') return 'transport';
      
      // IMPORTANT: Check name-based overrides NEXT — the AI sometimes wrong-categorizes items
      // e.g., 'Pedro Tea Estate' gets category='food' but it's a sightseeing activity
      // These are ALWAYS activities regardless of AI-assigned category:
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
      
      // Name-based accommodation detection
      if (name.includes('hotel') || name.includes('inn') || name.includes('resort') ||
          name.includes('hostel') || name.includes('guest') || name.includes('lodge') ||
          name.includes('villa')) {
        // But NOT if it's clearly a restaurant/bar within a hotel (e.g., 'Grand Hotel - Barnesbury Bar')
        if (name.includes('bar') || name.includes('restaurant') || name.includes('kitchen') || name.includes('dining')) {
          return 'food';
        }
        return 'accommodation';
      }
      
      // Standard category normalization
      if (cat === 'accommodation' || cat === 'hotel') return 'accommodation';
      if (cat === 'transport' || cat === 'transportation') return 'transport';
      if (cat === 'food' || cat === 'restaurant' || cat === 'dining') return 'food';
      if (cat === 'misc') return 'misc';
      // Everything else (attractions, sightseeing, culture, nature, etc.) is an activity
      return 'activities';
    };
    
    // Category breakdown using unique items - uses PAID costs (not estimated)
    const byCategory = uniqueItems.reduce((acc, item) => {
      const cat = normalizeCategory(item);
      const itemCost = getPaidCost(item); // Use paid cost, not estimated

      if (!acc[cat]) acc[cat] = { spent: 0, items: [] };
      acc[cat].spent += itemCost;
      acc[cat].items.push(item);
      return acc;
    }, {});

    return { totalSpent, totalEstimated, paidItems: paidItems.length, budget, remaining: budget - totalEstimated, percentageUsed: budget > 0 ? Math.round((totalEstimated / budget) * 100) : 0, byCategory, tripDuration };
  };

  // Handle item day change
  const { changeItemDay } = useItineraryStore();

  // Handle price editing
  const startEditingPrice = (item) => {
    setEditingItemId(item.id);
    setEditingPrice((item.cost || item.entryFee || item.trackedCost || 0).toString());
  };

  const savePrice = (itemId) => {
    let newPrice = parseInt(editingPrice) || 0;
    // Validate price: must be between 0 and 10 million LKR
    const MAX_PRICE = 10000000; // 10 million LKR max
    if (newPrice < 0) newPrice = 0;
    if (newPrice > MAX_PRICE) {
      newPrice = MAX_PRICE;
      alert(`Maximum price is LKR ${MAX_PRICE.toLocaleString()}`);
    }
    updateItemCost(itemId, newPrice);
    setEditingItemId(null);
    setEditingPrice('');
  };

  const cancelEditingPrice = () => {
    setEditingItemId(null);
    setEditingPrice('');
  };

  // Handle clear all
  const handleClearAll = () => {
    clearItinerary();
    setShowClearConfirm(false);
  };

  // Render rating
  const renderRating = (rating) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);

    return (
      <div className="flex items-center gap-0.5" title="AI Estimated Rating">
        {[...Array(5)].map((_, i) => (
          <span key={i}>
            {i < fullStars ? (
              <StarSolidIcon className="w-3 h-3 text-yellow-400" />
            ) : (
              <StarIcon className="w-3 h-3 text-gray-300" />
            )}
          </span>
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Empty state
  if (savedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">{t('itinerary.title')}</h1>
            <p className="text-secondary-200">
              {t('itinerary.buildTrip')}
            </p>
          </div>
        </div>

        {/* Empty state */}
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDaysIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('itinerary.empty')}
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {t('itinerary.emptyDescription')}
            </p>
            <Link
              to="/recommendations"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary-600 to-accent-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <SparklesIcon className="w-5 h-5" />
              {t('itinerary.browseRecommendations')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8" />
              <h3 className="text-lg font-bold">{t('itinerary.clearAllConfirm')}</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t('itinerary.clearAllWarning', { count: savedItems.length })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('itinerary.clearAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Misc Expense Modal */}
      {showMiscModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-primary-600 mb-4">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-bold">Add Expense</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                <input
                  type="text"
                  value={miscExpense.name}
                  onChange={(e) => setMiscExpense(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Souvenirs, Tips, SIM Card"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  value={miscExpense.cost}
                  onChange={(e) => setMiscExpense(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="e.g., 2500"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={miscExpense.category}
                  onChange={(e) => setMiscExpense(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="misc">💰 Misc</option>
                  <option value="activities">🎫 Activities</option>
                  <option value="food">🍽️ Food & Dining</option>
                  <option value="transport">🚗 Transport</option>
                  <option value="accommodation">🏨 Accommodation</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMiscModal(false);
                  setMiscExpense({ name: '', cost: '', category: 'misc', tripId: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (miscExpense.name && miscExpense.cost && miscExpense.tripId) {
                    addToSavedAndSync({
                      name: miscExpense.name,
                      cost: parseFloat(miscExpense.cost),
                      entryFee: parseFloat(miscExpense.cost),
                      category: miscExpense.category,
                      type: miscExpense.category,
                      tripId: miscExpense.tripId,
                      location: 'Custom expense',
                      description: `Manual expense: ${miscExpense.name}`,
                      assignedDay: 1,
                    });
                    setShowMiscModal(false);
                    setMiscExpense({ name: '', cost: '', category: 'misc', tripId: '' });
                  }
                }}
                disabled={!miscExpense.name || !miscExpense.cost}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('itinerary.title')}</h1>
            <p className="text-secondary-200">
              {t('itinerary.itemsSaved', { count: savedItems.length })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        {(() => {
          // Only sum budgets for trips that have items currently displayed
          const tripIdsWithItems = Object.keys(itemsByTrip);
          const totalBudget = tripIdsWithItems.reduce((sum, tid) => {
            const backendTrip = trips?.find(t => t.tripId === tid);
            const budget = backendTrip?.budget || tripsMetadata?.[tid]?.budget || 0;
            return sum + budget;
          }, 0);
          // Total estimated = all items (for budget comparison)
          const totalEstimated = savedItems.reduce((sum, item) => sum + (item.cost || item.entryFee || item.trackedCost || 0), 0);
          // Total SPENT = sum of PAID costs (respects paidDays for showOnAllDays items)
          const totalSpent = savedItems.reduce((sum, item) => {
            const baseCost = item.cost || item.entryFee || item.trackedCost || 0;
            if (item.showOnAllDays) {
              // For showOnAllDays items, multiply by number of paid days
              const paidDaysCount = item.paidDays?.length || 0;
              return sum + (baseCost * paidDaysCount);
            }
            // For regular items, add cost only if paid
            return sum + (item.isPaid ? baseCost : 0);
          }, 0);
          // Count paid items: isPaid OR has any paidDays
          const paidItemsList = savedItems.filter(i => i.isPaid || (i.paidDays?.length > 0));
          // Budget used percentage should be based on total spent (paid items), not estimated
          const budgetUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
          const paidItems = paidItemsList.length;
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">✈️</span>
                  <span className="text-sm text-gray-500">Trips</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {Object.keys(itemsByTrip).length}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📍</span>
                  <span className="text-sm text-gray-500">{t('itinerary.totalItems')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {savedItems.length}
                  <span className="text-sm font-normal text-gray-400 ml-1">({paidItems} paid)</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">💰</span>
                  <span className="text-sm text-gray-500">Total Budget</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalBudget)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">💳</span>
                  <span className="text-sm text-gray-500">Total Spent</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalSpent)}
                </div>
                {totalBudget > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {budgetUsed}% of budget
                  </div>
                )}
              </div>
            </div>
          );
        })()}




        {/* Trip-by-Trip Itinerary View */}
        {Object.keys(itemsByTrip).length > 0 && (
          <div className="space-y-8 mb-8">
            {Object.entries(itemsByTrip).map(([tripId, tripData]) => {
              const trip = getTrip(tripId);
              const tripItems = tripData.items;
              const tripExpense = getTripExpenseSummary(tripId, tripItems, trip);
              const meta = tripsMetadata?.[tripId];
              const tripDuration = trip?.duration || meta?.duration || Math.max(...tripItems.map(i => i.assignedDay || 1), 1);
              const daysForTrip = Array.from({ length: tripDuration }, (_, i) => i + 1);
              // Use trip.budget > tripsMetadata.budget > tripDetails.budget > 0
              const tripBudget = trip?.budget || meta?.budget || tripDetails?.budget || 0;
              const tripDestination = trip?.destination || meta?.destination || extractDestinationFromTripId(tripId);
              
              // Smart fallback: infer transportMode from saved transport item if not stored
              const inferTransportMode = () => {
                if (trip?.transportMode) return trip.transportMode;
                const transportItem = tripItems.find(i => i.name?.toLowerCase().includes('transport'));
                if (transportItem?.name) {
                  if (transportItem.name.toLowerCase().includes('private')) return 'private';
                  if (transportItem.name.toLowerCase().includes('car')) return 'private';
                  if (transportItem.name.toLowerCase().includes('public')) return 'public';
                  if (transportItem.name.toLowerCase().includes('bus') || transportItem.name.toLowerCase().includes('train')) return 'public';
                }
                return 'tuktuk'; // Default
              };
              
              // Smart fallback: infer accommodationType from saved accommodation item if not stored
              const inferAccommodationType = () => {
                if (trip?.accommodationType) return trip.accommodationType;
                const accomItem = tripItems.find(i => {
                  const name = i.name?.toLowerCase() || '';
                  return (
                    i.category === 'accommodation' || 
                    name.includes('hotel') ||
                    name.includes('resort') ||
                    name.includes('villa') ||
                    name.includes('guesthouse') ||
                    name.includes('hostel') ||
                    name.includes('rest') ||  // CityRest, RestHouse, etc.
                    name.includes('inn') ||
                    name.includes('lodge') ||
                    name.includes('homestay') ||
                    name.includes('bnb') ||
                    name.includes('b&b') ||
                    name.includes('suites')
                  );
                });
                if (accomItem?.cost || accomItem?.pricePerNight) {
                  const cost = accomItem.cost || accomItem.pricePerNight || 0;
                  if (cost >= 35000) return 'luxury';
                  if (cost >= 10000) return 'midrange';
                  return 'budget';
                }
                return 'midrange'; // Default
              };
              
              return (
                <div key={tripId} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  {/* Trip Header */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5" />
                        {tripDestination}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/recommendations"
                          state={{
                            tripData: {
                              tripId,
                              destination: tripDestination,
                              duration: trip?.duration || tripDuration,
                              tripDuration: trip?.duration || tripDuration,
                              groupSize: trip?.groupSize || trip?.travelers || 2,
                              travelers: trip?.travelers || trip?.groupSize || 2,
                              budget: tripBudget,
                              startDate: trip?.startDate || new Date().toISOString().split('T')[0],
                              endDate: trip?.endDate || new Date(Date.now() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                              interests: trip?.interests || [],
                              accommodationType: inferAccommodationType(),
                              transportMode: inferTransportMode(),
                            },
                            useCache: true,
                            isAddMoreMode: true,
                          }}
                          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md"
                        >
                          <PlusIcon className="w-3 h-3" />
                          Add More
                        </Link>
                      </div>
                    </div>
                    
                    <p className="text-xs opacity-80">
                      {(() => {
                        const meta = tripsMetadata?.[tripId];
                        const tripStartDate = trip?.startDate || meta?.startDate || (tripDetails?.tripId === tripId ? tripDetails?.startDate : null);
                        const tripEndDate = trip?.endDate || meta?.endDate || (tripDetails?.tripId === tripId ? tripDetails?.endDate : null);
                        if (tripStartDate && tripEndDate) {
                          return (
                            <>
                              {new Date(tripStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(tripEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {tripDuration} days • {tripItems.length} items
                              {tripBudget > 0 && <> • Budget: {formatCurrency(tripBudget)}</>}
                            </>
                          );
                        }
                        return <>{tripDuration} days • {tripItems.length} items{tripBudget > 0 && <> • Budget: {formatCurrency(tripBudget)}</>}</>;
                      })()}
                    </p>
                  </div>
                  
                  {/* Budget & Expense Tracking - Full View */}
                  <div className="bg-white px-4 py-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        📊 Budget & Expense Tracking
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">✓ {tripExpense.paidItems} paid</span>
                        <span className="text-gray-400">○ {tripItems.length - tripExpense.paidItems} unpaid</span>
                      </div>
                    </div>
                    
                    {/* Budget Progress Bar */}
                    {tripBudget > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Budget Used</span>
                          <span className="text-gray-700">{formatCurrency(tripExpense.totalEstimated)} / {formatCurrency(tripBudget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${tripExpense.percentageUsed > 90 ? 'bg-red-500' : tripExpense.percentageUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(tripExpense.percentageUsed, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{tripExpense.percentageUsed}% used</span>
                          <span className={tripExpense.remaining < 0 ? 'text-red-600 font-semibold' : ''}>
                            {tripExpense.remaining < 0 ? `−${formatCurrency(Math.abs(tripExpense.remaining))} over` : `${formatCurrency(tripExpense.remaining)} remaining`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Per-trip budget alerts */}
                    {(() => {
                      const tripAlerts = budgetAlerts.filter(a =>
                        a.tripId === tripId ||
                        (!a.tripId && Object.keys(itemsByTrip).length === 1)
                      );
                      // Build alerts from tripExpense directly (more precise)
                      const alerts = [];
                      if (tripBudget > 0) {
                        const over = tripExpense.totalEstimated - tripBudget;
                        const pct = tripExpense.percentageUsed;
                        if (over > 0) {
                          alerts.push({ type: 'danger', icon: '🔴', msg: `Over budget by ${formatCurrency(over)}` });
                        } else if (pct >= 90) {
                          alerts.push({ type: 'warning', icon: '🟡', msg: `${pct}% of budget used — almost full` });
                        }
                        // Smartly calculate category budgets dynamically
                        const duration = tripDuration || 1;
                        const accommodationType = trip?.accommodationType || meta?.accommodationType || inferAccommodationType();
                        const transportMode = trip?.transportMode || meta?.transportMode || inferTransportMode();

                        const accomAvgs = { budget: 10000, midrange: 35000, luxury: 150000 };
                        const transportAvgs = { public: 1000, tuktuk: 3500, private: 12000, mix: 2500 };
                        const effectiveAccomAvg = accomAvgs[accommodationType] || accomAvgs.midrange;
                        const transportAvg = transportAvgs[transportMode] || transportAvgs.tuktuk;

                        const maxAccomBudget = Math.round(tripBudget * 0.45);
                        const accomEstimate = Math.min(maxAccomBudget, effectiveAccomAvg * duration);
                        const transportEstimate = transportAvg * duration;
                        const miscEstimate = Math.round((tripBudget / duration) * 0.05 * duration);

                        const remainingAfterTransport = Math.max(0, tripBudget - transportEstimate);
                        const remainingAfterAccom = Math.max(0, remainingAfterTransport - accomEstimate);

                        const foodEstimate = Math.round(remainingAfterAccom * 0.35);
                        const activitiesEstimate = Math.round(remainingAfterAccom * 0.55);

                        // Category-level alerts
                        const catBudgets = {
                          accommodation: accomEstimate,
                          food: foodEstimate,
                          transport: transportEstimate,
                          activities: activitiesEstimate,
                          misc: miscEstimate,
                        };
                        Object.entries(catBudgets).forEach(([cat, catBudget]) => {
                          const spent = tripExpense.byCategory[cat]?.spent || 0;
                          if (spent > catBudget && spent > 0) {
                            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
                            alerts.push({ type: 'danger', icon: '🔴', msg: `${label} over budget by ${formatCurrency(spent - catBudget)}` });
                          } else if (spent > 0 && spent / catBudget >= 0.90) {
                            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
                            alerts.push({ type: 'warning', icon: '🟡', msg: `${label} at ${Math.round((spent / catBudget) * 100)}% of allocated budget` });
                          }
                        });
                      }
                      if (alerts.length === 0) return null;
                      return (
                        <div className="mt-3 space-y-1.5">
                          {alerts.map((a, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                                a.type === 'danger'
                                  ? 'bg-red-50 border border-red-200 text-red-700'
                                  : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                              }`}
                            >
                              <span>{a.icon}</span>
                              <span>{a.msg}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    
                    {/* Category Breakdown */}
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { key: 'accommodation', icon: '🏨', label: 'Accommodation' },
                        { key: 'food', icon: '🍽️', label: 'Food & Dining' },
                        { key: 'transport', icon: '🚗', label: 'Transport' },
                        { key: 'activities', icon: '🎫', label: 'Activities' },
                        { key: 'misc', icon: '💰', label: 'Misc' },
                      ].map(cat => {
                        const spent = tripExpense.byCategory[cat.key]?.spent || 0;
                        const budgetPercent = tripBudget > 0 ? Math.round((spent / tripBudget) * 100) : 0;
                        return (
                          <div key={cat.key} className="bg-gray-50 rounded-lg p-2 text-center">
                            <div className="text-lg mb-0.5">{cat.icon}</div>
                            <div className="text-[10px] text-gray-500 truncate">{cat.label}</div>
                            <div className={`text-xs font-semibold ${spent > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                              {spent > 0 ? formatCurrency(spent) : 'Free'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Add Expense Button */}
                    <button
                      onClick={() => {
                        setMiscExpense(prev => ({ ...prev, tripId: tripId }));
                        setShowMiscModal(true);
                      }}
                      className="mt-3 w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>➕</span> Add Expense
                    </button>
                    
                    {/* Daily Budget */}
                    {tripBudget > 0 && tripDuration > 0 && (
                      <div className="mt-3 flex items-center justify-between text-xs bg-blue-50 text-blue-800 rounded-lg px-3 py-2">
                        <span>💳 Daily budget per person:</span>
                        <span className="font-semibold">
                          {formatCurrency(Math.round(tripBudget / tripDuration / (trip?.groupSize || trip?.travelers || 2)))}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Days within Trip */}
                  <div className="divide-y divide-gray-100">
                    {daysForTrip.map((dayNum) => {
                      // Combine regular day items with all-day items (accommodation, transport)
                      const regularDayItems = tripData.byDay[dayNum] || [];
                      const allDayItems = tripData.allDayItems || [];
                      const dayItems = [...allDayItems, ...regularDayItems];
                      const startDate = trip?.startDate ? new Date(trip.startDate) : null;
                      const dayDate = startDate ? new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000) : null;
                      const dayTotal = dayItems.reduce((sum, item) => sum + (item.cost || item.entryFee || 0), 0);
                      
                      return (
                        <div key={dayNum}>
                          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-800">Day {dayNum} {dayDate && <span className="text-gray-500 font-normal text-sm ml-1">{dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}</span>
                            <span className="text-sm text-gray-600">{regularDayItems.length} items {dayTotal > 0 && <span className="text-green-600 font-medium">• {formatCurrency(dayTotal)}</span>}</span>
                          </div>
                          
                          {dayItems.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                              {dayItems.map((item, itemIndex) => (
                                <div key={`${item.id}-${dayNum}-${itemIndex}`} className={`px-4 py-3 hover:bg-gray-50 ${item.showOnAllDays ? (item.paidDays?.includes(dayNum) ? 'bg-green-50/30' : '') : (item.isPaid ? 'bg-green-50/30' : '')}`}>
                                  <div className="flex items-start gap-3">
                                    {/* Checkbox - for showOnAllDays items, track per-day; for regular items, use isPaid */}
                                    <input 
                                      type="checkbox" 
                                      checked={item.showOnAllDays ? (item.paidDays?.includes(dayNum) || false) : (item.isPaid || false)} 
                                      onChange={(e) => item.showOnAllDays ? markDayAsPaid(item.id, dayNum, e.target.checked) : markItemAsPaid(item.id, e.target.checked)} 
                                      className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600" 
                                    />
                                    <div className="flex-1">
                                      <span className={`font-medium ${(item.showOnAllDays ? item.paidDays?.includes(dayNum) : item.isPaid) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</span>
                                      {(item.showOnAllDays ? item.paidDays?.includes(dayNum) : item.isPaid) && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 rounded">Paid</span>}
                                      {item.type === 'restaurant' && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 rounded">🍽️</span>}
                                      {item.location && !item.name?.toLowerCase().includes('transport') && item.expenseCategory !== 'misc' && item.location !== 'Custom expense' && (
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ', ' + item.location + ', Sri Lanka')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-gray-500 mt-0.5 hover:text-blue-600 hover:underline cursor-pointer inline-flex items-center"
                                        >
                                          <MapPinIcon className="w-3 h-3 inline mr-1" />{item.location}
                                        </a>
                                      )}
                                    </div>
                                    {/* Price edit */}
                                    {editingItemId === item.id ? (
                                      <div className="flex items-center gap-1">
                                        <input type="number" value={editingPrice} onChange={(e) => setEditingPrice(e.target.value)} className="w-20 text-sm border rounded px-2 py-1" autoFocus />
                                        <button onClick={() => savePrice(item.id)} className="p-1 text-green-600"><CheckIcon className="w-4 h-4" /></button>
                                        <button onClick={cancelEditingPrice} className="p-1 text-red-500"><XMarkIcon className="w-4 h-4" /></button>
                                      </div>
                                    ) : (
                                      <button onClick={() => startEditingPrice(item)} className="text-green-600 font-medium text-sm hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                        {(item.cost || item.entryFee) > 0 ? formatCurrency(item.cost || item.entryFee) : '+ price'}
                                        <PencilIcon className="w-3 h-3 opacity-50" />
                                      </button>
                                    )}
                                    {/* Day selector - hide for all-day items like accommodation/transport */}
                                    {item.showOnAllDays && tripDuration > 1 ? (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">All Days</span>
                                    ) : !item.showOnAllDays ? (
                                      <select value={item.assignedDay || 1} onChange={(e) => changeItemDay(item.id, parseInt(e.target.value))} className="text-xs bg-gray-100 rounded py-1 px-2">
                                        {daysForTrip.map(d => <option key={d} value={d}>Day {d}</option>)}
                                      </select>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Day 1</span>
                                    )}
                                    <button onClick={() => removeFromSavedAndSync(item.name)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-4 text-center text-gray-400 text-sm">No activities for Day {dayNum}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* Note about ratings */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> {t('itinerary.ratingNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyItineraryPage;
