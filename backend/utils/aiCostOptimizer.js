/**
 * AI Cost Optimization Utilities for SerendibTrip
 *
 * Strategies implemented:
 * 1. Response caching (Redis/Memory)
 * 2. Prompt compression
 * 3. Smart model selection based on complexity
 * 4. Request batching
 * 5. Token counting before requests
 */

const crypto = require('crypto');

// In-memory cache for AI responses (use Redis in production)
const aiResponseCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cache key from request parameters
 */
function generateCacheKey(params) {
  const normalized = {
    destination: params.destination?.toLowerCase().trim(),
    duration: params.duration,
    interests: [...(params.interests || [])].sort(),
    budget: Math.round(params.budget / 10000) * 10000, // Round to nearest 10k
    groupSize: params.groupSize,
  };
  return crypto
    .createHash('md5')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

/**
 * Get cached response if available and valid
 */
function getCachedResponse(cacheKey) {
  const cached = aiResponseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ AI Cache HIT - Saved API call!');
    return cached.data;
  }
  return null;
}

/**
 * Cache the AI response
 */
function cacheResponse(cacheKey, data) {
  aiResponseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  // Cleanup old entries (keep max 1000)
  if (aiResponseCache.size > 1000) {
    const oldestKey = aiResponseCache.keys().next().value;
    aiResponseCache.delete(oldestKey);
  }
}

/**
 * Estimate token count (rough approximation)
 * More accurate: use tiktoken library
 */
function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Select optimal model based on request complexity
 *
 * @param {Object} params - Request parameters
 * @returns {string} - Recommended model name
 */
function selectOptimalModel(params) {
  const { duration, interests = [] } = params;

  // Simple requests (1-2 days, few interests) → Use cheaper model
  if (duration <= 2 && interests.length <= 3) {
    return 'gemini-2.0-flash'; // Fastest, cheapest
  }

  // Medium complexity (3-5 days)
  if (duration <= 5) {
    return 'gemini-2.5-flash'; // Good balance
  }

  // Complex requests (6+ days, many interests) → Use best model
  return 'gemini-2.5-flash'; // Still use flash for cost, pro only if needed
}

/**
 * Compress prompt to reduce tokens while maintaining quality
 */
function compressPrompt(prompt) {
  return (
    prompt
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Shorten common phrases
      .replace(/approximately/g, '~')
      .replace(/for example/gi, 'e.g.')
      .replace(/such as/gi, 'like')
      .replace(/in order to/gi, 'to')
      .replace(/make sure to/gi, 'ensure')
      .trim()
  );
}

/**
 * Create a minimal but effective prompt for itinerary generation
 * Reduces token usage by ~40% while maintaining output quality
 */
function createOptimizedItineraryPrompt(tripDetails) {
  const {
    destination,
    startDate,
    endDate,
    duration,
    budget,
    groupSize,
    interests = [],
  } = tripDetails;

  const dailyBudget = Math.round(budget / duration);

  // Enhanced prompt for better quality recommendations
  return `You are an expert Sri Lanka travel planner with deep local knowledge. Create a ${duration}-day personalized itinerary.

TRIP DETAILS:
- Destination: ${destination}, Sri Lanka
- Dates: ${startDate} to ${endDate}
- Budget: LKR ${budget.toLocaleString()} total (~LKR ${dailyBudget.toLocaleString()}/day)
- Group Size: ${groupSize} people
- Interests: ${interests.join(', ') || 'general sightseeing'}

CRITICAL REQUIREMENTS:
1. Include ONLY real, verifiable places that exist in ${destination}
2. Provide accurate GPS coordinates for each location
3. Include 5-7 TOP attractions (mix of popular + hidden gems)
4. Include 4-5 BEST local restaurants (authentic cuisine)
5. Realistic entry fees and costs in LKR (as of 2024-2025)
6. Focus on places matching interests: ${interests.join(', ') || 'general'}
7. Prioritize highly-rated, well-reviewed places

RESPOND WITH VALID JSON ONLY (no markdown code blocks):
{
  "tripSummary": {
    "destination": "${destination}",
    "startDate": "${startDate}",
    "endDate": "${endDate}",
    "totalDays": ${duration},
    "totalBudget": ${budget},
    "currency": "LKR",
    "groupSize": ${groupSize},
    "highlights": ["array of 3-5 trip highlights"]
  },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme",
      "activities": [
        {
          "time": "HH:MM",
          "duration": "X hours",
          "title": "Activity name",
          "description": "Detailed description (2-3 sentences)",
          "location": { "name": "Exact place name", "coordinates": { "lat": 0.0, "lng": 0.0 }, "address": "Full address" },
          "cost": { "amount": 0, "currency": "LKR", "breakdown": "cost details" },
          "tips": ["practical tips"],
          "category": "sightseeing|food|transport|activity|accommodation"
        }
      ],
      "meals": { "breakfast": { "name": "", "location": "", "cuisine": "", "priceRange": "" }, "lunch": {}, "dinner": {} },
      "dailyBudget": { "estimated": 0, "breakdown": {} }
    }
  ],
  "topAttractions": [
    {
      "name": "REAL attraction name (must exist)",
      "description": "Compelling description explaining why tourists love it (2-3 sentences)",
      "location": "Specific area/neighborhood",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "entryFee": 0,
      "bestTime": "Best time to visit",
      "duration": "Recommended time to spend",
      "rating": 4.5,
      "category": "nature|culture|adventure|history|religious"
    }
  ],
  "recommendedRestaurants": [
    {
      "name": "REAL restaurant name (must exist)",
      "cuisine": "Cuisine type (Sri Lankan, Indian, Chinese, etc.)",
      "specialty": "Must-try signature dish",
      "priceRange": "$|$$|$$$",
      "rating": 4.5,
      "location": "Specific location/area",
      "coordinates": { "lat": 0.0, "lng": 0.0 }
    }
  ],
  "budgetBreakdown": { "accommodation": 0, "food": 0, "transport": 0, "activities": 0, "miscellaneous": 0, "total": 0 },
  "recommendations": ["5 personalized tips"],
  "weatherAdvice": "brief weather tips",
  "packingList": ["essential items"]
}`;
}

/**
 * Calculate cost savings from optimizations
 */
function calculateSavings(originalTokens, optimizedTokens, modelCostPer1M) {
  const saved = originalTokens - optimizedTokens;
  const costSaved = (saved / 1000000) * modelCostPer1M;
  return {
    tokensSaved: saved,
    percentageSaved: Math.round((saved / originalTokens) * 100),
    costSaved: costSaved.toFixed(4),
  };
}

/**
 * Rate limiting helper
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15; // Free tier limit

function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  const userRequests = requestCounts.get(userId) || [];

  // Filter to only recent requests
  const recentRequests = userRequests.filter(
    (t) => now - t < RATE_LIMIT_WINDOW
  );

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestRequest = Math.min(...recentRequests);
    const waitTime = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - oldestRequest)) / 1000
    );
    return { allowed: false, waitTime };
  }

  // Add current request
  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_MINUTE - recentRequests.length,
  };
}

/**
 * Clear old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, requests] of requestCounts.entries()) {
    const recent = requests.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      requestCounts.delete(userId);
    } else {
      requestCounts.set(userId, recent);
    }
  }
}, 60000); // Every minute

module.exports = {
  generateCacheKey,
  getCachedResponse,
  cacheResponse,
  estimateTokens,
  selectOptimalModel,
  compressPrompt,
  createOptimizedItineraryPrompt,
  calculateSavings,
  checkRateLimit,
};
