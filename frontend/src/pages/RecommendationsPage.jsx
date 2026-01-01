import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RecommendationPanel } from '../components/recommendations';
import WeatherWidget from '../components/WeatherWidget';
import AttractionMap from '../components/AttractionMap';
import PackingListGenerator from '../components/PackingListGenerator';
import {
  MapPinIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CloudIcon,
  MapIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { sampleAttractions } from '../data/attractions';

// Helper: map AI recommendations to AttractionMap format, filling coordinates from sampleAttractions if missing
function getMapAttractions(
  aiRecommendations,
  destinationAttractions,
  sampleAttractions,
  coords,
  destination
) {
  if (
    !aiRecommendations ||
    (!aiRecommendations.topAttractions &&
      !aiRecommendations.recommendedRestaurants)
  ) {
    // fallback to sample attractions for destination
    return destinationAttractions.length > 0
      ? destinationAttractions
      : sampleAttractions.slice(0, 5);
  }
  // Combine topAttractions and recommendedRestaurants
  const aiRecs = [
    ...(aiRecommendations.topAttractions || []),
    ...(aiRecommendations.recommendedRestaurants || []),
  ];
  // Map to AttractionMap format
  return aiRecs.map((rec, idx) => {
    // Try to get coordinates from rec, else from sampleAttractions by name
    let coordinates = rec.coordinates;
    if (!coordinates && rec.name) {
      const match = sampleAttractions.find(
        (a) => a.name.toLowerCase() === rec.name.toLowerCase()
      );
      coordinates = match ? match.coordinates : undefined;
    }
    return {
      id: rec.id || rec.name || idx,
      name: rec.name,
      description: rec.description,
      category:
        rec.category || (rec.type === 'restaurant' ? 'food' : 'culture'),
      rating: rec.rating || 4.5,
      coordinates: coordinates || { lat: coords.lat, lng: coords.lng },
      estimatedCost: rec.estimatedCost || 0,
      openingHours: rec.openingHours || '',
      imageUrl: rec.imageUrl || '',
      type: rec.type || 'attraction',
      location: rec.location || destination,
    };
  });
}

// Sri Lanka destinations with coordinates
const DESTINATIONS = {
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Kandy: { lat: 7.2906, lng: 80.6337 },
  Galle: { lat: 6.0535, lng: 80.221 },
  Sigiriya: { lat: 7.957, lng: 80.7603 },
  'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 },
  Ella: { lat: 6.8667, lng: 81.0466 },
  Mirissa: { lat: 5.9483, lng: 80.4716 },
  Trincomalee: { lat: 8.5874, lng: 81.2152 },
  Anuradhapura: { lat: 8.3114, lng: 80.4037 },
  Jaffna: { lat: 9.6615, lng: 80.0255 },
};

// Interest options - SYNCED with TripPlannerForm
const INTEREST_OPTIONS = [
  { id: 'culture', label: 'Culture & Heritage', emoji: '🏛️' },
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'beach', label: 'Beaches', emoji: '🏖️' },
  { id: 'nature', label: 'Nature & Wildlife', emoji: '🌿' },
  { id: 'food', label: 'Food & Cuisine', emoji: '🍛' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'wildlife', label: 'Wildlife', emoji: '🐘' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
];

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const RecommendationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Feature access control
  const { isGuest, isAuthenticated, canUseFeature, getRemainingUsage, getMaxUsage, recordUsage } = useFeatureAccess();
  const aiRecsAccess = canUseFeature('aiRecommendations');
  const remainingRecs = getRemainingUsage('aiRecommendations');
  const maxRecs = getMaxUsage('aiRecommendations');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Note: Guests can now access recommendations with limits (1 per session)

  // Get trip data from navigation state (from HomePage form or Itinerary Add More)
  const tripData = location.state?.tripData;
  const useCache = location.state?.useCache; // If true, use cached recommendations for this trip
  const isAddMoreMode = location.state?.isAddMoreMode; // If true, lock preferences (from Add More button)

  // Get cached params and recommendations from store
  const {
    params: cachedParams,
    isValid,
    hasStoredRecommendations,
    getCachedByDestination,
    hasCachedFor,
    setLoading: setStoreLoading,
    recommendationsByDestination,
  } = useRecommendationsStore();

  // Get current destination's recommendations for map rendering
  // This ensures backward compatibility with code expecting aiRecommendations
  const currentDestinationKey = tripData?.destination?.toLowerCase() || cachedParams?.destination?.toLowerCase();
  const aiRecommendations = currentDestinationKey 
    ? recommendationsByDestination[currentDestinationKey]?.recommendations 
    : null;

  // Initialize state - priority: tripData > cachedParams > defaults
  const getInitialValue = (tripKey, cachedKey, defaultValue) => {
    if (tripData?.[tripKey]) return tripData[tripKey];
    if (cachedParams?.[cachedKey] && isValid()) return cachedParams[cachedKey];
    return defaultValue;
  };
  
  // Normalize destination to match DESTINATIONS keys (case-insensitive)
  const normalizeDestination = (dest) => {
    if (!dest) return '';
    const destLower = dest.toLowerCase();
    // Find matching destination key
    const match = Object.keys(DESTINATIONS).find(key => 
      key.toLowerCase() === destLower || 
      key.toLowerCase().includes(destLower) ||
      destLower.includes(key.toLowerCase().split(' ')[0])
    );
    return match || dest; // Return match or original if no match found
  };

  const [destination, setDestination] = useState(() =>
    normalizeDestination(getInitialValue('destination', 'destination', ''))
  );
  const [interests, setInterests] = useState(() =>
    getInitialValue('interests', 'interests', [])
  );
  const [budget, setBudget] = useState(() =>
    getInitialValue('budget', 'budget', '')
  );
  const [duration, setDuration] = useState(() =>
    getInitialValue('tripDuration', 'duration', '')
  );
  const [groupSize, setGroupSize] = useState(() =>
    getInitialValue('groupSize', 'groupSize', '')
  );
  const [startDate, setStartDate] = useState(() =>
    getInitialValue('startDate', 'startDate', '')
  );
  const [endDate, setEndDate] = useState(() =>
    getInitialValue('endDate', 'endDate', '')
  );
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [showWeather, setShowWeather] = useState(true);
  const [showMap, setShowMap] = useState(true); // Show map by default

  // Apply trip data when it's available (from HomePage navigation or Itinerary Add More) - override cached
  useEffect(() => {
    if (tripData) {
      console.log('Received trip data:', tripData, 'useCache:', useCache);
      if (tripData.destination) setDestination(normalizeDestination(tripData.destination));
      if (tripData.interests) setInterests(tripData.interests);
      if (tripData.budget) setBudget(tripData.budget);
      // Handle both tripDuration (from form) and duration (from stored trip)
      if (tripData.tripDuration || tripData.duration) setDuration(tripData.tripDuration || tripData.duration);
      if (tripData.groupSize || tripData.travelers) setGroupSize(tripData.groupSize || tripData.travelers);
      if (tripData.startDate) setStartDate(tripData.startDate);
      if (tripData.endDate) setEndDate(tripData.endDate);
    }
  }, [tripData, useCache]);

  // Zustand store for itinerary
  const { savedItems, addToSavedAndSync, isSaved, setTripDetails } =
    useItineraryStore();

  // Get coordinates for current destination
  const coords = DESTINATIONS[destination] || DESTINATIONS['Kandy'];

  // Filter attractions for current destination (use name/description since attractions don't have location field)
  const destinationAttractions = sampleAttractions.filter(
    (a) =>
      a.name?.toLowerCase().includes(destination.toLowerCase()) ||
      a.description?.toLowerCase().includes(destination.toLowerCase())
  );

  // Calculate dates based on duration or use provided dates
  const calculatedStartDate =
    startDate ||
    (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    })();

  const calculatedEndDate =
    endDate ||
    (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + duration);
      return formatDate(tomorrow);
    })();

  // Update trip details in store when preferences change
  useEffect(() => {
    // Generate tripId based on destination and start date (unique per trip)
    const tripId = `${destination}-${calculatedStartDate}`.toLowerCase().replace(/\s+/g, '-');
    setTripDetails({
      tripId,
      destination,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      duration,
      budget,
      groupSize,
    });
  }, [
    destination,
    calculatedStartDate,
    calculatedEndDate,
    duration,
    budget,
    groupSize,
    setTripDetails,
  ]);

  // Toggle interest selection
  const toggleInterest = (interestId) => {
    setInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((i) => i !== interestId)
        : [...prev, interestId]
    );
  };

  // Handle add to itinerary - saves to Zustand store with persistence
  const handleAddToItinerary = (recommendation) => {
    // Block guests from saving
    if (isGuest) {
      setShowUpgradeModal(true);
      return;
    }

    if (isSaved(recommendation.name)) {
      // Already saved
      return;
    }

    addToSavedAndSync(recommendation);
    setLastAddedItem(recommendation.name);
    setShowAddedToast(true);

    // Hide toast after 3 seconds
    setTimeout(() => {
      setShowAddedToast(false);
      setLastAddedItem(null);
    }, 3000);
  };

  // Handle view itinerary
  const handleViewItinerary = () => {
    navigate('/itinerary');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Toast notification for added items */}
      {showAddedToast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className="bg-secondary-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">"{lastAddedItem}" {t('recommendations.added')}</span>
            <button
              onClick={handleViewItinerary}
              className="ml-2 flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm transition-colors"
            >
              {t('recommendations.viewItinerary')}
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-600 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="w-8 h-8" />
            <span className="text-secondary-200 font-medium">{t('recommendations.aiPowered')}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            {destination 
              ? `${t('recommendations.title')} - ${destination}`
              : t('recommendations.title')}
          </h1>
          <p className="text-secondary-200">
            {tripData
              ? `${duration} ${t('tripPlanner.days')} • ${groupSize} ${t('tripPlanner.travelers')} • LKR ${budget?.toLocaleString() || 0}`
              : destination 
                ? t('home.getAiRecommendations')
                : t('recommendations.selectDestinationHint') || 'Select a destination to get started'}
          </p>
        </div>
      </div>

      {/* Guest Upgrade Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-amber-800 font-medium text-sm">
                  {remainingRecs > 0 
                    ? `You have ${remainingRecs} free recommendation${remainingRecs > 1 ? 's' : ''} left`
                    : 'You\'ve used your free recommendation'}
                </p>
                <p className="text-amber-600 text-xs">Sign up for unlimited access</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              Get Full Access
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full"
              >
                <span className="text-xl">×</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Want More Recommendations?</h3>
                  <p className="text-sm text-white/80">Create a free account</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 text-sm mb-4">
                You've used your free recommendation. Sign up to get:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-secondary-500" />
                  5 AI recommendations per day
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-secondary-500" />
                  Save attractions to your itinerary
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-secondary-500" />
                  Personalized packing lists
                </li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowUpgradeModal(false); navigate('/register'); }}
                  className="flex-1 py-2.5 bg-secondary-500 text-white rounded-lg font-medium hover:bg-secondary-600"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => { setShowUpgradeModal(false); navigate('/login'); }}
                  className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preferences Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('recommendations.tripPreferences')}
              </h2>
              
              {/* Locked mode info banner */}
              {isAddMoreMode && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    🔒 <strong>Adding to existing trip</strong> - Preferences are locked. 
                    Create a new trip from Home if you want different settings.
                  </p>
                </div>
              )}

              {/* Destination */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="w-4 h-4 text-secondary-500" />
                  {t('tripPlanner.destination')}
                  {isAddMoreMode && <span className="ml-auto text-xs text-gray-400">🔒 Locked</span>}
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={isAddMoreMode}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none ${isAddMoreMode ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                >
                  <option value="">{t('tripPlanner.selectDestination') || 'Select a destination'}</option>
                  {Object.keys(DESTINATIONS).map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <CalendarDaysIcon className="w-4 h-4 text-secondary-500" />
                  {t('tripPlanner.duration')} ({t('tripPlanner.days')})
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  disabled={isAddMoreMode}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none ${isAddMoreMode ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                />
              </div>

              {/* Group Size */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="w-4 h-4 text-secondary-500" />
                  {t('tripPlanner.travelers')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={groupSize}
                  onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                  disabled={isAddMoreMode}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none ${isAddMoreMode ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                />
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-secondary-500" />
                  {t('tripPlanner.budgetLKR')}
                </label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value) || 10000)}
                  disabled={isAddMoreMode}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none ${isAddMoreMode ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ≈ ${(budget / 300).toFixed(0)} USD
                </p>
              </div>

              {/* Interests */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t('tripPlanner.interests')}
                  {isAddMoreMode && <span className="ml-2 text-xs text-gray-400">🔒 Locked</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => !isAddMoreMode && toggleInterest(interest.id)}
                      disabled={isAddMoreMode}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        interests.includes(interest.id)
                          ? 'bg-secondary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${isAddMoreMode ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <span>{interest.emoji}</span>
                      {t(`interests.${interest.id}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-secondary-50 rounded-xl">
                <h3 className="text-sm font-semibold text-secondary-800 mb-2">
                  {t('tripPlanner.tripSummary')}
                </h3>
                <ul className="text-sm text-secondary-700 space-y-1">
                  <li>📍 {destination}</li>
                  <li>📅 {duration} {t('tripPlanner.days')}</li>
                  <li>👥 {groupSize} {t('tripPlanner.travelers')}</li>
                  <li>💰 LKR {budget.toLocaleString()}</li>
                  <li>❤️ {interests.length} {t('tripPlanner.interestsSelected')}</li>
                </ul>
              </div>

              {/* Saved Items - Grouped by Trip */}
              {savedItems.length > 0 && (
                <div className="mt-6 p-4 bg-secondary-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-secondary-800">
                      {t('recommendations.savedToItinerary')} ({savedItems.length})
                    </h3>
                    <button
                      onClick={handleViewItinerary}
                      className="text-xs text-secondary-600 hover:text-secondary-700 font-medium flex items-center gap-1"
                    >
                      {t('common.viewAll')}
                      <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Group by trip */}
                  {(() => {
                    const groupedByTrip = savedItems.reduce((acc, item) => {
                      const tripDest = item.tripId?.split('-')[0] || destination || 'Trip';
                      if (!acc[tripDest]) acc[tripDest] = [];
                      acc[tripDest].push(item);
                      return acc;
                    }, {});
                    return Object.entries(groupedByTrip).map(([tripDest, items]) => (
                      <div key={tripDest} className="mb-2">
                        <div className="text-xs font-medium text-secondary-600 mb-1 flex items-center gap-1">
                          📍 {tripDest} ({items.length})
                        </div>
                        <ul className="text-sm text-secondary-700 space-y-0.5 pl-3 max-h-20 overflow-y-auto">
                          {items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="truncate flex items-center gap-1 text-xs">
                              <CheckCircleIcon className="w-3 h-3 text-secondary-500 flex-shrink-0" />
                              {item.name}
                            </li>
                          ))}
                          {items.length > 3 && (
                            <li className="text-secondary-500 text-xs">+{items.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Weather Widget */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <button
                onClick={() => setShowWeather(!showWeather)}
                className="w-full flex items-center justify-between text-lg font-bold text-gray-900 mb-4"
              >
                <span className="flex items-center gap-2">
                  <CloudIcon className="w-5 h-5 text-blue-500" />
                  {t('weather.title')} - {destination}
                </span>
                <span className="text-gray-400">{showWeather ? '−' : '+'}</span>
              </button>
              {showWeather && (
                <WeatherWidget
                  destinationName={destination}
                />
              )}
            </div>

            {/* Map Toggle */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <button
                onClick={() => setShowMap(!showMap)}
                className="w-full flex items-center justify-between text-lg font-bold text-gray-900 mb-4"
              >
                <span className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-green-500" />
                  Explore {destination}
                </span>
                <span className="text-gray-400">{showMap ? '−' : '+'}</span>
              </button>
              {showMap && (
                <div className="h-64 rounded-xl overflow-hidden">
                  <AttractionMap
                    attractions={getMapAttractions(
                      aiRecommendations,
                      destinationAttractions,
                      sampleAttractions,
                      coords,
                      destination
                    )}
                    onSelectAttraction={(attraction) => {
                      console.log('Selected:', attraction);
                    }}
                    onAddToItinerary={(attraction) => {
                      handleAddToItinerary({
                        name: attraction.name,
                        description: attraction.description,
                        location: attraction.location,
                        category: attraction.category,
                        type: attraction.type || 'attraction',
                      });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Packing List Generator */}
            <div className="mt-6">
              <PackingListGenerator
                tripDetails={{
                  destination,
                  duration,
                  interests,
                  groupSize,
                }}
                weather={null}
              />
            </div>
          </div>

          {/* Recommendations Panel */}
          <div className="lg:col-span-2">
            <RecommendationPanel
              destination={destination}
              interests={interests}
              budget={budget}
              duration={duration}
              groupSize={groupSize}
              startDate={calculatedStartDate}
              endDate={calculatedEndDate}
              onAddToItinerary={handleAddToItinerary}
              autoFetch={!!tripData}
              showFilters={true}
              allowGenerate={!!tripData} // Must create a trip from Home first - saves API costs
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
