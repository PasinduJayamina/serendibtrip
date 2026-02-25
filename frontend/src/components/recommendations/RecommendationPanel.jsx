import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  MapIcon,
  BuildingStorefrontIcon,
  TicketIcon,
  Squares2X2Icon,
  ChevronUpDownIcon,
  XMarkIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import RecommendationCard from './RecommendationCard';
import {
  useRecommendationInteractions,
  useRecommendationFilters,
} from '../../hooks/useRecommendations';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { useItineraryStore } from '../../store/itineraryStore';
// generateItinerary is now called from the store (survives navigation)
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { filterBlacklisted } from '../../services/blacklistService';

// Loading skeleton component
const RecommendationSkeleton = () => (
  <div className="bg-white rounded-xl border-2 border-gray-100 p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded-full w-20" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
      <div className="h-10 w-10 bg-gray-200 rounded-lg" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
    <div className="flex gap-4 mt-4">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-4 bg-gray-200 rounded w-20" />
      <div className="h-4 bg-gray-200 rounded w-16" />
    </div>
  </div>
);

const RecommendationPanel = ({
  destination,
  interests = [],
  budget,
  duration,
  groupSize = 2,
  startDate,
  endDate,
  accommodationType = 'midrange',
  transportMode = 'tuktuk',
  onAddToItinerary,
  autoFetch = false,
  showFilters = true,
  maxResults,
  className = '',
  allowGenerate = true, // If false, disables manual generate button (must come from trip planner)
}) => {
  const navigate = useNavigate();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // loading and error come from the store (persist across navigation)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Ref to track which destination we've already fetched for (prevents double-fetch/flickering)
  const hasFetchedForDestination = useRef(null);
  
  // Custom accommodation modal state
  const [showCustomAccomModal, setShowCustomAccomModal] = useState(false);
  const [customAccom, setCustomAccom] = useState({ name: '', pricePerNight: '', location: '' });

  // Feature access control for guests
  const { isGuest, isAuthenticated, canUseFeature, recordUsage, getRemainingUsage, getMaxUsage } = useFeatureAccess();
  const aiRecsAccess = canUseFeature('aiRecommendations');
  const remainingRecs = getRemainingUsage('aiRecommendations');
  const maxRecs = getMaxUsage('aiRecommendations');

  // Zustand store for persistent recommendations (per-destination caching)
  const {
    setRecommendations,
    setLoading: setStoreLoading,
    setError: setStoreError,
    getCachedByDestination,
    clearRecommendationsForDestination,
    paramsMatch,
    fetchRecommendations: storeFetch,
    loading,
    error,
  } = useRecommendationsStore();
  
  // Get saved items to filter out from recommendations
  const { savedItems, tripDetails } = useItineraryStore();
  const currentTripId = tripDetails?.tripId;
  
  // Filter out items that are already saved to itinerary for this destination
  // Normalize destination for comparison: tripId uses hyphens (nuwara-eliya-2026...)
  const normalizedDest = destination?.toLowerCase().replace(/\s+/g, '-');
  const savedItemNames = savedItems
    .filter(item => {
      const tripIdLower = item.tripId?.toLowerCase() || '';
      return tripIdLower.includes(normalizedDest) || tripIdLower.includes(destination?.toLowerCase());
    })
    .map(item => item.name?.toLowerCase());

  // Current params - include excludes so AI doesn't suggest already-saved items
  const currentParams = {
    destination,
    interests,
    budget,
    duration,
    groupSize,
    startDate,
    endDate,
    accommodationType,
    transportMode,
    exclude: savedItemNames, // Send saved item names to exclude from AI responses
  };

  // Get cached recommendations for this destination
  const cachedRecommendations = getCachedByDestination(destination);
  
  // Filter cached recommendations to remove already-saved items (for display)
  const filteredCachedRecommendations = cachedRecommendations ? {
    topAttractions: (cachedRecommendations.topAttractions || []).filter(
      rec => !savedItemNames.includes(rec.name?.toLowerCase())
    ),
    recommendedRestaurants: (cachedRecommendations.recommendedRestaurants || []).filter(
      rec => !savedItemNames.includes(rec.name?.toLowerCase())
    ),
    // Preserve new fields for accommodation and transport suggestions
    recommendedAccommodations: cachedRecommendations.recommendedAccommodations || [],
    transportEstimate: cachedRecommendations.transportEstimate || null,
    budgetBreakdown: cachedRecommendations.budgetBreakdown || null,
  } : null;
  
  // Check if we have any recommendations after filtering
  const hasValidCache = filteredCachedRecommendations && 
    ((filteredCachedRecommendations.topAttractions?.length || 0) + 
     (filteredCachedRecommendations.recommendedRestaurants?.length || 0)) > 0;
  
  // Use filtered cached recommendations
  const recommendations = hasValidCache ? filteredCachedRecommendations : null;
  const fromCache = cachedRecommendations && 
    ((cachedRecommendations.topAttractions?.length || 0) + (cachedRecommendations.recommendedRestaurants?.length || 0)) > 0;

  // Fetch recommendations - delegates to the store so it survives navigation
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!destination) return null;

      // If not forcing refresh and we have valid cache, return cached
      if (!forceRefresh && hasValidCache) {
        console.log('Using cached recommendations for:', destination);
        return cachedRecommendations;
      }

      // Check usage limit BEFORE making API call (for both guests and auth users)
      const access = canUseFeature('aiRecommendations');
      if (!access.allowed) {
        if (isGuest) {
          setShowUpgradeModal(true);
        } else {
          setStoreError(`Daily limit reached (${access.reason}). Try again tomorrow.`);
        }
        return null;
      }

      // Call the store's fetch action (survives component unmount)
      const result = await storeFetch(currentParams, { forceRefresh });
      if (result) {
        recordUsage('aiRecommendations');
      }
      return result;
    },
    [
      destination,
      JSON.stringify(currentParams),
      hasValidCache,
      cachedRecommendations,
      storeFetch,
    ]
  );

  // Refetch function (forces refresh) - clears cache and fetches fresh
  const refetch = useCallback(() => {
    // Clear cached recommendations for this destination first
    if (destination) {
      clearRecommendationsForDestination(destination);
      // Reset the fetch tracker so useEffect can trigger again if needed
      hasFetchedForDestination.current = null;
    }
    return fetchRecommendations(true);
  }, [fetchRecommendations, destination, clearRecommendationsForDestination]);

  // Use interaction tracking hook
  const {
    favorites,
    thumbsUp,
    thumbsDown,
    getFeedback,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    trackAddedToItinerary,
  } = useRecommendationInteractions();

  // Extract attractions and restaurants from recommendations
  const rawRecommendations = [
    ...(recommendations?.topAttractions || []).map((r) => ({
      ...r,
      type: 'attraction',
    })),
    ...(recommendations?.recommendedRestaurants || []).map((r) => ({
      ...r,
      type: 'restaurant',
    })),
  ];
  
  // Deduplicate by name (case-insensitive) - AI sometimes generates duplicates
  // Also filter out blacklisted (closed) establishments
  const deduplicatedRecs = rawRecommendations.filter((rec, index, self) => 
    index === self.findIndex(r => r.name?.toLowerCase().trim() === rec.name?.toLowerCase().trim())
  );
  const allRecommendations = filterBlacklisted(deduplicatedRecs);
  
  // Extract accommodations and transport estimates (Phase 3)
  // Filter out blacklisted (closed) establishments
  const accommodations = filterBlacklisted(recommendations?.recommendedAccommodations || []);
  const transportEstimate = recommendations?.transportEstimate || null;
  const budgetBreakdown = recommendations?.budgetBreakdown || null;

  // Use filtering hook
  const {
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    filteredRecommendations,
  } = useRecommendationFilters(allRecommendations);

  // Limit results if maxResults is set
  const displayedRecommendations = maxResults
    ? filteredRecommendations.slice(0, maxResults)
    : filteredRecommendations;

  // Handle add to itinerary
  const handleAddToItinerary = (recommendation) => {
    trackAddedToItinerary(recommendation.name);
    onAddToItinerary?.(recommendation);
  };

  // Handle toggle favorite
  const handleToggleFavorite = (recommendation) => {
    if (isFavorite(recommendation.name)) {
      removeFromFavorites(recommendation.name);
    } else {
      addToFavorites(recommendation);
    }
  };

  // Handle thumbs up
  const handleThumbsUp = (recommendation) => {
    const currentFeedback = getFeedback(recommendation.name);
    if (currentFeedback === 'thumbsUp') {
      // Clear feedback if already thumbs up
      return;
    }
    thumbsUp(recommendation.name);
  };

  // Handle thumbs down
  const handleThumbsDown = (recommendation) => {
    const currentFeedback = getFeedback(recommendation.name);
    if (currentFeedback === 'thumbsDown') {
      return;
    }
    thumbsDown(recommendation.name);
  };

  // Auto-fetch recommendations when autoFetch is true and we have a destination
  // Use ref to prevent double-fetching when callback dependencies change
  useEffect(() => {
    console.log('Auto-fetch check:', { autoFetch, destination, hasRecommendations: !!recommendations, loading, hasValidCache, alreadyFetched: hasFetchedForDestination.current });
    
    // Skip if we've already fetched for this exact destination
    if (hasFetchedForDestination.current === destination) {
      console.log('Already fetched for this destination, skipping');
      return;
    }

    // Skip if a fetch is already running in the store (e.g., user navigated away and came back)
    const activeFetchId = useRecommendationsStore.getState()._activeFetchId;
    if (activeFetchId) {
      console.log('Store has an active fetch in progress, skipping auto-fetch');
      hasFetchedForDestination.current = destination; // Mark so we don't re-trigger
      return;
    }
    
    if (autoFetch && destination && !recommendations && !loading) {
      console.log('Triggering auto-fetch for:', destination);
      hasFetchedForDestination.current = destination; // Mark as fetched BEFORE calling
      fetchRecommendations();
    }
  }, [autoFetch, destination, recommendations, loading, hasValidCache, fetchRecommendations]);

  // Filter type options
  const filterOptions = [
    { value: 'all', label: 'All', icon: Squares2X2Icon },
    { value: 'attractions', label: 'Attractions', icon: MapIcon },
    {
      value: 'restaurants',
      label: 'Restaurants',
      icon: BuildingStorefrontIcon,
    },
    { value: 'activities', label: 'Activities', icon: TicketIcon },
  ];

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'cost-low', label: 'Price: Low to High' },
    { value: 'cost-high', label: 'Price: High to Low' },
  ];

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-600 to-accent-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                AI Recommendations
              </h2>
              <p className="text-secondary-200 text-sm">
                {destination
                  ? `Personalized picks for ${destination}`
                  : 'Enter destination to get recommendations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasValidCache && !loading && (
              <span className="px-2 py-1 bg-white/20 text-white/80 text-xs rounded-full">
                Cached
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={loading || !destination}
              className="flex items-center gap-1 px-3 py-1.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 text-sm"
              title="Get fresh AI recommendations"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Generate button (if not auto-fetch) */}
        {!autoFetch && !recommendations && !loading && destination && allowGenerate && (
          <button
            onClick={() => fetchRecommendations()}
            className="mt-4 w-full py-3 bg-white text-secondary-600 rounded-lg font-semibold hover:bg-secondary-50 transition-colors flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate AI Recommendations
          </button>
        )}

        {/* Message when allowGenerate is false - redirect to Home */}
        {!autoFetch && !recommendations && !loading && !allowGenerate && (
          <div className="mt-4 p-4 bg-white/10 rounded-lg text-center">
            <p className="text-white/90 mb-3">
              Plan your trip to get AI recommendations
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-white text-secondary-600 rounded-lg font-semibold hover:bg-secondary-50 transition-colors"
            >
              Go to Trip Planner
            </button>
          </div>
        )}
      </div>

      {/* Accommodations Section - Phase 3 */}
      {recommendations && accommodations.length > 0 && (
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              🏨 Recommended Accommodations
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Optional</span>
            </h3>
          </div>
          
          {/* Budget Warning - show if budget is insufficient */}
          {recommendations.budgetWarning?.insufficient && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm text-red-700 font-medium">Budget Insufficient for {accommodationType} Accommodation</p>
                  <p className="text-xs text-red-600 mt-1">
                    {recommendations.budgetWarning.message || 
                      `You need LKR ${(recommendations.budgetWarning.shortfall || 0).toLocaleString()} more. 
                       Recommended budget: LKR ${(recommendations.budgetWarning.recommendedBudget || 0).toLocaleString()}`
                    }
                  </p>
                  <p className="text-xs text-red-500 mt-2 italic">
                    💡 Consider increasing your budget or choosing a lower accommodation type.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accommodations.slice(0, 6).map((hotel, index) => {
              const totalCost = (hotel.pricePerNight || 0) * (duration || 1);
              const isHotelSaved = savedItemNames.includes(hotel.name?.toLowerCase());
              
              return (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl p-4 border transition-all shadow-sm hover:shadow-md ${isHotelSaved ? 'border-green-300 bg-green-50' : 'border-amber-200 hover:border-amber-400'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{hotel.name}</h4>
                      {(() => {
                        // Append common hotel parameters to Google Maps link
                        const mapsQuery = hotel.name + ', ' + destination + ', Sri Lanka';
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
                        return (
                          <a 
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1"
                          >
                            📍 {hotel.location}
                          </a>
                        );
                      })()}
                      {hotel.amenities && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hotel.amenities.slice(0, 3).map((amenity, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}
                      {hotel.whyRecommended && (
                        <p className="text-xs text-amber-700 mt-2 italic">
                          {hotel.whyRecommended}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-lg font-bold text-amber-600">
                        LKR {(hotel.pricePerNight || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">/night</div>
                      {hotel.rating && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className="text-yellow-500">★</span>
                          <span className="text-sm font-medium">{hotel.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Verification Button */}
                  {(() => {
                    // Strip room type suffixes like "(Premium Room)" or "(Ocean View Suite)" for cleaner search
                    const cleanHotelName = hotel.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
                    // Include destination to avoid finding same-named hotels in other countries/cities
                    let bookingParams = `ss=${encodeURIComponent(cleanHotelName + ', ' + destination + ', Sri Lanka')}&label=serendibtrip`;
                    
                    if (startDate) {
                      bookingParams += `&checkin=${startDate}`;
                    }
                    if (endDate) {
                      bookingParams += `&checkout=${endDate}`;
                    }
                    
                    if (groupSize) {
                      const numRooms = Math.ceil(groupSize / 2);
                      bookingParams += `&group_adults=${groupSize}&req_adults=${groupSize}&no_rooms=${numRooms}`;
                    }
                    const bookingUrl = `https://www.booking.com/searchresults.html?${bookingParams}`;
                    return (
                      <div className="mt-2 flex gap-2">
                        <a
                          href={bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                          title={`Search for ${cleanHotelName} on Booking.com`}
                        >
                          🔍 Verify on Booking.com
                        </a>
                      </div>
                    );
                  })()}
                  
                  {/* Add to Itinerary button */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Total: <span className="font-semibold text-amber-600">LKR {totalCost.toLocaleString()}</span> 
                      <span className="text-gray-400"> ({duration || 1} night{(duration || 1) > 1 ? 's' : ''})</span>
                    </div>
                    <button
                      onClick={() => onAddToItinerary && onAddToItinerary({
                        ...hotel,
                        type: 'accommodation',
                        category: 'accommodation',
                        entryFee: hotel.pricePerNight || 0, // Per night cost
                        cost: hotel.pricePerNight || 0, // Per night cost
                        totalCost: totalCost, // Store total for reference
                        showOnAllDays: true, // Flag to show on all days
                        description: `${hotel.name} - ${hotel.type || 'Hotel'} accommodation`,
                      })}
                      disabled={isHotelSaved}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        isHotelSaved 
                          ? 'bg-green-100 text-green-600 cursor-default' 
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {isHotelSaved ? '✓ Added' : '+ Add to Itinerary'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Enhanced Disclaimer */}
          <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
            <p className="text-sm text-amber-800 font-medium text-center mb-2">
              ⚠️ Prices are AI estimates and may differ significantly from actual booking prices
            </p>
            <div className="flex justify-center gap-3 text-xs">
              <a
                href={(() => {
                  let params = `ss=${encodeURIComponent(destination + ', Sri Lanka')}&label=serendibtrip`;
                  
                  if (startDate) {
                    params += `&checkin=${startDate}`;
                  }
                  if (endDate) {
                    params += `&checkout=${endDate}`;
                  }
                  
                  if (groupSize) {
                    const numRooms = Math.ceil(groupSize / 2);
                    params += `&group_adults=${groupSize}&req_adults=${groupSize}&no_rooms=${numRooms}`;
                  }
                  return `https://www.booking.com/searchresults.html?${params}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                🔍 Search on Booking.com
              </a>
              <a
                href={`https://www.agoda.com/city/${destination.toLowerCase().replace(/\s+/g, '-')}-lk.html`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                🔍 Search on Agoda
              </a>
            </div>
          </div>
          
          {/* Add Custom Accommodation Button */}
          <button
            onClick={() => setShowCustomAccomModal(true)}
            className="mt-3 w-full py-2 bg-white border-2 border-dashed border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:border-amber-400 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            ➕ Add Your Own Accommodation
          </button>
        </div>
      )}

      {/* Transport & Budget Summary - Phase 3 */}
      {recommendations && (transportEstimate || budgetBreakdown) && (
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {transportEstimate && (() => {
              // Use user's selected transportMode, fallback to AI's estimate mode
              const transportName = transportMode === 'public' ? 'Public Transport' 
                : transportMode === 'private' ? 'Private Car'
                : transportMode === 'tuktuk' ? 'Tuk-Tuk'
                : transportMode === 'mix' ? 'Mixed Transport'
                : transportEstimate.mode;
              const transportTotalCost = (transportEstimate.dailyCost || 0) * (duration || 1);
              const tripDuration = duration || 1;
              
              // Check if transport for the CURRENT trip is already saved (not other trips to same destination)
              const hasTransportSaved = currentTripId 
                ? savedItems.some(item => item.tripId === currentTripId && item.name?.toLowerCase().includes('transport'))
                : savedItemNames.some(name => name?.includes('transport'));
              
              // Function to add transport for ALL days
              const addTransportForAllDays = () => {
                if (!onAddToItinerary) return;
                
                // Create separate transport item for each day
                for (let day = 1; day <= tripDuration; day++) {
                  const transportItem = {
                    name: `Transport Day ${day} - ${transportName}`,
                    type: 'transport',
                    category: 'transport',
                    entryFee: transportEstimate.dailyCost || 0,
                    cost: transportEstimate.dailyCost || 0,
                    recommendedDay: day,
                    description: `${transportName} for Day ${day}. Edit price if needed.`,
                    location: destination,
                  };
                  onAddToItinerary(transportItem);
                }
              };
              
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚗</span>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Transport: </span>
                    <span className="text-sm text-blue-600 font-semibold">
                      ~LKR {(transportEstimate.dailyCost || 0).toLocaleString()}/day
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({transportName})
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      Total: LKR {transportTotalCost.toLocaleString()} ({tripDuration} days)
                    </span>
                  </div>
                  <button
                    onClick={addTransportForAllDays}
                    disabled={hasTransportSaved}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      hasTransportSaved 
                        ? 'bg-green-100 text-green-600 cursor-default' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {hasTransportSaved ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              );
            })()}
            {budgetBreakdown && (
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <span className="text-gray-500">Estimated Budget:</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                  🏨 {(budgetBreakdown.accommodation || 0).toLocaleString()}
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                  🍽️ {(budgetBreakdown.food || 0).toLocaleString()}
                </span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                  🚗 {(budgetBreakdown.transport || 0).toLocaleString()}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  🎫 {(budgetBreakdown.activities || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && recommendations && (
        <div className="border-b border-gray-100">
          {/* Filter bar */}
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recommendations..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter & Sort buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                  showFilterPanel || filterType !== 'all'
                    ? 'border-secondary-500 bg-secondary-50 text-secondary-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                Filter
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter panel (expandable) */}
          {showFilterPanel && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filterType === option.value
                        ? 'bg-secondary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-8 h-8 border-4 border-secondary-200 border-t-secondary-600 rounded-full animate-spin" />
              <p className="text-gray-600">
                Generating personalized recommendations...
              </p>
            </div>
            {[1, 2, 3].map((i) => (
              <RecommendationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Get Recommendations
            </h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded-lg font-medium hover:bg-secondary-700 transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !recommendations && destination && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
              <SparklesIcon className="w-8 h-8 text-secondary-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Explore {destination}?
            </h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Click the button above to generate AI-powered recommendations
              tailored to your interests and budget.
            </p>
          </div>
        )}

        {/* No destination state */}
        {!destination && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <MapIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Choose a Destination
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select your destination to get personalized AI recommendations for
              attractions, restaurants, and activities.
            </p>
          </div>
        )}

        {/* Recommendations list */}
        {!loading && !error && recommendations && (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Showing {displayedRecommendations.length} of{' '}
                {filteredRecommendations.length} recommendations
              </p>
              {favorites.length > 0 && (
                <span className="text-sm text-secondary-600 font-medium">
                  {favorites.length} saved
                </span>
              )}
            </div>

            {/* No results after filter */}
            {displayedRecommendations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No recommendations match your filters.{' '}
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setSearchQuery('');
                    }}
                    className="text-secondary-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </p>
              </div>
            )}

            {/* Cards grid */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {displayedRecommendations.map((rec, index) => (
                <RecommendationCard
                  key={rec.name || index}
                  recommendation={rec}
                  onAddToItinerary={handleAddToItinerary}
                  onToggleFavorite={handleToggleFavorite}
                  onThumbsUp={handleThumbsUp}
                  onThumbsDown={handleThumbsDown}
                  isFavorite={isFavorite(rec.name)}
                  feedback={getFeedback(rec.name)}
                />
              ))}
            </div>

            {/* Trip summary */}
            {recommendations?.tripSummary && (
              <div className="mt-6 p-4 bg-gradient-to-r from-secondary-50 to-indigo-50 rounded-xl">
                <h4 className="font-semibold text-secondary-900 mb-2">
                  ✨ {recommendations.tripSummary.overallTheme}
                </h4>
                <p className="text-sm text-secondary-700">
                  {recommendations.tripSummary.bestTimeToVisit}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guest Upgrade Modal */}
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
                <XMarkIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <LockClosedIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Free Limit Reached</h3>
                  <p className="text-sm text-white/80">Create an account for more</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 text-sm mb-4">
                You've used your {maxRecs} free AI recommendation. Sign up to get:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-secondary-500" />
                  5 AI recommendations per day
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-secondary-500" />
                  Save trips & itineraries
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
      
      {/* Custom Accommodation Modal */}
      {showCustomAccomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Add Your Own Accommodation</h3>
              <button
                onClick={() => setShowCustomAccomModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Add a hotel you've researched on Booking.com or Agoda with verified pricing.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name *</label>
                <input
                  type="text"
                  value={customAccom.name}
                  onChange={(e) => setCustomAccom({ ...customAccom, name: e.target.value })}
                  placeholder="e.g., Grand Hotel Nuwara Eliya"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Night (LKR) *</label>
                <input
                  type="number"
                  value={customAccom.pricePerNight}
                  onChange={(e) => setCustomAccom({ ...customAccom, pricePerNight: e.target.value })}
                  placeholder="e.g., 25000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={customAccom.location}
                  onChange={(e) => setCustomAccom({ ...customAccom, location: e.target.value })}
                  placeholder="e.g., City Center, Nuwara Eliya"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomAccomModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customAccom.name && customAccom.pricePerNight && onAddToItinerary) {
                    const price = parseInt(customAccom.pricePerNight) || 0;
                    onAddToItinerary({
                      name: customAccom.name,
                      type: 'accommodation',
                      category: 'accommodation',
                      pricePerNight: price,
                      entryFee: price,
                      cost: price,
                      totalCost: price * (duration || 1),
                      location: customAccom.location || destination,
                      showOnAllDays: true,
                      description: `${customAccom.name} - Custom accommodation (verified by user)`,
                      whyRecommended: 'Added manually with verified pricing',
                    });
                    setCustomAccom({ name: '', pricePerNight: '', location: '' });
                    setShowCustomAccomModal(false);
                  }
                }}
                disabled={!customAccom.name || !customAccom.pricePerNight}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add to Itinerary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
