import { useState, useEffect, useCallback } from 'react';
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
import { generateItinerary } from '../../services/recommendationsApi';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';

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
  onAddToItinerary,
  autoFetch = false,
  showFilters = true,
  maxResults,
  className = '',
  allowGenerate = true, // If false, disables manual generate button (must come from trip planner)
}) => {
  const navigate = useNavigate();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
    paramsMatch,
  } = useRecommendationsStore();
  
  // Get saved items to filter out from recommendations
  const { savedItems } = useItineraryStore();
  
  // Filter out items that are already saved to itinerary for this destination
  const savedItemNames = savedItems
    .filter(item => item.tripId?.toLowerCase().includes(destination?.toLowerCase()))
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
  } : null;
  
  // Check if we have any recommendations after filtering
  const hasValidCache = filteredCachedRecommendations && 
    ((filteredCachedRecommendations.topAttractions?.length || 0) + 
     (filteredCachedRecommendations.recommendedRestaurants?.length || 0)) > 0;
  
  // Use filtered cached recommendations
  const recommendations = hasValidCache ? filteredCachedRecommendations : null;
  const fromCache = cachedRecommendations && 
    ((cachedRecommendations.topAttractions?.length || 0) + (cachedRecommendations.recommendedRestaurants?.length || 0)) > 0;

  // Fetch recommendations function
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!destination) {
        setError('Destination is required');
        return null;
      }

      // If not forcing refresh and we have valid cache, return cached
      if (!forceRefresh && hasValidCache) {
        return storedRecommendations;
      }

      // Check usage limit BEFORE making API call (for both guests and auth users)
      const access = canUseFeature('aiRecommendations');
      if (!access.allowed) {
        if (isGuest) {
          setShowUpgradeModal(true);
        } else {
          setError(`Daily limit reached (${access.reason}). Try again tomorrow.`);
        }
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await generateItinerary(currentParams);

        if (response.success) {
          const data = response.data;
          // Record usage AFTER successful API call
          recordUsage('aiRecommendations');
          // Save to Zustand store (persisted)
          setRecommendations(data, currentParams);
          setLoading(false);
          return data;
        } else {
          throw new Error(response.error || 'Failed to get recommendations');
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Failed to fetch recommendations';
        setError(errorMessage);
        setLoading(false);
        return null;
      }
    },
    [
      destination,
      JSON.stringify(currentParams),
      hasValidCache,
      cachedRecommendations,
    ]
  );

  // Refetch function (forces refresh)
  const refetch = useCallback(() => {
    return fetchRecommendations(true);
  }, [fetchRecommendations]);

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
  const allRecommendations = [
    ...(recommendations?.topAttractions || []).map((r) => ({
      ...r,
      type: 'attraction',
    })),
    ...(recommendations?.recommendedRestaurants || []).map((r) => ({
      ...r,
      type: 'restaurant',
    })),
  ];

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
  useEffect(() => {
    console.log('Auto-fetch check:', { autoFetch, destination, hasRecommendations: !!recommendations, loading, hasValidCache });
    if (autoFetch && destination && !recommendations && !loading) {
      console.log('Triggering auto-fetch for:', destination);
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
            {hasValidCache && (
              <span className="px-2 py-1 bg-white/20 text-white/80 text-xs rounded-full">
                {fromCache ? 'Cached' : 'Cached'}
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={loading || !destination}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh recommendations"
            >
              <ArrowPathIcon
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              />
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
    </div>
  );
};

export default RecommendationPanel;
