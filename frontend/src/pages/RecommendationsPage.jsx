import { useState, useEffect, useRef } from 'react';
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
  ArchiveBoxIcon as PackageIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { useFeatureAccess } from '../hooks/useFeatureAccess';



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

// Accommodation type options - 2026 REALISTIC PRICES from travel sites
const ACCOMMODATION_TYPES = [
  { id: 'budget', label: 'Budget (Hostel/Guesthouse)', description: 'LKR 5,000-15,000/night' },
  { id: 'midrange', label: 'Mid-range (3-star Hotel)', description: 'LKR 15,000-55,000/night' },
  { id: 'luxury', label: 'Luxury (4-5 star Resort)', description: 'LKR 55,000-170,000/night' },
];

// Transport mode options
const TRANSPORT_MODES = [
  { id: 'public', label: 'Public Transport', description: 'LKR 500-2,000/day' },
  { id: 'tuktuk', label: 'Tuk-Tuk', description: 'LKR 2,000-5,000/day' },
  { id: 'private', label: 'Private Car', description: 'LKR 8,000-15,000/day' },
  { id: 'mix', label: 'Mix', description: 'Flexible' },
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
  const { isGuest, getRemainingUsage } = useFeatureAccess();
  const remainingRecs = getRemainingUsage('aiRecommendations');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Note: Guests can now access recommendations with limits (1 per session)

  // Get trip data from navigation state (from HomePage form or Itinerary Add More)
  const tripData = location.state?.tripData;
  const useCache = location.state?.useCache; // If true, use cached recommendations for this trip
  const isAddMoreMode = location.state?.isAddMoreMode; // If true, lock preferences (from Add More button)

  // For new trips (not Add More), generate a unique suffix to prevent tripId collision
  // when multiple trips share the same destination. This ref is stable across re-renders.
  const newTripSuffix = useRef(null);
  if (newTripSuffix.current === null) {
    newTripSuffix.current = !isAddMoreMode && !tripData?.tripId ? `-${Date.now()}` : '';
  }

  // Get cached params and recommendations from store
  const {
    params: cachedParams,
    isValid,
    clearRecommendationsForDestination,
    setLoading: setStoreLoading,
    recommendationsByDestination,
    loading: storeLoading,
    _activeFetchId,
  } = useRecommendationsStore();

  // Get current destination's recommendations for map rendering
  // This ensures backward compatibility with code expecting aiRecommendations
  const currentDestinationKey = tripData?.destination?.toLowerCase() || cachedParams?.destination?.toLowerCase();
  const aiRecommendations = currentDestinationKey 
    ? recommendationsByDestination[currentDestinationKey]?.recommendations 
    : null;

  // Initialize state - priority: tripData > sessionStorage > cachedParams > defaults
  const getInitialValue = (tripKey, cachedKey, defaultValue) => {
    if (tripData?.[tripKey]) return tripData[tripKey];
    // Check sessionStorage for persisted form state (survives navigation)
    try {
      const saved = sessionStorage.getItem('serendibtrip-trip-prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[tripKey] !== undefined && parsed[tripKey] !== '' && parsed[tripKey] !== null) {
          return parsed[tripKey];
        }
      }
    } catch { /* ignore */ }
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
  const [showWeather, setShowWeather] = useState(false);
  const [showMap, setShowMap] = useState(true); // Show map by default
  const [prefsExpanded, setPrefsExpanded] = useState(!tripData);
  const [accommodationType, setAccommodationType] = useState(() =>
    getInitialValue('accommodationType', 'accommodationType', 'midrange')
  );
  const [transportMode, setTransportMode] = useState(() =>
    getInitialValue('transportMode', 'transportMode', 'tuktuk')
  );

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
      if (tripData.startDate) {
        setStartDate(tripData.startDate);
      }
      if (tripData.endDate) {
        setEndDate(tripData.endDate);
      }
      // Restore accommodation type and transport mode from trip data
      if (tripData.accommodationType) setAccommodationType(tripData.accommodationType);
      if (tripData.transportMode) setTransportMode(tripData.transportMode);
    }
  }, [tripData, useCache]);

  // NEW TRIP: Clear recommendation cache so fresh AI results are generated
  // Only for new trips (not Add More mode, which should reuse existing recommendations)
  useEffect(() => {
    if (!isAddMoreMode && tripData?.destination) {
      console.log('New trip detected — clearing recommendation cache for:', tripData.destination);
      clearRecommendationsForDestination(tripData.destination);
      // Also clear session storage to prevent stale form data leaking between trips
      try { sessionStorage.removeItem('serendibtrip-trip-prefs'); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — runs once when page loads for a new trip

  // Save form preferences to sessionStorage whenever they change (survives navigation)
  // Note: Don't persist startDate/endDate — they should be computed fresh for new trips
  useEffect(() => {
    if (destination) {
      try {
        sessionStorage.setItem('serendibtrip-trip-prefs', JSON.stringify({
          destination,
          interests,
          budget,
          tripDuration: duration,
          duration,
          groupSize,
          accommodationType,
          transportMode,
        }));
      } catch { /* ignore */ }
    }
  }, [destination, interests, budget, duration, groupSize, accommodationType, transportMode]);

  // Clear stale loading state on mount - if loading is true but no active fetch is running
  useEffect(() => {
    if (storeLoading && !_activeFetchId) {
      setStoreLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Zustand store for itinerary
  const { addToSavedAndSync, isSaved, setTripDetails } =
    useItineraryStore();

  // Get coordinates for current destination
  const coords = DESTINATIONS[destination] || DESTINATIONS['Kandy'];

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
    // Priority for tripId:
    // 1. Explicit tripId from Add More navigation state (reuse existing trip)
    // 2. In Add More mode: match existing store trip for same destination (page refresh case)
    // 3. New trip: ALWAYS generate a new unique tripId with timestamp suffix
    const existingStoreTripId = useItineraryStore.getState().tripDetails?.tripId;
    const normalizedDest = destination?.toLowerCase().replace(/\s+/g, '-');
    const storeMatchesDest = existingStoreTripId && normalizedDest && existingStoreTripId.startsWith(normalizedDest);
    
    let tripId;
    if (tripData?.tripId) {
      // Explicit tripId from navigation (Add More button passes tripId)
      tripId = tripData.tripId;
    } else if (isAddMoreMode && storeMatchesDest) {
      // Add More mode: reuse existing trip for this destination
      tripId = existingStoreTripId;
    } else {
      // NEW TRIP: Always generate a fresh unique tripId
      tripId = `${destination}-${calculatedStartDate}${newTripSuffix.current}`.toLowerCase().replace(/\s+/g, '-');
    }
    setTripDetails({
      tripId,
      destination,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      duration,
      budget,
      groupSize,
      // CRITICAL: Save accommodation and transport preferences
      accommodationType,
      transportMode,
      interests,
    });
  }, [
    tripData?.tripId,
    destination,
    calculatedStartDate,
    calculatedEndDate,
    duration,
    budget,
    groupSize,
    accommodationType,
    transportMode,
    interests,
    setTripDetails,
    isAddMoreMode,
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

    // Pass the AI's recommended day if available, otherwise let store auto-assign
    const dayNumber = recommendation.recommendedDay || null;
    addToSavedAndSync(recommendation, dayNumber);
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
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
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

      {/* Header - Moved to be part of the layout */}
      <div className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="w-5 h-5 text-[var(--color-brand-primary)]" />
              <span className="text-sm font-bold text-[var(--color-brand-primary)] uppercase tracking-wider">{t('recommendations.aiPowered')}</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {destination 
                ? `${destination} ✨`
                : t('recommendations.title')}
            </h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[var(--color-text-secondary)] font-medium">
              {tripData
                ? `${duration} ${t('tripPlanner.days')} • ${groupSize} ${t('tripPlanner.travelers')}`
                : t('home.getAiRecommendations')}
            </p>
            {budget && (
              <p className="text-sm text-[var(--color-text-muted)]">LKR {budget.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Guest Upgrade Banner */}
      {isGuest && (
        <div className="bg-[var(--color-brand-primary)]/5 border-b border-[var(--color-brand-primary)]/20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-brand-primary)]/10 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-[var(--color-brand-primary)]" />
              </div>
              <div>
                <p className="text-[var(--color-brand-primary)] font-medium text-sm">
                  {remainingRecs > 0 
                    ? `You have ${remainingRecs} free recommendation${remainingRecs > 1 ? 's' : ''} left`
                    : 'You\'ve used your free recommendation'}
                </p>
                <p className="text-[var(--color-brand-primary)]/80 text-xs">Sign up for unlimited access</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-brand-primary-hover)] transition-colors flex items-center gap-2"
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

      {/* Main Split-Pane Layout */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)]">
        
        {/* Left Pane - Content (Scrollable) */}
        <div className="w-full lg:w-3/5 xl:w-[55%] flex-shrink-0 order-2 lg:order-1 border-r border-[var(--color-border)]">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-8">
              {/* Preferences Summary Card (Collapsible/Compact) */}
              <div className="card p-5">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer group"
                  onClick={() => setPrefsExpanded(!prefsExpanded)}
                >
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {t('recommendations.tripPreferences')}
                    </h2>
                    {!prefsExpanded && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">
                        {destination || 'Anywhere'} • {duration} {t('tripPlanner.days')} • {groupSize} {t('tripPlanner.travelers')} {budget ? `• LKR ${budget.toLocaleString()}` : ''}
                      </p>
                    )}
                  </div>
                  <button 
                    className="p-2 bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-border)] rounded-lg transition-colors border border-[var(--color-border)]"
                    aria-label={prefsExpanded ? "Collapse preferences" : "Expand preferences"}
                  >
                    {prefsExpanded ? <ChevronUpIcon className="w-4 h-4 text-[var(--color-text-secondary)]" /> : <ChevronDownIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                  </button>
                </div>
              
              {prefsExpanded && (
                <div className="animate-fade-in">
              {/* Locked mode info banner */}
              {isAddMoreMode && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    🔒 <strong>Adding to existing trip</strong> - Preferences are locked. 
                    Create a new trip from Home if you want different settings.
                  </p>
                </div>
              )}

              {/* Destination & Duration Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    <MapPinIcon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    {t('tripPlanner.destination')}
                    {isAddMoreMode && <span className="ml-auto text-xs text-[var(--color-text-muted)]">🔒 Locked</span>}
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">{t('tripPlanner.selectDestination') || 'Select a destination'}</option>
                    {Object.keys(DESTINATIONS).map((dest) => (
                      <option key={dest} value={dest}>{dest}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    <CalendarDaysIcon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    {t('tripPlanner.duration')} ({t('tripPlanner.days')})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {/* Group Size & Budget Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    <UserGroupIcon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    {t('tripPlanner.travelers')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    <CurrencyDollarIcon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    {t('tripPlanner.budgetLKR')}
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value) || 10000)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 ml-1">
                    ≈ ${(budget / 300).toFixed(0)} USD
                  </p>
                </div>
              </div>

              {/* Acc & Transport Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    🏨 Accommodation Type
                    {isAddMoreMode && <span className="ml-2 text-xs text-[var(--color-text-muted)]">🔒</span>}
                  </label>
                  <select
                    value={accommodationType}
                    onChange={(e) => setAccommodationType(e.target.value)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {ACCOMMODATION_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 ml-1">
                    {ACCOMMODATION_TYPES.find(t => t.id === accommodationType)?.description}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 ml-1">
                    🚗 Transport Mode
                    {isAddMoreMode && <span className="ml-2 text-xs text-[var(--color-text-muted)]">🔒</span>}
                  </label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    disabled={isAddMoreMode}
                    className={`w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-border-focus)] outline-none transition-all ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {TRANSPORT_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 ml-1">
                    {TRANSPORT_MODES.find(m => m.id === transportMode)?.description}
                  </p>
                </div>
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
                            ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                            : 'bg-black/5 dark:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/10 dark:hover:bg-white/10'
                        } ${isAddMoreMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <span>{interest.emoji}</span>
                        {t(`interests.${interest.id}`)}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              )}
              </div>

              {/* Recommendations Component injects here */}
              <div className="mt-8">
                <RecommendationPanel
                  destination={destination}
                  interests={interests}
                  budget={budget}
                  duration={duration}
                  groupSize={groupSize}
                  startDate={calculatedStartDate}
                  endDate={calculatedEndDate}
                  accommodationType={accommodationType}
                  transportMode={transportMode}
                  onAddToItinerary={handleAddToItinerary}
                  autoFetch={!!tripData}
                  showFilters={true}
                  allowGenerate={!!tripData}
                  isAddMoreMode={isAddMoreMode}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Right Pane - Standalone Card (Map, Weather, Packing) */}
        <div className="w-full lg:w-2/5 xl:w-[45%] flex-shrink-0 lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] overflow-hidden flex flex-col order-1 lg:order-2 p-3 lg:p-4">
            <div className="flex-1 flex flex-col h-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              {/* Tab navigation */}
              <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] rounded-t-2xl">
                {[
                  { id: 'weather', label: t('weather.title'), icon: <CloudIcon className="w-4 h-4" /> },
                  { id: 'map', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
                  { id: 'packing', label: 'Packing', icon: <PackageIcon className="w-4 h-4" /> },
                ].map((tab) => {
                  const activeTab = showWeather ? 'weather' : showMap ? 'map' : 'packing';
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === 'weather') { setShowWeather(true); setShowMap(false); }
                        else if (tab.id === 'map') { setShowWeather(false); setShowMap(true); }
                        else { setShowWeather(false); setShowMap(false); }
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors border-b-2 ${
                        isActive
                          ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto min-h-[400px] h-full">
                {showMap && (
                  <div className="w-full h-full pb-16 lg:pb-0">
                    <AttractionMap
                      destination={destination}
                    />
                  </div>
                )}
                {showWeather && (
                  <div className="p-4 sm:p-6 pb-20">
                    <WeatherWidget 
                      destinationName={destination} 
                      startDate={calculatedStartDate}
                      endDate={calculatedEndDate}
                      duration={duration}
                    />
                  </div>
                )}
                {!showWeather && !showMap && (
                  <div className="p-4 sm:p-6 pb-20">
                    <PackingListGenerator
                      tripDetails={{ destination, duration, interests, groupSize }}
                      weather={null}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default RecommendationsPage;
