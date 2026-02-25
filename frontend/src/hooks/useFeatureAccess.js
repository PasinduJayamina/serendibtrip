import { useCallback, useMemo } from 'react';
import { useUserStore } from '../store/userStore';

/**
 * Feature access levels and limits for SerendibTrip
 * Controls what features are available to guest vs logged-in users
 * 
 * GUEST USERS: Limited access to incentivize signup
 * - 3 AI chat messages per session
 * - 1 AI recommendation request per session
 * - Can view recommendations but not save
 * - Can see sample packing list but not customize
 * 
 * LOGGED-IN USERS: Full access with daily limits (API cost control)
 * - 20 AI chat messages per day
 * - 5 AI recommendation requests per day
 * - 10 active trips max
 * - 50 items per trip max
 * 
 * DEV/TESTING MODE: Set localStorage.setItem('devMode', 'true') to bypass all limits
 * Toggle in console: localStorage.setItem('devMode', 'true') or localStorage.removeItem('devMode')
 */

// Check if dev mode is enabled (bypasses all limits for testing)
const isDevMode = () => {
  try {
    return localStorage.getItem('devMode') === 'true';
  } catch {
    return false;
  }
};

// Feature limits configuration
const FEATURE_LIMITS = {
  guest: {
    aiChat: {
      enabled: true,  // Allow with limits
      maxMessagesPerSession: 3,
      reason: 'Sign in for unlimited AI chat assistance'
    },
    aiRecommendations: {
      enabled: true,  // Allow with limits
      maxRequestsPerSession: 1,
      reason: 'Sign in to explore all destinations and get more recommendations'
    },
    packingList: {
      enabled: true,  // Allow sample view
      canGenerate: false,
      reason: 'Sign in to generate personalized packing lists'
    },
    weatherAlerts: {
      enabled: false,
      reason: 'Sign in to receive weather alerts'
    },
    saveTrip: {
      enabled: false,
      reason: 'Sign in to save your trips'
    },
    addToItinerary: {
      enabled: false,
      reason: 'Sign in to build your itinerary'
    },
    favorites: {
      enabled: false,
      reason: 'Sign in to save favorites'
    },
    tripPlanner: {
      enabled: true,
      canSubmit: true,  // Allow submit but show upgrade after
      showUpgradeAfter: true,
      reason: 'Sign in to save and manage your trip'
    },
    viewMap: {
      enabled: true
    },
    viewWeather: {
      enabled: true
    },
    viewRecommendations: {
      enabled: true,  // Can view but not save
      canSave: false,
      reason: 'Sign in to save recommendations to your itinerary'
    }
  },
  // TODO: REDUCE THESE FOR PRODUCTION - Currently set high for development testing
  authenticated: {
    aiChat: {
      enabled: true,
      maxMessagesPerDay: 999, // DEV: was 20
      reason: 'Daily limit reached. Try again tomorrow!'
    },
    aiRecommendations: {
      enabled: true,
      maxRequestsPerDay: 999, // DEV: was 5
      cacheHours: 24,
      reason: 'Daily limit reached. Recommendations are cached for 24 hours.'
    },
    packingList: {
      enabled: true,
      canGenerate: true,
      maxGenerationsPerTrip: 3,
      reason: 'Maximum regenerations reached for this trip'
    },
    weatherAlerts: {
      enabled: true
    },
    saveTrip: {
      enabled: true,
      maxActiveTrips: 10,
      reason: 'Maximum 10 active trips allowed'
    },
    addToItinerary: {
      enabled: true,
      maxItemsPerTrip: 50,
      reason: 'Maximum 50 items per trip'
    },
    favorites: {
      enabled: true,
      maxFavorites: 100,
      reason: 'Maximum 100 favorites allowed'
    },
    tripPlanner: {
      enabled: true,
      canSubmit: true,
      showUpgradeAfter: false
    },
    viewMap: {
      enabled: true
    },
    viewWeather: {
      enabled: true
    },
    viewRecommendations: {
      enabled: true,
      canSave: true
    }
  }
};

// Session storage keys for tracking usage (guests use session, auth uses localStorage)
const USAGE_KEYS = {
  // Authenticated user daily limits (localStorage) - will be prefixed with user ID
  AI_CHAT_COUNT: 'ai_chat_count',
  AI_CHAT_DATE: 'ai_chat_date',
  AI_REC_COUNT: 'ai_rec_count',
  AI_REC_DATE: 'ai_rec_date',
  // Guest session limits (sessionStorage)
  GUEST_CHAT_COUNT: 'serendibtrip_guest_chat',
  GUEST_REC_COUNT: 'serendibtrip_guest_rec'
};

/**
 * Get today's date as YYYY-MM-DD string
 */
const getTodayString = () => new Date().toISOString().split('T')[0];

/**
 * Get user-specific localStorage key
 */
const getUserKey = (userId, key) => `serendibtrip_${userId}_${key}`;

/**
 * Get or reset daily usage count (for authenticated users)
 * @param {string} countKey - The base key for count
 * @param {string} dateKey - The base key for date
 * @param {string} userId - The user's ID to make keys unique per user
 */
const getDailyUsage = (countKey, dateKey, userId) => {
  if (!userId) return 0;
  
  const userCountKey = getUserKey(userId, countKey);
  const userDateKey = getUserKey(userId, dateKey);
  
  const today = getTodayString();
  const storedDate = localStorage.getItem(userDateKey);
  
  if (storedDate !== today) {
    // Reset count for new day
    localStorage.setItem(userDateKey, today);
    localStorage.setItem(userCountKey, '0');
    return 0;
  }
  
  return parseInt(localStorage.getItem(userCountKey) || '0', 10);
};

/**
 * Increment daily usage count (for authenticated users)
 * @param {string} countKey - The base key for count
 * @param {string} dateKey - The base key for date
 * @param {string} userId - The user's ID to make keys unique per user
 */
const incrementDailyUsage = (countKey, dateKey, userId) => {
  if (!userId) return 0;
  
  const userCountKey = getUserKey(userId, countKey);
  const userDateKey = getUserKey(userId, dateKey);
  
  const today = getTodayString();
  localStorage.setItem(userDateKey, today);
  const current = parseInt(localStorage.getItem(userCountKey) || '0', 10);
  localStorage.setItem(userCountKey, String(current + 1));
  return current + 1;
};

/**
 * Get session usage count (for guests)
 */
const getSessionUsage = (key) => {
  return parseInt(sessionStorage.getItem(key) || '0', 10);
};

/**
 * Increment session usage count (for guests)
 */
const incrementSessionUsage = (key) => {
  const current = getSessionUsage(key);
  sessionStorage.setItem(key, String(current + 1));
  return current + 1;
};

/**
 * Custom hook for feature access control
 * Returns feature availability and helper functions
 */
export const useFeatureAccess = () => {
  const { isAuthenticated, user } = useUserStore();
  
  // Get the appropriate limits based on auth state
  const limits = useMemo(() => 
    isAuthenticated ? FEATURE_LIMITS.authenticated : FEATURE_LIMITS.guest,
    [isAuthenticated]
  );

  /**
   * Check if a feature is available
   * @param {string} featureName - Name of the feature to check
   * @returns {object} { allowed: boolean, reason: string, remaining?: number, showUpgrade?: boolean }
   */
  const canUseFeature = useCallback((featureName) => {
    // DEV MODE BYPASS - Unlimited access for testing
    if (isDevMode()) {
      return { allowed: true, remaining: 999, devMode: true };
    }

    const feature = limits[featureName];
    const userId = user?.id || user?._id;
    
    if (!feature) {
      return { allowed: false, reason: 'Unknown feature' };
    }

    if (!feature.enabled) {
      return { allowed: false, reason: feature.reason, showUpgrade: true };
    }

    // Check specific limits based on auth state
    if (isAuthenticated && userId) {
      // Authenticated user daily limits (user-specific)
      switch (featureName) {
        case 'aiChat': {
          const used = getDailyUsage(USAGE_KEYS.AI_CHAT_COUNT, USAGE_KEYS.AI_CHAT_DATE, userId);
          const remaining = feature.maxMessagesPerDay - used;
          if (remaining <= 0) {
            return { allowed: false, reason: feature.reason, remaining: 0 };
          }
          return { allowed: true, remaining };
        }
        
        case 'aiRecommendations': {
          const used = getDailyUsage(USAGE_KEYS.AI_REC_COUNT, USAGE_KEYS.AI_REC_DATE, userId);
          const remaining = feature.maxRequestsPerDay - used;
          if (remaining <= 0) {
            return { allowed: false, reason: feature.reason, remaining: 0, useCache: true };
          }
          return { allowed: true, remaining };
        }
        
        default:
          return { allowed: true };
      }
    } else {
      // Guest session limits
      switch (featureName) {
        case 'aiChat': {
          const used = getSessionUsage(USAGE_KEYS.GUEST_CHAT_COUNT);
          const remaining = feature.maxMessagesPerSession - used;
          if (remaining <= 0) {
            return { 
              allowed: false, 
              reason: feature.reason, 
              remaining: 0, 
              showUpgrade: true,
              limitReached: true 
            };
          }
          return { allowed: true, remaining, isGuest: true };
        }
        
        case 'aiRecommendations': {
          const used = getSessionUsage(USAGE_KEYS.GUEST_REC_COUNT);
          const remaining = feature.maxRequestsPerSession - used;
          if (remaining <= 0) {
            return { 
              allowed: false, 
              reason: feature.reason, 
              remaining: 0, 
              showUpgrade: true,
              limitReached: true,
              useCache: true 
            };
          }
          return { allowed: true, remaining, isGuest: true };
        }

        case 'addToItinerary':
        case 'saveTrip':
        case 'favorites':
          return { allowed: false, reason: feature.reason, showUpgrade: true };

        case 'viewRecommendations':
          return { allowed: true, canSave: false, showUpgrade: true };

        case 'tripPlanner':
          return { 
            allowed: true, 
            canSubmit: feature.canSubmit, 
            showUpgradeAfter: feature.showUpgradeAfter 
          };
        
        default:
          return { allowed: feature.enabled !== false };
      }
    }
  }, [isAuthenticated, limits, user]);

  /**
   * Record usage of a feature (for rate limiting)
   * @param {string} featureName - Name of the feature used
   */
  const recordUsage = useCallback((featureName) => {
    const userId = user?.id || user?._id;
    
    if (isAuthenticated && userId) {
      switch (featureName) {
        case 'aiChat':
          incrementDailyUsage(USAGE_KEYS.AI_CHAT_COUNT, USAGE_KEYS.AI_CHAT_DATE, userId);
          break;
        case 'aiRecommendations':
          incrementDailyUsage(USAGE_KEYS.AI_REC_COUNT, USAGE_KEYS.AI_REC_DATE, userId);
          break;
      }
    } else {
      switch (featureName) {
        case 'aiChat':
          incrementSessionUsage(USAGE_KEYS.GUEST_CHAT_COUNT);
          break;
        case 'aiRecommendations':
          incrementSessionUsage(USAGE_KEYS.GUEST_REC_COUNT);
          break;
      }
    }
  }, [isAuthenticated, user]);

  /**
   * Get remaining usage for a feature
   * @param {string} featureName - Name of the feature
   * @returns {number|null} Remaining uses, or null if unlimited
   */
  const getRemainingUsage = useCallback((featureName) => {
    const feature = limits[featureName];
    const userId = user?.id || user?._id;
    if (!feature) return null;

    if (isAuthenticated && userId) {
      switch (featureName) {
        case 'aiChat': {
          const used = getDailyUsage(USAGE_KEYS.AI_CHAT_COUNT, USAGE_KEYS.AI_CHAT_DATE, userId);
          return Math.max(0, feature.maxMessagesPerDay - used);
        }
        case 'aiRecommendations': {
          const used = getDailyUsage(USAGE_KEYS.AI_REC_COUNT, USAGE_KEYS.AI_REC_DATE, userId);
          return Math.max(0, feature.maxRequestsPerDay - used);
        }
        default:
          return null;
      }
    } else {
      switch (featureName) {
        case 'aiChat': {
          const used = getSessionUsage(USAGE_KEYS.GUEST_CHAT_COUNT);
          return Math.max(0, feature.maxMessagesPerSession - used);
        }
        case 'aiRecommendations': {
          const used = getSessionUsage(USAGE_KEYS.GUEST_REC_COUNT);
          return Math.max(0, feature.maxRequestsPerSession - used);
        }
        default:
          return null;
      }
    }
  }, [isAuthenticated, limits, user]);

  /**
   * Get max usage for a feature (for display purposes)
   */
  const getMaxUsage = useCallback((featureName) => {
    const feature = limits[featureName];
    if (!feature) return null;

    if (isAuthenticated) {
      switch (featureName) {
        case 'aiChat':
          return feature.maxMessagesPerDay;
        case 'aiRecommendations':
          return feature.maxRequestsPerDay;
        default:
          return null;
      }
    } else {
      switch (featureName) {
        case 'aiChat':
          return feature.maxMessagesPerSession;
        case 'aiRecommendations':
          return feature.maxRequestsPerSession;
        default:
          return null;
      }
    }
  }, [isAuthenticated, limits]);

  return {
    isAuthenticated,
    isGuest: !isAuthenticated,
    limits,
    canUseFeature,
    recordUsage,
    getRemainingUsage,
    getMaxUsage,
    user
  };
};

export default useFeatureAccess;
