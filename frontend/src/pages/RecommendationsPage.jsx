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
} from '@heroicons/react/24/outline';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
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

  // Get trip data from navigation state (from HomePage form)
  const tripData = location.state?.tripData;

  // Get cached params and recommendations from store
  const {
    params: cachedParams,
    isValid,
    hasStoredRecommendations,
    recommendations: storedRecommendations,
  } = useRecommendationsStore();

  // Also grab raw recommendations object for map rendering
  const { recommendations: aiRecommendations } = useRecommendationsStore();

  // Initialize state - priority: tripData > cachedParams > defaults
  const getInitialValue = (tripKey, cachedKey, defaultValue) => {
    if (tripData?.[tripKey]) return tripData[tripKey];
    if (cachedParams?.[cachedKey] && isValid()) return cachedParams[cachedKey];
    return defaultValue;
  };

  const [destination, setDestination] = useState(() =>
    getInitialValue('destination', 'destination', '')
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

  // Apply trip data when it's available (from HomePage navigation) - override cached
  useEffect(() => {
    if (tripData) {
      console.log('Received trip data from home:', tripData);
      if (tripData.destination) setDestination(tripData.destination);
      if (tripData.interests) setInterests(tripData.interests);
      if (tripData.budget) setBudget(tripData.budget);
      if (tripData.tripDuration) setDuration(tripData.tripDuration);
      if (tripData.groupSize) setGroupSize(tripData.groupSize);
      if (tripData.startDate) setStartDate(tripData.startDate);
      if (tripData.endDate) setEndDate(tripData.endDate);
    }
  }, [tripData]);

  // Zustand store for itinerary
  const { savedItems, addToSaved, isSaved, setTripDetails } =
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
    setTripDetails({
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
    if (isSaved(recommendation.name)) {
      // Already saved
      return;
    }

    addToSaved(recommendation);
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preferences Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                {t('recommendations.tripPreferences')}
              </h2>

              {/* Destination */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="w-4 h-4 text-secondary-500" />
                  {t('tripPlanner.destination')}
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ≈ ${(budget / 300).toFixed(0)} USD
                </p>
              </div>

              {/* Interests */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t('tripPlanner.interests')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        interests.includes(interest.id)
                          ? 'bg-secondary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
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

              {/* Saved Items - From Zustand Store */}
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
                  <ul className="text-sm text-secondary-700 space-y-1 max-h-32 overflow-y-auto">
                    {savedItems.slice(0, 5).map((item, idx) => (
                      <li
                        key={idx}
                        className="truncate flex items-center gap-1"
                      >
                        <CheckCircleIcon className="w-4 h-4 text-secondary-500 flex-shrink-0" />
                        {item.name}
                      </li>
                    ))}
                    {savedItems.length > 5 && (
                      <li className="text-secondary-500 text-xs">
                        +{savedItems.length - 5} more...
                      </li>
                    )}
                  </ul>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
