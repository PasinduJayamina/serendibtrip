import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateItinerary,
  generateActivityRecommendations,
  generateFoodRecommendations,
} from '../services/recommendationsApi';

// Simple in-memory cache
const recommendationCache = new Map();

// Generate cache key from params
const getCacheKey = (type, params) => {
  return `${type}:${JSON.stringify(params)}`;
};

// Check if cache is still valid (10 minutes)
const isCacheValid = (timestamp) => {
  const TEN_MINUTES = 10 * 60 * 1000;
  return Date.now() - timestamp < TEN_MINUTES;
};

/**
 * Custom hook for fetching AI-powered recommendations
 * @param {Object} params - Parameters for recommendations
 * @param {string} params.destination - Trip destination
 * @param {string[]} params.interests - User interests
 * @param {number} params.budget - Trip budget
 * @param {number} params.duration - Trip duration in days
 * @param {number} params.groupSize - Number of travelers
 * @param {string} params.startDate - Trip start date
 * @param {string} params.endDate - Trip end date
 * @param {string} params.type - Type of recommendations ('itinerary' | 'activities' | 'food')
 * @param {boolean} params.enabled - Whether to auto-fetch on mount
 */
export const useRecommendations = ({
  destination,
  interests = [],
  budget,
  duration,
  groupSize = 2,
  startDate,
  endDate,
  type = 'itinerary',
  enabled = false,
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const abortControllerRef = useRef(null);

  // Build params object
  const params = {
    destination,
    interests,
    budget,
    duration,
    groupSize,
    startDate,
    endDate,
  };

  // Fetch recommendations
  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!destination) {
        setError('Destination is required');
        return null;
      }

      const cacheKey = getCacheKey(type, params);

      // Check cache first (unless forcing refresh)
      if (!forceRefresh && recommendationCache.has(cacheKey)) {
        const cached = recommendationCache.get(cacheKey);
        if (isCacheValid(cached.timestamp)) {
          setRecommendations(cached.data);
          setFromCache(true);
          setLoading(false);
          return cached.data;
        }
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setFromCache(false);

      try {
        let response;

        switch (type) {
          case 'itinerary':
            response = await generateItinerary(params);
            break;
          case 'activities':
            response = await generateActivityRecommendations(params);
            break;
          case 'food':
            response = await generateFoodRecommendations(params);
            break;
          default:
            response = await generateItinerary(params);
        }

        if (response.success) {
          const data = response.data;
          setRecommendations(data);

          // Cache the result
          recommendationCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });

          return data;
        } else {
          throw new Error(response.error || 'Failed to get recommendations');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return null;
        }

        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Failed to fetch recommendations';
        setError(errorMessage);
        console.error('Recommendations error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [destination, type, JSON.stringify(params)]
  );

  // Refetch function (forces refresh)
  const refetch = useCallback(() => {
    return fetchRecommendations(true);
  }, [fetchRecommendations]);

  // Clear cache for this query
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey(type, params);
    recommendationCache.delete(cacheKey);
  }, [type, JSON.stringify(params)]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (enabled && destination) {
      fetchRecommendations();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, destination]);

  return {
    recommendations,
    loading,
    error,
    fromCache,
    fetch: fetchRecommendations,
    refetch,
    clearCache,
  };
};

/**
 * Hook for managing recommendation interactions (thumbs up/down, favorites)
 */
export const useRecommendationInteractions = () => {
  const [interactions, setInteractions] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('recommendation_interactions');
    return saved ? JSON.parse(saved) : {};
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('recommendation_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Save interactions to localStorage
  useEffect(() => {
    localStorage.setItem(
      'recommendation_interactions',
      JSON.stringify(interactions)
    );
  }, [interactions]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('recommendation_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Record thumbs up
  const thumbsUp = useCallback((recommendationId) => {
    setInteractions((prev) => ({
      ...prev,
      [recommendationId]: {
        ...prev[recommendationId],
        feedback: 'thumbsUp',
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Record thumbs down
  const thumbsDown = useCallback((recommendationId) => {
    setInteractions((prev) => ({
      ...prev,
      [recommendationId]: {
        ...prev[recommendationId],
        feedback: 'thumbsDown',
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Clear feedback
  const clearFeedback = useCallback((recommendationId) => {
    setInteractions((prev) => {
      const newInteractions = { ...prev };
      if (newInteractions[recommendationId]) {
        delete newInteractions[recommendationId].feedback;
      }
      return newInteractions;
    });
  }, []);

  // Get feedback for a recommendation
  const getFeedback = useCallback(
    (recommendationId) => {
      return interactions[recommendationId]?.feedback || null;
    },
    [interactions]
  );

  // Add to favorites
  const addToFavorites = useCallback((recommendation) => {
    setFavorites((prev) => {
      // Check if already in favorites
      if (
        prev.some(
          (f) => f.id === recommendation.id || f.name === recommendation.name
        )
      ) {
        return prev;
      }
      return [...prev, { ...recommendation, savedAt: Date.now() }];
    });
  }, []);

  // Remove from favorites
  const removeFromFavorites = useCallback((recommendationId) => {
    setFavorites((prev) =>
      prev.filter(
        (f) => f.id !== recommendationId && f.name !== recommendationId
      )
    );
  }, []);

  // Check if recommendation is in favorites
  const isFavorite = useCallback(
    (recommendationId) => {
      return favorites.some(
        (f) => f.id === recommendationId || f.name === recommendationId
      );
    },
    [favorites]
  );

  // Track that user viewed a recommendation
  const trackView = useCallback((recommendationId) => {
    setInteractions((prev) => ({
      ...prev,
      [recommendationId]: {
        ...prev[recommendationId],
        viewed: true,
        viewedAt: Date.now(),
      },
    }));
  }, []);

  // Track that user added recommendation to itinerary
  const trackAddedToItinerary = useCallback((recommendationId) => {
    setInteractions((prev) => ({
      ...prev,
      [recommendationId]: {
        ...prev[recommendationId],
        addedToItinerary: true,
        addedAt: Date.now(),
      },
    }));
  }, []);

  return {
    interactions,
    favorites,
    thumbsUp,
    thumbsDown,
    clearFeedback,
    getFeedback,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    trackView,
    trackAddedToItinerary,
  };
};

/**
 * Hook for filtering and sorting recommendations
 */
export const useRecommendationFilters = (recommendations) => {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'attractions' | 'restaurants' | 'activities'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'rating' | 'cost-low' | 'cost-high'
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recommendations
  const filteredRecommendations = useCallback(() => {
    if (!recommendations) return [];

    let filtered = Array.isArray(recommendations) ? [...recommendations] : [];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((rec) => {
        const category = rec.category?.toLowerCase() || '';
        const type = rec.type?.toLowerCase() || '';

        switch (filterType) {
          case 'attractions':
            return (
              category.includes('culture') ||
              category.includes('nature') ||
              category.includes('adventure') ||
              type === 'attraction'
            );
          case 'restaurants':
            return category.includes('food') || type === 'restaurant';
          case 'activities':
            return (
              category.includes('activity') ||
              category.includes('entertainment') ||
              type === 'activity'
            );
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rec) =>
          rec.name?.toLowerCase().includes(query) ||
          rec.description?.toLowerCase().includes(query) ||
          rec.location?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'cost-low':
        filtered.sort(
          (a, b) => (a.cost || a.entryFee || 0) - (b.cost || b.entryFee || 0)
        );
        break;
      case 'cost-high':
        filtered.sort(
          (a, b) => (b.cost || b.entryFee || 0) - (a.cost || a.entryFee || 0)
        );
        break;
      case 'relevance':
      default:
        // Keep original order (relevance from AI)
        break;
    }

    return filtered;
  }, [recommendations, filterType, sortBy, searchQuery]);

  return {
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    filteredRecommendations: filteredRecommendations(),
  };
};

export default useRecommendations;
