import { useState } from 'react';
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

  const {
    savedItems,
    tripDetails,
    removeFromSavedAndSync,
    clearItinerary,
    getEstimatedBudget,
    getExpenseSummary,
    getBudgetAlerts,
    markItemAsPaid,
    updateItemCost,
    budgetAllocation,
  } = useItineraryStore();

  // Get user's saved trips
  const { trips } = useUserStore();

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
      acc[tripId] = { items: [], byDay: {} };
    }
    acc[tripId].items.push(item);
    
    const day = item.assignedDay || 1;
    if (!acc[tripId].byDay[day]) {
      acc[tripId].byDay[day] = [];
    }
    acc[tripId].byDay[day].push(item);
    return acc;
  }, {});

  // Get trip info from user's saved trips
  const getTrip = (tripId) => {
    if (!trips || trips.length === 0) return null;
    
    // Extract destination from tripId (e.g., "colombo" from "colombo-2025-01-02")
    const tripDestination = tripId.split('-')[0]?.toLowerCase();
    
    // Try multiple matching strategies
    return trips?.find(t => {
      // Match by exact tripId
      if (t.tripId === tripId) return true;
      // Match by constructed ID pattern
      const constructedId = `${t.destination}-${t.startDate}`.toLowerCase().replace(/\s+/g, '-');
      if (constructedId === tripId) return true;
      // Match by destination name (most reliable)
      if (t.destination?.toLowerCase() === tripDestination) return true;
      return false;
    });
  };

  // Calculate expense summary for a specific trip
  const getTripExpenseSummary = (tripId, tripItems, trip) => {
    const totalSpent = tripItems.reduce((sum, item) => sum + (item.cost || item.entryFee || item.trackedCost || 0), 0);
    const paidItems = tripItems.filter(i => i.isPaid);
    const paidAmount = paidItems.reduce((sum, item) => sum + (item.cost || item.entryFee || 0), 0);
    const budget = trip?.budget || 0;
    const remaining = budget - totalSpent;
    const percentageUsed = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
    
    // Category breakdown
    const byCategory = tripItems.reduce((acc, item) => {
      const cat = item.expenseCategory || 'misc';
      if (!acc[cat]) acc[cat] = { spent: 0, items: [] };
      acc[cat].spent += (item.cost || item.entryFee || item.trackedCost || 0);
      acc[cat].items.push(item);
      return acc;
    }, {});

    return { totalSpent, paidAmount, paidItems: paidItems.length, budget, remaining, percentageUsed, byCategory };
  };

  // Handle item day change
  const { changeItemDay } = useItineraryStore();

  // Handle price editing
  const startEditingPrice = (item) => {
    setEditingItemId(item.id);
    setEditingPrice((item.cost || item.entryFee || item.trackedCost || 0).toString());
  };

  const savePrice = (itemId) => {
    const newPrice = parseInt(editingPrice) || 0;
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
          const totalBudget = trips?.reduce((sum, t) => sum + (t.budget || 0), 0) || 0;
          const totalSpent = savedItems.reduce((sum, item) => sum + (item.cost || item.entryFee || item.trackedCost || 0), 0);
          const budgetUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
          const paidItems = savedItems.filter(i => i.isPaid).length;
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

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {budgetAlerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  alert.type === 'danger'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <span className={`text-xl ${alert.type === 'danger' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {alert.type === 'danger' ? '🔴' : '🟡'}
                </span>
                <span className={`text-sm font-medium ${
                  alert.type === 'danger' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        )}


        {/* Trip-by-Trip Itinerary View */}
        {Object.keys(itemsByTrip).length > 0 && (
          <div className="space-y-8 mb-8">
            {Object.entries(itemsByTrip).map(([tripId, tripData]) => {
              const trip = getTrip(tripId);
              const tripItems = tripData.items;
              const tripExpense = getTripExpenseSummary(tripId, tripItems, trip);
              const tripDuration = trip?.duration || Math.max(...tripItems.map(i => i.assignedDay || 1), 1);
              const daysForTrip = Array.from({ length: tripDuration }, (_, i) => i + 1);
              const tripBudget = trip?.budget || 0;
              const tripDestination = trip?.destination || tripId.split('-')[0] || 'Trip';
              
              return (
                <div key={tripId} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  {/* Trip Header - Simplified */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5" />
                        {tripDestination}
                      </h3>
                      <Link
                        to="/recommendations"
                        state={{
                          tripData: {
                            destination: tripDestination,
                            duration: trip?.duration || tripDuration,
                            tripDuration: trip?.duration || tripDuration,
                            groupSize: trip?.groupSize || trip?.travelers || 2,
                            travelers: trip?.travelers || trip?.groupSize || 2,
                            budget: tripBudget,
                            startDate: trip?.startDate || new Date().toISOString().split('T')[0],
                            endDate: trip?.endDate || new Date(Date.now() + tripDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            interests: trip?.interests || [],
                          },
                          useCache: true,
                          isAddMoreMode: true, // Lock preferences - prevent changing params
                        }}
                        className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md"
                      >
                        <PlusIcon className="w-3 h-3" />
                        Add More
                      </Link>
                    </div>
                    <p className="text-xs opacity-80">
                      {trip ? (
                        <>
                          {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {tripDuration} days • {tripItems.length} items
                          {tripBudget > 0 && <> • Budget: {formatCurrency(tripBudget)}</>}
                        </>
                      ) : (
                        <>{tripDuration} days • {tripItems.length} items</>
                      )}
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
                          <span className="text-gray-700">{formatCurrency(tripExpense.totalSpent)} / {formatCurrency(tripBudget)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${tripExpense.percentageUsed > 90 ? 'bg-red-500' : tripExpense.percentageUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(tripExpense.percentageUsed, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{tripExpense.percentageUsed}% used</span>
                          <span>{formatCurrency(tripExpense.remaining)} remaining</span>
                        </div>
                      </div>
                    )}
                    
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
                      const dayItems = tripData.byDay[dayNum] || [];
                      const startDate = trip?.startDate ? new Date(trip.startDate) : null;
                      const dayDate = startDate ? new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000) : null;
                      const dayTotal = dayItems.reduce((sum, item) => sum + (item.cost || item.entryFee || 0), 0);
                      
                      return (
                        <div key={dayNum}>
                          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                            <span className="font-semibold text-gray-800">Day {dayNum} {dayDate && <span className="text-gray-500 font-normal text-sm ml-1">{dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}</span>
                            <span className="text-sm text-gray-600">{dayItems.length} items {dayTotal > 0 && <span className="text-green-600 font-medium">• {formatCurrency(dayTotal)}</span>}</span>
                          </div>
                          
                          {dayItems.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                              {dayItems.map((item) => (
                                <div key={item.id} className={`px-4 py-3 hover:bg-gray-50 ${item.isPaid ? 'bg-green-50/30' : ''}`}>
                                  <div className="flex items-start gap-3">
                                    <input type="checkbox" checked={item.isPaid || false} onChange={(e) => markItemAsPaid(item.id, e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600" />
                                    <div className="flex-1">
                                      <span className={`font-medium ${item.isPaid ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</span>
                                      {item.isPaid && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 rounded">Paid</span>}
                                      {item.type === 'restaurant' && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 rounded">🍽️</span>}
                                      {item.location && <div className="text-xs text-gray-500 mt-0.5"><MapPinIcon className="w-3 h-3 inline mr-1" />{item.location}</div>}
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
                                    <select value={item.assignedDay || 1} onChange={(e) => changeItemDay(item.id, parseInt(e.target.value))} className="text-xs bg-gray-100 rounded py-1 px-2">
                                      {daysForTrip.map(d => <option key={d} value={d}>Day {d}</option>)}
                                    </select>
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
