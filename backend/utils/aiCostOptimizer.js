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
    // CRITICAL: Include accommodation type and transport mode in cache key
    // so different preferences get different cached results
    accommodationType: params.accommodationType || 'midrange',
    transportMode: params.transportMode || 'tuktuk',
    // Include excludes in cache key so refreshes with different excludes get new results
    exclude: [...(params.exclude || [])].sort(),
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
    exclude = [], // Items already saved that should be excluded
    accommodationType = 'midrange', // budget, midrange, luxury
    transportMode = 'tuktuk', // public, tuktuk, private, mix
  } = tripDetails;

  const dailyBudget = Math.round(budget / duration);
  
  // Scale itinerary items with trip duration — at least 5-6 per day
  const attractionsCount = Math.min(duration * 6, 30); // 6 attractions per day, max 30
  const restaurantsCount = Math.min(duration * 3, 15); // 3 restaurants per day, max 15
  
  // Accommodation cost lookup (per night) - 2026 REALISTIC PRICES from travel sites
  const accommodationCosts = {
    budget: { min: 5000, max: 15000, avg: 10000 },
    midrange: { min: 15000, max: 55000, avg: 35000 },
    luxury: { min: 55000, max: 300000, avg: 150000 }, // Updated: Ultra-luxury like Cape Weligama ~LKR 300k
  };
  
  // Transport cost lookup (per day)
  const transportCosts = {
    public: { min: 500, max: 2000, avg: 1000 },
    tuktuk: { min: 2000, max: 5000, avg: 3500 },
    private: { min: 8000, max: 15000, avg: 12000 },
    mix: { min: 1500, max: 4000, avg: 2500 },
  };
  
  const selectedAccom = accommodationCosts[accommodationType] || accommodationCosts.midrange;
  const selectedTransport = transportCosts[transportMode] || transportCosts.tuktuk;
  
  // ACCOMMODATION PRICING LOGIC - ALWAYS SHOW ACCURATE PRICES
  const maxAccommodationBudget = Math.round(budget * 0.5); // 50% of total for accommodation
  const maxAffordablePerNight = Math.round(maxAccommodationBudget / duration);
  
  // Check if budget is sufficient for selected accommodation type
  const isBudgetSufficient = maxAffordablePerNight >= selectedAccom.min;
  const budgetShortfall = isBudgetSufficient ? 0 : (selectedAccom.min * duration) - maxAccommodationBudget;
  const recommendedBudget = isBudgetSufficient ? budget : Math.round((selectedAccom.min * duration * 2) + (dailyBudget * 0.5 * duration));
  
  // ALWAYS show accurate prices for the selected type - NEVER fake low prices
  // If budget is insufficient, show real prices + warning
  const effectiveAccomMin = selectedAccom.min; // Always use real minimum
  const effectiveAccomMax = selectedAccom.max; // Always use real maximum
  
  // Build exclusion instruction if there are items to exclude
  const excludeInstruction = exclude.length > 0 
    ? `\n9. IMPORTANT: DO NOT include these places (already saved): ${exclude.join(', ')}`
    : '';
  
  // Budget warning message
  const budgetWarningNote = !isBudgetSufficient 
    ? `\n\n⚠️ BUDGET WARNING: User's budget (LKR ${budget.toLocaleString()}) is INSUFFICIENT for ${accommodationType} accommodation over ${duration} days.
    - Selected type requires: LKR ${selectedAccom.min.toLocaleString()}/night minimum
    - Budget allows only: LKR ${maxAffordablePerNight.toLocaleString()}/night
    - Shortfall: LKR ${budgetShortfall.toLocaleString()}
    - Recommended budget for this trip: LKR ${recommendedBudget.toLocaleString()}
    
    CRITICAL: YOU MUST STILL SHOW ACTUAL ${accommodationType.toUpperCase()} OPTIONS! DO NOT DOWNGRADE THEM TO CHEAPER HOTELS!
    Explain in the rationale that the selected hotel exceeds their total daily budget.
    DO NOT make up fake low prices to fit the budget!`
    : '';

  // Enhanced prompt with accurate local pricing
  return `You are an expert Sri Lanka travel planner with deep local knowledge. Create a ${duration}-day personalized itinerary.

TRIP DETAILS:
- Destination: ${destination}, Sri Lanka
- Dates: ${startDate} to ${endDate}
- Budget: LKR ${budget.toLocaleString()} total (~LKR ${dailyBudget.toLocaleString()}/day)
- Group Size: ${groupSize} people
- Interests: ${interests.join(', ') || 'general sightseeing'}
- Accommodation Preference: ${accommodationType} (LKR ${selectedAccom.min.toLocaleString()}-${selectedAccom.max.toLocaleString()}/night)
- Transport Mode: ${transportMode} (LKR ${selectedTransport.min.toLocaleString()}-${selectedTransport.max.toLocaleString()}/day)
${exclude.length > 0 ? `- Already Added (EXCLUDE THESE): ${exclude.join(', ')}` : ''}

🎯 INTEREST-BASED SELECTION (HIGHEST PRIORITY):
The user specifically selected these interests: [${interests.join(', ') || 'general sightseeing'}]
At least 70% of recommended attractions MUST directly relate to the selected interests.
Do NOT fill the itinerary with generic temples/museums unless the user selected "Culture & Heritage" or "History".

Interest-to-attraction mapping (use this to select places):
${interests.includes('beach') ? '- BEACHES: Include beach locations, coastal walks, seaside attractions, beach cafes, water sports spots' : ''}
${interests.includes('food') ? '- FOOD & CUISINE: Prioritize local restaurants, street food spots, food markets, cooking classes, food tours' : ''}
${interests.includes('photography') ? '- PHOTOGRAPHY: Include photogenic viewpoints, instagrammable spots, scenic overlooks, colorful streets, sunrise/sunset locations' : ''}
${interests.includes('shopping') ? '- SHOPPING: Include shopping malls, craft markets, boutique stores, souvenir shops, local artisan workshops' : ''}
${interests.includes('nature') ? '- NATURE & WILDLIFE: Include parks, gardens, wildlife sanctuaries, nature trails, bird watching spots' : ''}
${interests.includes('adventure') ? '- ADVENTURE: Include hiking trails, water sports, zip-lining, rock climbing, outdoor activities' : ''}
${interests.includes('culture') ? '- CULTURE & HERITAGE: Include temples, historical sites, museums, cultural shows, heritage buildings' : ''}
${interests.includes('history') ? '- HISTORY: Include museums, colonial buildings, archaeological sites, memorial halls, historical walking tours' : ''}
${interests.includes('wildlife') ? '- WILDLIFE: Include national parks, safaris, animal sanctuaries, turtle hatcheries, elephant orphanages' : ''}
${interests.includes('nightlife') ? '- NIGHTLIFE: Include rooftop bars, nightclubs, live music venues, beachside bars, evening entertainment' : ''}

IMPORTANT: If the user did NOT select "culture" or "history", limit temples and museums to at most 1-2 for context only. Focus on what they ACTUALLY selected!

PRICING GUIDELINES (Sri Lankan Tourist Rates 2024-2026 - BE ACCURATE):
- Temple entry: LKR 200-500 (local rate), LKR 1,000-3,000 (foreigner rate)
- Museums: LKR 100-500 (local), LKR 500-2,000 (foreigner)
- Botanical Gardens: LKR 200-600 (local), LKR 1,500-2,500 (foreigner)
- National Parks Safari: LKR 3,000-8,000 per person entry + jeep
- Restaurant meals: LKR 500-1,500 (local), LKR 1,500-5,000 (mid-range), LKR 5,000-15,000 (upscale)
- Street food: LKR 150-400
- Tuk-tuk per day: LKR 2,000-5,000
- Private car with driver per day: LKR 8,000-15,000

🗺️ GEOGRAPHIC CLUSTERING FOR MULTI-DAY TRIPS (CRITICAL FOR ${duration}+ DAY TRIPS):
For trips of 2 or more days, you MUST organize attractions by geographic proximity to minimize travel time:

1. GROUP BY AREA: Each day should focus on ONE geographic zone/neighborhood
2. PROXIMITY RULE: All activities within a day should be within 15-30 minutes travel of each other
3. LOGICAL FLOW: Order activities within each day to minimize backtracking
4. ACCOMMODATION NEAR END: Suggest staying near the last attraction of each day
5. GRADUAL MOVEMENT: For multi-day trips, move progressively to adjacent areas each day

EXAMPLE - Galle 3-Day Trip:
- Day 1: Galle Fort District (lighthouse, fort walls, Dutch Reformed Church, museums, cafes inside fort)
- Day 2: Unawatuna/Jungle Beach Area (beaches, snorkeling, Japanese Peace Pagoda, turtle hatchery)
- Day 3: Mirissa/Weligama Area (whale watching, surfing spots, coconut tree rope swing, Weligama bay)

EXAMPLE - Nuwara Eliya 2-Day Trip:
- Day 1: Central Town Area (Gregory Lake, Victoria Park, Golf Course, Hakgala Gardens nearby)
- Day 2: Horton Plains/Tea Country (World's End, Pedro Tea Estate, Moon Plains, Lover's Leap waterfall)

EXAMPLE - Kandy 2-Day Trip:
- Day 1: City Center (Temple of the Tooth, Kandy Lake, Bahiravokanda Vihara, Cultural Show)
- Day 2: Surrounding Hills (Royal Botanical Gardens Peradeniya, Tea Museum, Ambuluwawa Tower)


ACCOMMODATION - MATCH USER'S SELECTED TYPE:
User's Total Budget: LKR ${budget.toLocaleString()} for ${duration} days
Maximum for Accommodation (50%): LKR ${maxAccommodationBudget.toLocaleString()} total
User's Selected Type: "${accommodationType}" (LKR ${selectedAccom.min.toLocaleString()}-${selectedAccom.max.toLocaleString()}/night)

🚨🚨 CRITICAL WARNINGS - READ CAREFULLY 🚨🚨:

1. NEVER FAKE PRICES! If a hotel actually costs LKR 100,000+, do NOT show it as LKR 15,000!
2. Fort Bazaar = LKR 130,000+, Galle Fort Hotel = LKR 200,000+, Amangalla = LKR 250,000+ (LUXURY, NOT mid-range!)
3. Mango House Galle = LKR 32,000+ (Upper mid-range, NOT budget)
4. 98 Acres Resort Ella = LKR 150,000+ (LUXURY, NOT mid-range!)
5. VARIETY & RANDOMIZATION: Do NOT always pick the exact same hotels! If there are multiple hotels in the verified list that fit the budget, randomly select different ones to provide variety across different itineraries.

IF USER'S BUDGET CANNOT AFFORD A HOTEL:
- If they selected "Luxury", ALWAYS show a genuine Luxury hotel and explain it exceeds their budget! Do NOT downgrade them!
- If they selected "Mid-range" or "Budget", you may suggest a cheaper alternative.
Example for Mid-range selection but insufficient budget:
- ✅ CORRECT: Show "Closenberg Hotel ~LKR 15,000/night"
- ❌ WRONG: Show "Fort Bazaar" at fake price of LKR 15,000 (actual: LKR 130,000!)

Price range for "${accommodationType}": LKR ${effectiveAccomMin.toLocaleString()}-${effectiveAccomMax.toLocaleString()}/night
${budgetWarningNote}

VERIFIED ACCOMMODATIONS BY TYPE (2026 actual Booking.com prices):

COLOMBO (VERIFIED Feb 2026 Google/Booking.com prices):
Budget (LKR 5,000-15,000/night):
- Clock Inn Colombo: ~LKR 10,000/night (4.0 rating, 2-star) - Address: 457 Galle Road, Colombo 04, Bambalapitiya - VERIFIED Google Mar 2026: LKR 9,983
- CityRest Fort: ~LKR 8,000/night (3.8 rating, 2-star) - Address: 46 Hospital St, Colombo 01, Colombo Fort - VERIFIED Google Mar 2026: LKR 7,881
- Drop Inn Hostels: ~LKR 6,600/night (4.2 rating, hostel) - Address: 7 Schofield Pl, Colombo 03, Kollupitiya - VERIFIED Feb 2026
- C1 Colombo Fort: ~LKR 5,500-7,500/night (4.2 rating, hostel) - Address: 37 Mudalige Mawatha, Colombo 01, Colombo Fort
- Miracle City Inn Hostel: ~LKR 4,000-6,000/night (4.3 rating, hostel) - Address: 171A, 1/1 Sir James Pieris Mawatha, Colombo 02
- Upstairs Colombo: ~LKR 6,000-8,500/night (4.1 rating, hostel/guesthouse, Colombo 3)
- The Colombo City Hostel: ~LKR 4,500-7,000/night (4.0 rating, hostel, Colombo 7)
- 24 Inn Colombo: ~LKR 6,500-9,500/night (3.9 rating, budget hotel, Wellawatte)
- Kinross Guest House: ~LKR 7,000-10,000/night (3.9 rating, guesthouse, Colombo 3)
⚠️ LUXURY - DO NOT show with fake mid-range prices. USE EXACT ADDRESSES AND PRICES BELOW:
- Cinnamon Grand Colombo: LKR 38,000-45,000/night (4.7 rating, 5-star) - Address: 77 Galle Road, Colombo 03, Kollupitiya - VERIFIED Google Mar 2026: LKR 38,258/night
- Hilton Colombo: LKR 38,000-50,000/night (4.6 rating, 5-star) - Address: 2 Sir Chittampalam A Gardiner Mawatha, Colombo 02, Lotus Road - VERIFIED Google Mar 2026: LKR 38,637/night
- Shangri-La Colombo: LKR 55,000-75,000/night (4.6 rating, 5-star) - Address: 1 Galle Face Centre Road, Colombo 02, Galle Face - VERIFIED Google Mar 2026: LKR 59,596/night
- Cinnamon Lakeside Colombo: LKR 40,000-60,000/night (4.6 rating, 5-star) - Address: 115 Sir Chittampalam A Gardiner Mawatha, Colombo 02, Beira Lake - VERIFIED Google
- Jetwing Colombo Seven: LKR 35,000-47,000/night (4.5 rating, 5-star) - Address: 14 Sir Ernest de Silva Mawatha, Colombo 07, Cinnamon Gardens - VERIFIED Feb 2026
- OZO Colombo: LKR 30,000-42,000/night (4.1 rating, 4-star) - Address: 02 Sir Mohamed Macan Markar Mawatha, Colombo 03, Kollupitiya - VERIFIED Feb 2026

Mid-range (LKR 15,000-40,000/night):
- Fairway Colombo: ~LKR 23,632/night (4.2 rating, 4-star, Colombo Fort) - VERIFIED Feb 2026
- The Steuart by Citrus: ~LKR 17,871/night (4.4 rating, 3-star, Colombo Fort) - VERIFIED Feb 2026

GALLE (VERIFIED 2026 Google/Booking.com prices):
⚠️ LUXURY HOTELS - DO NOT show with fake prices:
- Fort Bazaar: LKR 130,000+, Galle Fort Hotel: LKR 200,000+, The Heritage Hotel: LKR 63,000+, Amangalla: LKR 250,000+

Budget (LKR 5,000-15,000/night):
⚠️ PERMANENTLY CLOSED - DO NOT suggest: "Pedlar's Inn Hostel" (closed per Google Maps 2026)
⚠️ DOES NOT EXIST in Galle Fort: "Mama's Galle Fort Roof Cafe & Hostel" - This is NOT a real hotel! (Google Maps shows "Mama's Hostel" in Talpe, and Booking.com shows "Mama's Hostel by Taprobane" in Negombo - NEITHER is in Galle Fort!)
- Fort Heaven - Galle Fort: ~LKR 9,500/night (4.4 rating, 3-star) - Address: 68 Lighthouse St, Galle Fort, Old Town - VERIFIED Feb 2026: LKR 9,589
- The Urban Stay: ~LKR 4,000-5,000/night (8.9 rating) - Address: Galle - VERIFIED LKR 4,074
- Fort Thari Inn: ~LKR 10,000-11,000/night (8.9 rating, 3-star) - Address: Old Town, Galle - VERIFIED LKR 10,301
- Baba place villa: ~LKR 12,000-13,000/night - Address: Galle - VERIFIED LKR 12,373
- Sirène Galle Fort: ~LKR 14,000-15,000/night (8.9 rating) - Address: Old Town, Galle Fort - VERIFIED LKR 14,198
- nelli house: ~LKR 8,000-12,000/night (9.2 rating, homestay/guesthouse) - Address: Galle City - VERIFIED Google Maps
- Seagreen Guesthouse: ~LKR 9,000-14,000/night (4.4 rating) - Address: Galle Fort - VERIFIED
- Sixth Sense Hostel: ~LKR 3,500-6,000/night (highly rated hostel) - Address: Galle City - VERIFIED
- Sanithu Homestay and villa: ~LKR 3,500-6,000/night (homestay) - Address: Galle City - VERIFIED
- Anthony's Villa: ~LKR 10,000-14,000/night (guesthouse) - Address: Galle City - VERIFIED

⚠️ LUXURY/MID-RANGE - NOT budget:
- "The Lady Hill Hotel" (NOT "Lady Hill Hotel"): LKR 39,000+/night (4.5 rating, 3-star, 649 reviews) - Address: Lower Dickson Rd, Galle - VERIFIED Google Mar 2026: LKR 39,203/night. This is MID-RANGE/LUXURY pricing, NOT budget!

⚠️ OFTEN CONFUSED NAME - use exact Booking.com name:
- Wijenayake's - Beach Haven Guest House - Galle Fort: ~LKR 14,500-18,000/night (4.4 rating, 4-star) - Address: Galle Fort - VERIFIED LKR 14,538. Do NOT call it just "Beach Haven Guest House".

Mid-range (LKR 15,000-40,000/night):
- Closenberg Hotel: ~LKR 25,000-35,000/night (3.9 rating, 3-star) - Address: 11 Closenberg Rd, Galle - VERIFIED Booking.com LKR 25k-31k
- Dutch Wall Fort: ~LKR 20,000/night (8.9 rating) - Address: Old Town, Galle Fort - VERIFIED LKR 20,106
- Ivy Lane Galle Fort: ~LKR 27,000-29,000/night (8.7 rating) - Address: Old Town, Galle Fort - VERIFIED LKR 27,839
- Secret Garden Galle Fort: ~LKR 29,000-31,000/night (8.0 rating) - Address: Old Town, Galle Fort - VERIFIED LKR 29,510
- Fort Bliss: ~LKR 31,000-33,000/night (9.2 rating, 3-star) - Address: Old Town, Galle Fort - VERIFIED LKR 31,551
- The Fort House: ~LKR 33,000-35,000/night (8.7 rating) - Address: Old Town, Galle Fort - VERIFIED LKR 33,407
- Green Hideaway - Villa with Private Pool: ~LKR 36,000-38,000/night (10 rating, exceptional) - Address: Galle City - VERIFIED LKR 36,191
- Rampart View Guesthouse: ~LKR 20,000-22,000/night (4.2 rating, 3-star) - Address: Rampart St, Galle Fort - VERIFIED Google Mar 2026: LKR 20,557/night. NOT budget!
- The Lady Hill Hotel: ~LKR 39,000-45,000/night (4.5 rating, 3-star) - Address: Lower Dickson Rd, Galle - VERIFIED Google Mar 2026: LKR 39,203/night
- Olinda Galle: ~LKR 25,000-30,000/night (9.8 rating, 3-star, pool) - Address: Galle City - VERIFIED
- ArtNEST Gallery Stay: ~LKR 18,000-24,000/night (9.5 rating, 3-star) - Address: Pedlars St, Galle Fort - VERIFIED
- Fairway Galle: ~LKR 20,000-28,000/night (4.5 rating) - Address: 120, Hapugala, Galle
- Thaproban Pavilion Resort: ~LKR 25,000-35,000/night (4.3 rating) - Address: Unawatuna, Galle
- Yara Galle Fort: ~LKR 28,000-35,000/night (4.6 rating) - Address: Middle St, Galle Fort
- Sunset Fort Galle: ~LKR 22,000-28,000/night (8.0 Booking.com, 438 reviews, 3-star) - Address: Galle Fort - VERIFIED Booking.com LKR 44,914/2nights.
- de MODA Boutique Hotel Galle: ~LKR 19,000-25,000/night (8.7 Booking.com, 260 reviews) - Address: Galle City - VERIFIED Booking.com LKR 38,975/2nights. Pool, 50m from beach.

LUXURY (LKR 40,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- Heavensa Luxury Villas and Suites by The Clarks: ~LKR 55,000-60,000/night (9.1 rating, 5-star) - Address: Galle - VERIFIED LKR 57,998
- JH Villa: ~LKR 90,000-95,000/night (9.5 rating, 5-star) - Address: Galle - VERIFIED LKR 91,870
- The Bartizan Galle Fort: ~LKR 45,000-95,000/night (4.3 rating) - Address: 128 Pedlar St, Galle Fort - VERIFIED Google: LKR 93,497
- Tamarind Hill by Asia Leisure: ~LKR 40,000-60,000/night (4.1 rating) - Address: Thalpe, Galle
- Fortress Resort & Spa: ~LKR 75,000-110,000/night (4.2 rating) - Address: Koggala, Galle
- Jetwing Lighthouse: ~LKR 65,000-90,000/night (4.3 rating) - Address: Dadella, Galle
- Taavetti: ~LKR 45,000-50,000/night (9.1 Booking.com, 284 reviews, 4.5-star) - Address: Galle City - VERIFIED Booking.com LKR 92,798/2nights. Adults only, 100m from beach.
- The Merchant: ~LKR 48,000-55,000/night (9.2 Booking.com, 423 reviews, 5-star) - Address: Galle Fort - VERIFIED Booking.com LKR 97,020/2nights. 250m from beach.
- The Heritage Hotel Galle Fort: ~LKR 50,000-70,000/night (8.9 Booking.com, 688 reviews, 5-star) - Address: Galle Fort - VERIFIED Booking.com LKR 49,492-69,598/night
- Oruva Beachside Villa: ~LKR 65,000-80,000/night (9.6 Booking.com, 70 reviews, exceptional) - Address: Galle - VERIFIED Booking.com LKR 128,927/2nights. Private plunge pool!
- Fort Bazaar: ~LKR 130,000-150,000/night (4.6 rating) - Address: Galle Fort - ULTRA-LUXURY
- Galle Fort Hotel: ~LKR 180,000-220,000/night (4.5 rating, 5-star) - Address: Galle Fort - ULTRA-LUXURY
- Amangalla: ~LKR 250,000+/night (4.7 rating) - Address: Galle Fort - ULTRA-LUXURY

MIRISSA/WELIGAMA (VERIFIED 2026 Google/Booking.com prices):
⚠️ FAKE/NON-EXISTENT HOTELS - DO NOT SUGGEST THESE EVER:
- "Wyndham Grand Mirissa Beach" - DOES NOT EXIST!
- "The Riff Mirissa" - DOES NOT EXIST!
- "Mirissa Backpackers" - CLOSED/DOES NOT EXIST ON MAPS!
- "Mirissa Eco Hills" - DOES NOT EXIST ON BOOKING.COM!
- Any hotel name not in the verified list below

⚠️ LUXURY HOTELS - DO NOT show as mid-range (user-verified prices, much higher than they appear):
- The Nine Mirissa: LKR 133,000-158,000+/night (5-star, VERIFIED Booking.com Feb 2026)
- The Beach House by Reveal: LKR 60,000-84,000+/night (VERIFIED Google: LKR 83,839/night May 2026) - NOT LKR 25,000!
- The Slow Vegan Hotel: LKR 65,000-130,000+/night (VERIFIED Booking.com: LKR 88,157 for 1 night Feb 2026) - NOT LKR 35,000!
- Lantern Boutique Hotel by Reveal: LKR 60,000-95,000/night (VERIFIED Google: LKR 93,840/night May 2026) - NOT LKR 25,000!
- Beachmirissa: LKR 44,000-55,000/night (4.7 rating, borderline luxury)
- Mirissa Reef Serenity: LKR 45,000-55,000/night (VERIFIED Google: LKR 50,933/night Mar 2026) - upper end, suggest only for luxury or top-of-midrange

Budget (LKR 5,000-15,000/night):
- Hangover Hostels Mirissa: ~LKR 8,034/night (4.4 rating, 2-star hotel) - Address: Mirissa - VERIFIED LKR 8,034
- Palm Villa Mirissa: ~LKR 10,000-14,000/night (4.1 rating)
- Mirissa Dream Villa: ~LKR 10,814/night (4.6 rating on Google, 2-star hotel near Mirissa Beach) - VERIFIED LKR 10,814 Feb 2026
- JJ's Hostel Mirissa: ~LKR 9,270/night (4.7 rating on Google, hostel, pool) - Address: Mirissa - VERIFIED LKR 9,270
- Sailors Mirissa: ~LKR 7,733/night (8.2 Booking.com, 268 reviews) - Address: Mirissa - VERIFIED LKR 7,733
- Green Garden Guest Mirissa: ~LKR 5,011/night (8.0 Booking.com, 426 reviews) - Address: Mirissa - VERIFIED LKR 5,011
- Mama's place Mirissa: ~LKR 7,935/night (8.4 Booking.com, 256 reviews) - Address: Mirissa - VERIFIED LKR 7,935
- Amanda Mirissa: ~LKR 12,528/night (9.4 Booking.com, 120 reviews) - Address: Mirissa - VERIFIED LKR 12,528
- A One Calm Palace: ~LKR 6,048/night (8.7 Booking.com, 187 reviews) - Address: Mirissa - VERIFIED LKR 6,048
- Era Holiday House: ~LKR 12,003/night (9.8 Booking.com, 287 reviews) - Address: Mirissa - VERIFIED LKR 12,003
- Pearl Deluna Resort Mirissa: ~LKR 6,236/night (7.7 Booking.com, 328 reviews) - Address: Mirissa - VERIFIED LKR 6,236
- Mirissa Beach Inn: ~LKR 13,611/night (8.3 Booking.com, 130 reviews) - Address: Mirissa - VERIFIED LKR 13,611
- Poppies Mirissa: ~LKR 7,617/night (8.1 Booking.com, 398 reviews) - Address: Mirissa - VERIFIED LKR 7,617
- The View Mirissa: ~LKR 4,454/night (9.2 Booking.com, 203 reviews) - Address: Mirissa - VERIFIED LKR 4,454
- Azure Mirissa: ~LKR 12,992/night (9.2 Booking.com, 119 reviews) - Address: Mirissa - VERIFIED LKR 12,992
- Queen's Gate, Mirissa: ~LKR 14,870/night (8.8 Booking.com, 132 reviews) - Address: Mirissa - VERIFIED LKR 14,870
- Peacock Wings Guest: ~LKR 5,939/night (9.0 Booking.com, 152 reviews) - Address: Mirissa - VERIFIED LKR 5,939

Mid-range (LKR 15,000-44,000/night):
- Mirissa Water Villa: ~LKR 20,000-28,000/night (4.2 rating, lagoon-side)
- Secret Garden Mirissa: ~LKR 22,000-30,000/night (5.0 rating on Google, 8 reviews, homestay/garden bungalows) - VERIFIED Google Maps
- Green Hill Mirissa: ~LKR 18,559/night (8.4 Booking.com score, 579 reviews, swimming pool) - VERIFIED Feb 2026
- Coastal Retreat Mirissa: ~LKR 18,000-25,000/night (8.4 rating, pool) - Address: Mirissa - VERIFIED
- GG Lodge Mirissa: ~LKR 15,000-22,000/night (9.3 rating) - Address: Mirissa - VERIFIED
- Lanka Hotel Mirissa: ~LKR 16,000-24,000/night (8.2 rating) - Address: Mirissa - VERIFIED
- Mirissa Hills: ~LKR 28,000-35,000/night (4.5 rating on Google, 267 reviews, 3-star hotel) - Address: Mirissa - VERIFIED LKR 30,899
- Perfect view mirissa: ~LKR 20,107/night (9.1 Booking.com, 329 reviews) - Address: Mirissa - VERIFIED LKR 20,107
- Fresh Wave Mirissa - Beach Front: ~LKR 16,705/night (7.9 Booking.com, 532 reviews) - Address: Mirissa - VERIFIED LKR 16,705
- Mirissa Crown: ~LKR 25,057/night (9.1 Booking.com, 54 reviews) - Address: Mirissa - VERIFIED LKR 25,057
- Ballena Regency: ~LKR 27,470/night (8.5 Booking.com, 456 reviews) - Address: Mirissa - VERIFIED LKR 27,470
- Surf Sea Breeze: ~LKR 29,388/night (8.4 Booking.com, 324 reviews) - Address: Mirissa - VERIFIED LKR 29,388
- Paradise Beach Club: ~LKR 33,410/night (7.9 Booking.com, 750 reviews) - Address: Mirissa - VERIFIED LKR 33,410
- ThiThi's Palace Mirissa: ~LKR 18,252/night (8.8 Booking.com, 74 reviews) - Address: Mirissa - VERIFIED LKR 18,252
- Beach & Bliss Mirissa: ~LKR 40,345/night (7.7 Booking.com, 733 reviews) - Address: Mirissa - VERIFIED LKR 40,345
- Villa Atulya at Ocean's edge: ~LKR 43,309/night (8.9 Booking.com, 277 reviews) - Address: Mirissa - VERIFIED LKR 43,309
- Peacock Villa: ~LKR 30,502/night (9.8 Booking.com, 509 reviews) - Address: Mirissa - VERIFIED LKR 30,502
- Morning Star: ~LKR 25,057/night (8.8 Booking.com, 721 reviews) - Address: Mirissa - VERIFIED LKR 25,057
- Edelweiss Resort: ~LKR 17,324/night (8.0 Booking.com, 255 reviews) - Address: Mirissa - VERIFIED LKR 17,324
- Somerset Mirissa Eco: ~LKR 28,367/night (8.0 Booking.com, 382 reviews) - Address: Mirissa - VERIFIED LKR 28,367
- Atulya Lake View Mirissa - Resort and Spa: ~LKR 41,261/night (9.6 Booking.com, 43 reviews) - Address: Mirissa - VERIFIED LKR 41,261
- Mirissa Gate Resort: ~LKR 25,057/night (7.0 Booking.com, 118 reviews) - Address: Mirissa - VERIFIED LKR 25,057

Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- Somerset Mirissa Blue: ~LKR 54,130/night (8.0 Booking.com, 418 reviews) - Address: Mirissa - VERIFIED LKR 54,130
- Green Hill Mirissa (premium): ~LKR 35,000-45,000/night (8.4 Booking.com, 579 reviews, pool) - AFFORDABLE luxury! Address: Mirissa
- Beachmirissa: ~LKR 44,000-55,000/night (4.7 rating, beachfront) - Address: Mirissa
- Mirissa Reef Serenity: ~LKR 45,000-55,000/night (4.9 rating, 159 reviews, beachfront) - VERIFIED Google Mar 2026
- The Beach House by Reveal: ~LKR 60,000-84,000/night (4.4 rating, 102 reviews, pool) - VERIFIED Google May 2026
- The Slow Vegan Hotel: ~LKR 65,000-130,000/night (4.5 rating) - VERIFIED Booking.com Feb 2026
- Lantern Boutique Hotel by Reveal: ~LKR 60,000-95,000/night (4.5 rating) - VERIFIED Google May 2026
- Sri Sharavi Beach Villas & Spa: ~LKR 100,000-110,000/night (4.5 rating, 5-star, Midigama) - VERIFIED Feb 2026
- The Nine Mirissa: ~LKR 133,000-158,000/night (9.0 Booking.com, 5-star) - ULTRA-LUXURY
- Weligama Bay Marriott Resort & Spa: ~LKR 115,000-120,000/night (4.6 rating, 5-star) - ULTRA-LUXURY
- Cape Weligama - Relais & Chateaux: ~LKR 280,000-300,000/night (4.7 rating, ultra-luxury) - ULTRA-LUXURY


ELLA:

⚠️ WRONG LOCATION - DO NOT suggest for Ella:
- "Ceyloni City Hotel" is in KANDY, NOT Ella! Do NOT suggest this for Ella trips.
⚠️ LUXURY - DO NOT show as mid-range:
- Ella Mount Heaven Hotel: LKR 39,000-50,000/night (4.4 rating) - this is LUXURY, NOT mid-range! VERIFIED Booking.com 2026: Deluxe room LKR 39,455
- 98 Acres Resort & Spa: LKR 130,000-210,000/night (4.6 rating, LUXURY) - VERIFIED $700+/night for 2026

Budget (LKR 5,000-15,000/night):
- Ella Escapade Hotel: ~LKR 6,000-9,000/night (4.2 rating) - Address: 119/1, Passara Rd, Ella
- Hangover Hostels Ella: ~LKR 10,505/night (4.5 rating, hostel) - Address: Passara Rd, Ella - VERIFIED LKR 10,505
- The View Ella: ~LKR 7,000-11,000/night (4.1 rating) - Address: Kithalella, Ella
- Ella Okreech Cottages: ~LKR 13,014/night (4.2 rating) - Address: Ella - VERIFIED LKR 13,014
- Ella Mint Homestay: ~LKR 8,894/night (9.4 Booking.com, 14 reviews) - Address: Ella - VERIFIED LKR 8,894
- Ceylon Sky: ~LKR 7,424/night (Booking.com) - Address: Ella - VERIFIED LKR 7,424
- Winking nature view: ~LKR 6,434/night (Booking.com) - Address: Ella - VERIFIED LKR 6,434
- Ivory Canopy Resort - Ella: ~LKR 10,580/night (8.4 Booking.com, 11 reviews) - Address: Ella - VERIFIED LKR 10,580
- Avenra Cottage: ~LKR 10,814/night (4.7 rating) - Address: Ella - VERIFIED LKR 10,814
- Ella RESTQ: ~LKR 4,056/night (Booking.com) - Address: Ella - VERIFIED LKR 4,056
- STILLMOSS Ella: ~LKR 5,445/night (Booking.com) - Address: Ella - VERIFIED LKR 5,445
- Lusso Family Guest Badulla: ~LKR 4,640/night (Booking.com, note: technically Badulla area) - VERIFIED LKR 4,640
- Mount Breeze Ella: ~LKR 11,833/night (8.5 Booking.com, 398 reviews) - Address: Ella - VERIFIED LKR 11,833
- Avon Hills Ella Resort: ~LKR 9,590/night (7.9 Booking.com, 88 reviews) - Address: Ella - VERIFIED LKR 9,590
- New Arch Heaven Ella: ~LKR 7,734/night (9.8 Booking.com, 24 reviews) - Address: Ella - VERIFIED LKR 7,734
- Maya 44 Ella: ~LKR 7,424/night (8.8 Booking.com, 118 reviews) - Address: Ella - VERIFIED LKR 7,424
- Ella nature nest: ~LKR 7,734/night (8.0 Booking.com, 172 reviews) - Address: Ella - VERIFIED LKR 7,734
- Isuru Homestay: ~LKR 5,723/night (9.3 Booking.com, 149 reviews) - Address: Ella - VERIFIED LKR 5,723
- The Rock Face: ~LKR 9,590/night (8.0 Booking.com, 958 reviews) - Address: Ella - VERIFIED LKR 9,590
- Blue Ribbon Homestay: ~LKR 10,209/night (8.6 Booking.com, 321 reviews) - Address: Ella - VERIFIED LKR 10,209
- Summer Villa: ~LKR 9,466/night (8.6 Booking.com, 53 reviews) - Address: Ella - VERIFIED LKR 9,466
- Avenra Cottage: ~LKR 10,827/night (8.9 Booking.com, 189 reviews) - Address: Ella - VERIFIED LKR 10,827
- Raveena Guest House: ~LKR 6,391/night (8.5 Booking.com, 408 reviews) - Address: Ella - VERIFIED LKR 6,391
- Brilliant View Home Stay: ~LKR 6,806/night (8.9 Booking.com, 298 reviews) - Address: Ella - VERIFIED LKR 6,806

Mid-range (LKR 15,000-35,000/night):
- Ella Flower Garden Resort: ~LKR 20,000-25,000/night (4.3 rating) - Address: Passara Rd, Ella - VERIFIED
- Ambiente Ella: ~LKR 15,000-20,000/night (4.5 rating, boutique guesthouse) - separate property, NOT part of 98 Acres
- Zion View Ella: ~LKR 18,000-25,000/night (4.4 rating) - Address: Ella Rd, Ella
- Eco Village: ~LKR 20,000-25,000/night (9.2 rating) - Address: Ella - VERIFIED
- CHILL VILLE, VIEW POINT HOTEL: ~LKR 25,000-32,000/night (9.3 rating) - Address: Ella - VERIFIED
- Zion View Ella Green Retreat: ~LKR 22,000-28,000/night (9.0 rating) - Address: Ella - VERIFIED
- Ravana Heights: ~LKR 33,648/night (4.3 rating) - Address: Ravana Ella Rd, Ella - VERIFIED LKR 33,648
- Oak Ray La Ella Breeze: ~LKR 34,647/night (8.5 rating) - Address: Ella - VERIFIED LKR 34,647
- Ella Camelot: ~LKR 15,467/night (8.4 Booking.com, 419 reviews) - Address: Ella - VERIFIED LKR 15,467
- Brisk Ella Retreat: ~LKR 15,467/night (7.1 Booking.com, 407 reviews) - Address: Ella - VERIFIED LKR 15,467
- New Ella Nature View: ~LKR 10,023/night (8.8 Booking.com, 213 reviews) - Address: Ella - VERIFIED LKR 10,023
- Senasuma Homestay: ~LKR 11,136/night (8.6 Booking.com, 452 reviews) - Address: Ella - VERIFIED LKR 11,136
- La Montagna: ~LKR 10,518/night (8.9 Booking.com, 239 reviews) - Address: Ella - VERIFIED LKR 10,518
- Viewfront Ella: ~LKR 10,601/night (8.4 Booking.com, 210 reviews) - Address: Ella - VERIFIED LKR 10,601
- Ella Nine Arch lodge: ~LKR 14,199/night (8.9 Booking.com, 325 reviews) - Address: Ella - VERIFIED LKR 14,199
- Ella Rock Heaven: ~LKR 15,034/night (8.2 Booking.com, 872 reviews) - Address: Ella - VERIFIED LKR 15,034
- Mount Breeze Ella: ~LKR 11,832/night (8.5 Booking.com, 398 reviews) - Address: Ella - VERIFIED LKR 11,832

Luxury (LKR 30,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- The Feel Luxury Boutique Hotel Ella: ~LKR 30,000-40,000/night (boutique, 5-star) - Address: Ella - VERIFIED Booking.com. AFFORDABLE luxury!
- Crystal Spring Luxury Hotel: ~LKR 35,000-45,000/night (luxury boutique) - Address: Ella - VERIFIED Booking.com
- Ella Mount Heaven Hotel: ~LKR 39,000-50,000/night (4.4 rating) - Address: Ella - VERIFIED 2026
- Nine Skies: ~LKR 50,000-70,000/night (5-star, heritage railway bungalow) - Address: Demodara, Ella
- Anasa Wellness Resort: ~LKR 50,000-75,000/night (9.5 rating, 5-star wellness) - Address: Bandarawela-Ella area - VERIFIED
- 98 Acres Resort & Spa: ~LKR 130,000-210,000/night (4.6 rating, 5-star, tea plantation) - ULTRA-LUXURY
- Cozy Cottage Ella: ~LKR 18,561/night (8.6 Booking.com, 309 reviews) - Address: Ella - VERIFIED LKR 18,561
- Country Homes: ~LKR 20,046/night (8.7 Booking.com, 1,165 reviews) - Address: Ella - VERIFIED LKR 20,046
- Royal Mount Ella: ~LKR 20,107/night (9.5 Booking.com, 538 reviews) - Address: Ella - VERIFIED LKR 20,107

NUWARA ELIYA (VERIFIED 2026 Google/Booking.com prices):
⚠️ WRONG NAMES - use exact names from Google Maps:
- "Grand Hotel" - WRONG! Real name: "The Grand Hotel Nuwara Eliya - Heritage Grand" (4.6 rating, 4252 reviews, 4-star)
- "Jetwing St. Andrew's" - WRONG! Real name: "Jetwing St. Andrews" (NO apostrophe! 4.6 rating, 3020 reviews, 5-star)

⚠️ HALLUCINATED/NON-EXISTENT HOTELS:
- "Unique Cottages" - DOES NOT EXIST on Google Maps! Searching "Unique Cottages, Near Victoria Park" returns Victoria Park (a park!) and other cottages, NOT this hotel. DO NOT SUGGEST!

⚠️ VERIFIED PRICES (Google Maps Mar 2026, 2 adults):
- The Grand Hotel Nuwara Eliya: LKR 79,018/2nights = ~LKR 39,500/night - this is LUXURY pricing!
- Araliya Green Hills Hotel: LKR 41,602/2nights = ~LKR 20,800/night - this is MID-RANGE!
- W15 Glenfall Nuwara Eliya: LKR 33,228/2nights = ~LKR 16,600/night - this is MID-RANGE!
- Heritance Tea Factory: ~$212/night = ~LKR 65,000+ (luxury)

Budget (LKR 5,000-15,000/night):
- Single Tree Hotel: ~LKR 9,000-12,000/night (3.8 rating) - Address: No. 8/1 Haddon Hill Road, Nuwara Eliya City Center - VERIFIED Booking.com (overlooks Gregory Lake)
- Green View Holiday Resort: ~LKR 7,000-10,000/night (3.9 rating) - Address: Nuwara Eliya
- Queens Mount Glen Heights: ~LKR 9,000-14,000/night (8.2 Booking.com, 668 reviews, 2-star) - Address: Nuwara Eliya - VERIFIED Booking.com LKR 27,839/3nights
- 20/20 wood cabana: ~LKR 8,000-12,000/night (9.0 rating) - Address: Nuwara Eliya - VERIFIED
- Araliya Red - Budget friendly Hotel: ~LKR 10,000-15,000/night (popular budget hotel) - Address: Nuwara Eliya - VERIFIED
- Green Villa: ~LKR 7,000-11,000/night (8.7 rating, cheap hotel) - Address: Nuwara Eliya - VERIFIED
- Lily Bank Cottage: ~LKR 4,950/night (8.9 Booking.com, 290 reviews) - Address: Nuwara Eliya - VERIFIED LKR 4,950
- Waterfield Bungalow by Liyozi Leasiure: ~LKR 4,572/night (7.9 Booking.com, 205 reviews) - Address: Nuwara Eliya - VERIFIED LKR 4,572
- Sherwood Cottage: ~LKR 6,961/night (8.0 Booking.com, 440 reviews) - Address: Nuwara Eliya - VERIFIED LKR 6,961
- Gregory House Hostel: ~LKR 9,466/night (7.9 Booking.com, 677 reviews) - Address: Nuwara Eliya - VERIFIED LKR 9,466
- Vista Apartment Mariners Cabin: ~LKR 9,899/night (8.6 Booking.com, 116 reviews) - Address: Nuwara Eliya - VERIFIED LKR 9,899
- Mount Mary Inn: ~LKR 6,172/night (8.9 Booking.com, 390 reviews) - Address: Nuwara Eliya - VERIFIED LKR 6,172
- Snowdon: ~LKR 3,712/night (9.2 Booking.com, 36 reviews) - Address: Nuwara Eliya - VERIFIED LKR 3,712
- Mount End Hotel Nuwara Eliya: ~LKR 10,209/night (7.9 Booking.com, 62 reviews) - Address: Nuwara Eliya - VERIFIED LKR 10,209
- New Pensive Villa: ~LKR 6,187/night (10 Booking.com, 1 review) - Address: Nuwara Eliya - VERIFIED LKR 6,187
- Chez Allen: ~LKR 9,745/night (7.6 Booking.com, 458 reviews) - Address: Nuwara Eliya - VERIFIED LKR 9,745

⚠️ WRONG LOCATION:
- Hill Safari Eco Lodge: Located in OHIYA (not Nuwara Eliya city!) - Address: Ohiya, Horton Plains Range. Only suggest if trip includes Horton Plains.

Mid-range (LKR 15,000-40,000/night):
- W15 Glenfall Nuwara Eliya: ~LKR 15,000-18,000/night (4.4 rating, 69 reviews, lodge) - Address: Glenfall Rd, Nuwara Eliya - VERIFIED Google Maps LKR 33,228/2nights = ~LKR 16,600/night
- Oak Ray Summer Hill Breeze: ~LKR 18,000-22,000/night (4.1 rating) - Address: Nuwara Eliya
- Araliya Green Hills Hotel: ~LKR 17,000-22,000/night (4.3 rating, 2421 reviews, 4-star) - Address: 3 Frederick Place, Nuwara Eliya - VERIFIED Google Maps LKR 35,320-41,602/2nights = ~LKR 17,660-20,800/night. Booking.com shows ~LKR 28,889/night
- Hotel Glendower: ~LKR 22,000-28,000/night (4.1 rating, 373 reviews, 3-star) - Address: Nuwara Eliya - VERIFIED Google Maps LKR 24,556/night
- Galway Heights Hotel: ~LKR 22,000-28,000/night (4.1 rating, 4-star) - Address: Nuwara Eliya - VERIFIED
- The Hill Club: ~LKR 25,000-35,000/night (4.1 rating on Google Maps, 629 reviews, "fraternal organization" / historic clubhouse. Booking.com: 5-star, 7.8 score, 248 reviews) - Address: 29 Grand Hotel Rd, Nuwara Eliya 22200 - ⚠️ Often NO AVAILABILITY on Booking.com! Google Maps has no online pricing.
- Jetwing St. Andrews: ~LKR 30,000-40,000/night (4.6 rating, 3020 reviews, 5-star) - Address: 10 St Andrews Dr, Nuwara Eliya - No apostrophe in name!
- Araliya Red - Budget friendly Hotel-: ~LKR 23,673/night (7.3 Booking.com, 520 reviews) - Address: Nuwara Eliya - VERIFIED LKR 23,673
- Country Club Nuwara Eliya: ~LKR 11,581/night (8.0 Booking.com, 142 reviews) - Address: Nuwara Eliya - VERIFIED LKR 11,581
- Sarah Cottage Nuwara Eliya: ~LKR 11,833/night (8.2 Booking.com, 34 reviews) - Address: Nuwara Eliya - VERIFIED LKR 11,833
- Queenswood Cottage: ~LKR 24,980/night (8.5 Booking.com, 825 reviews) - Address: Nuwara Eliya - VERIFIED LKR 24,980
- Baron Luxury Boutique: ~LKR 30,040/night (8.0 Booking.com, 131 reviews) - Address: Nuwara Eliya - VERIFIED LKR 30,040

Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- The Grand Hotel Nuwara Eliya - Heritage Grand: ~LKR 35,000-45,000/night (4.6 rating, 4252 reviews, 4-star, heritage) - Address: Grand Hotel Rd, Nuwara Eliya - VERIFIED Google Maps LKR 79,018/2nights = ~LKR 39,500/night. Use EXACT name!
- Jetwing St. Andrews (premium rooms): ~LKR 40,000-55,000/night (4.6 rating, 3020 reviews, 5-star) - Address: 10 St Andrews Dr, Nuwara Eliya
- Chimneys Nuwara Eliya: ~LKR 52,000-65,000/night (4.5 rating, 104 reviews, 5-star) - Address: Nuwara Eliya - VERIFIED Google Maps LKR 52,500
- Heritance Tea Factory: ~LKR 65,000-85,000/night (5-star, converted tea factory, ~$212 avg) - Address: Kandapola, Nuwara Eliya - ULTRA-LUXURY
- The Golden Ridge Hotel: ~LKR 40,000-55,000/night (5-star, great views) - Address: Nuwara Eliya - VERIFIED
- Araliya Green City: ~LKR 45,000-60,000/night (5-star luxury) - Address: Nuwara Eliya - VERIFIED

SIGIRIYA/DAMBULLA (VERIFIED 2026 Google/Booking.com prices):
⚠️ LUXURY - DO NOT show with fake prices:
- Sigiriya King's Resort: LKR 70,000+ (NOT budget! It's 3-star luxury treehouse)
- Aliya Resort & Spa: LKR 80,000+ (luxury, Address: Habarana area)
- Water Garden Sigiriya: LKR 100,000+ (ultra-luxury)

⚠️ HALLUCINATED/FAKE HOTELS - DO NOT SUGGEST:
- "Hotel & Restaurant & Safari Jeep" - DOES NOT EXIST! Google Maps shows "Adventure Jeep Safari Sigiriya" which is a SAFARI TOUR COMPANY, not a hotel!
- "Sigiriya Village Guesthouse" - DOES NOT EXIST!

⚠️ BOOKING.COM / GOOGLE MAPS NAME MISMATCHES:
- "Sigiriya Village Hotel" on Google Maps (4.2, 2055 reviews) → Booking.com search shows "Sat Nam Village Hotel" instead (LKR 17,013). These may be DIFFERENT properties. Use "Sigiriya Village Hotel" for Google Maps link.
- "Hotel Sigiriya Kele" on Google Maps (3.3, 154 reviews, LKR 12,224) = "New Sigiri Kele" on Booking.com (8.2, 125 reviews, LKR 12,682). SAME property, different names! Use "Hotel Sigiriya Kele" for Google Maps link.

Budget (LKR 5,000-15,000/night) - MANY verified options, vary your picks!:
- Back of Beyond Pidurangala: ~LKR 8,000-12,000/night (4.3 rating) - Address: Pidurangala, Sigiriya
- Lakmini Lodge Restaurant & Bar: ~LKR 10,000-11,000/night (4.2 rating, 1-star) - Address: Sigiriya - VERIFIED
- Sigiriya Wewa Inn: ~LKR 7,000-9,000/night (4.1 rating) - Address: Sigiriya
- Fresco Water Villa: ~LKR 10,000-14,000/night (4.2 rating) - Address: Inamaluwa, Sigiriya
- Sigiri Peace Hostel: ~LKR 4,000-7,000/night (budget hostel) - Address: Sigiriya - VERIFIED Google Maps
- The Otunna Guest House Sigiriya: ~LKR 5,000-8,000/night (budget) - Address: Sigiriya - VERIFIED Google Maps
- Hogwarts Express Sigiriya: ~LKR 6,000-9,000/night (budget) - Address: Sigiriya - VERIFIED Google Maps
- Gangula Eco Lodge: ~LKR 5,569/night (8.2 Booking.com, 390 reviews) - Address: Sigiriya Rd, Sigiriya - VERIFIED LKR 5,569. BUDGET not mid-range!
- Palitha Homestay: ~LKR 6,543/night (8.9 Booking.com, 950 reviews) - Address: Sigiriya - VERIFIED LKR 6,543
- Woodholic Homestay: ~LKR 10,209/night (9.2 Booking.com, 86 reviews) - Address: Sigiriya - VERIFIED LKR 10,209

Mid-range (LKR 15,000-40,000/night) - ALL verified on Google Maps:
- Hotel Sigiriya: ~LKR 30,338/night (8.5 Booking.com, 2046 reviews) - Address: Near Sigiriya Wewa, Sigiriya - VERIFIED LKR 30,338. LARGEST hotel in area!
- Hotel Sigiriya Kele: ~LKR 12,236/night (3.3 rating, 154 reviews, 3-star) - Address: Thalkotta Rd, Sigiriya - VERIFIED LKR 12,236. On Booking.com listed as "New Sigiri Kele" (LKR 12,682). Use Google Maps name!
- Sigiriya Rock Gate Resort: ~LKR 18,000-22,000/night (4.7 rating, 107 reviews, 3-star) - Address: Inamaluwa, Sigiriya - VERIFIED Google Maps LKR 19,755/night
- Sigiriya Village: ~LKR 28,176/night (8.1 Booking.com, 697 reviews) - Address: Hotel Rd, Sigiriya - VERIFIED LKR 28,176. (Note: Listed as Sigiriya Village Hotel on Google Maps)
- Sigiri Sierra View Resort: ~LKR 17,000-22,000/night (4.4 rating, 146 reviews, resort) - Address: Sigiriya - VERIFIED Google Maps LKR 18,577/night
- Golden Rock Retreat: ~LKR 18,000-25,000/night (5.0 rating, 60 reviews, B&B, top-rated!) - Address: Sigiriya - VERIFIED Google Maps
- The Hideout Sigiriya: ~LKR 18,000-25,000/night (4.3 rating, 274 reviews, 3-star) - Address: Sigiriya - VERIFIED Google Maps
- Cloudz Sigiriya: ~LKR 15,000-20,000/night (4.2 rating, 100 reviews) - Address: Sigiriya - VERIFIED Google Maps
- Inn On The Tree Eco Resort Sigiriya: ~LKR 18,000-25,000/night (mid-range) - Address: Sigiriya - VERIFIED Google Maps
- Lovely Lodge: ~LKR 12,000-16,000/night (4.6 rating, 60 reviews, 2-star) - Address: Sigiriya - VERIFIED Google Maps
- Habarana Village by Cinnamon: ~LKR 34,152/night (8.6 Booking.com, 644 reviews) - Address: Sigiriya - VERIFIED LKR 34,152
- NIVADOO RESORT SIGIRIYA: ~LKR 25,243/night (8.2 Booking.com, 1,208 reviews) - Address: Sigiriya - VERIFIED LKR 25,243
- Sunshine Resort & Spa Sigiriya: ~LKR 21,438/night (8.1 Booking.com, 489 reviews) - Address: Sigiriya - VERIFIED LKR 21,438
- Ceylon Retreat Sigiriya: ~LKR 21,800/night (7.8 Booking.com, 107 reviews) - Address: Sigiriya - VERIFIED LKR 21,800
- Sigiri Asna Nature Resort: ~LKR 20,881/night (8.9 Booking.com, 422 reviews) - Address: Sigiriya - VERIFIED LKR 20,881
- Serenity Villa Dambulla: ~LKR 26,450/night (7.3 Booking.com, 16 reviews) - Address: Sigiriya - VERIFIED LKR 26,450
- Ayurvie Sigiriya - Ayurvedic Retreat by Thema Collection: ~LKR 26,682/night (9.3 Booking.com, 82 reviews) - Address: Sigiriya - VERIFIED LKR 26,682
- Into The Wild Sigiriya: ~LKR 20,108/night (9.1 Booking.com, 811 reviews) - Address: Sigiriya - VERIFIED LKR 20,108
- Organic Garden Resort Sigiriya: ~LKR 15,468/night (8.9 Booking.com, 291 reviews) - Address: Sigiriya - VERIFIED LKR 15,468
- Sigiriya Cashew Palace Resort: ~LKR 24,501/night (9.0 Booking.com, 132 reviews) - Address: Sigiriya - VERIFIED LKR 24,501
- Chena Huts Eco Resort: ~LKR 23,587/night (9.3 Booking.com, 375 reviews) - Address: Sigiriya - VERIFIED LKR 23,587
- Tepraas Sigiriya: ~LKR 20,989/night (8.8 Booking.com, 299 reviews) - Address: Sigiriya - VERIFIED LKR 20,989
- Naturaliza Sigiriya: ~LKR 21,593/night (8.9 Booking.com, 201 reviews) - Address: Sigiriya - VERIFIED LKR 21,593
- Sigiriya Water Guest & View Point Restaurant: ~LKR 20,108/night (9.3 Booking.com, 580 reviews) - Address: Sigiriya - VERIFIED LKR 20,108
- Sigiri Choona Lodge 'unique sunrise viewpoint': ~LKR 30,626/night (8.1 Booking.com, 717 reviews) - Address: Sigiriya - VERIFIED LKR 30,626
- Sinhagiri Villa: ~LKR 25,521/night (8.6 Booking.com, 253 reviews) - Address: Sigiriya - VERIFIED LKR 25,521
- Occidental Paradise Dambulla: ~LKR 34,226/night (8.6 Booking.com, 438 reviews) - Address: Dambulla - VERIFIED LKR 34,226
Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- Sigiriya Village Hotel (premium rooms): ~LKR 35,000-45,000/night (4.2 rating, 2055 reviews) - Address: Hotel Rd, Sigiriya
- Sigiriya King's Resort: ~LKR 55,000-80,000/night (3-star, luxury treehouse) - Address: Sigiriya
- Aliya Resort & Spa: ~LKR 70,000-100,000/night (luxury resort) - Address: Habarana
- Cinnamon Lodge Habarana: ~LKR 43,850/night (8.8 Booking.com, 834 reviews) - Address: Habarana - VERIFIED LKR 43,850
- Tree Trails Sigiriya: ~LKR 52,589/night (9.5 Booking.com, 175 reviews) - Address: Sigiriya - VERIFIED LKR 52,589
- Amaara Forest Hotel Sigiriya: ~LKR 42,226/night (8.1 Booking.com, 264 reviews) - Address: Sigiriya - VERIFIED LKR 42,226
- Water Garden Sigiriya: ~LKR 100,000-150,000/night (ultra-luxury, private villas, ~$479 avg) - ULTRA-LUXURY

KANDY (VERIFIED 2026 prices):
⚠️ LUXURY - DO NOT show with fake prices:
- Aarunya Nature Resort & Spa: LKR 80,000-110,000/night (ultra-luxury)
- Kings Pavilion: LKR 60,000+ (boutique luxury)

Budget (LKR 5,000-15,000/night):
- Kandy City Hostel: ~LKR 4,000-6,000/night (4.0 rating) - Address: 18/1 Saranankara Rd, Kandy
- McLeod Inn: ~LKR 10,214/night (4.5 rating, 177 reviews, guest house) - Address: 65A Rajaphilla Mawata, Kandy - VERIFIED Booking.com LKR 10,214/night. NOT a hotel - it's a guest house!
- Sharon Inn: ~LKR 4,148/night (3.9 rating) - Address: 59 Saranankara Rd, Kandy - VERIFIED Booking.com LKR 4,148/night. (views of Kandy Lake, 10 min walk to Temple of Tooth)
- Nature Walk Resort: ~LKR 7,733/night (4.3 rating, 367 reviews, 3-star hotel) - Address: Hantana Rd, Kandy - VERIFIED Booking.com LKR 7,733/night. Budget-friendly 3-star!
- Sevana City Hotel: ~LKR 8,000-12,000/night (8.1 rating) - Address: Kandy City - VERIFIED
- Square Peg: ~LKR 10,000-14,000/night (9.2 rating) - Address: Kandy City - VERIFIED
- Mount Palace: ~LKR 4,640/night (8.0 Booking.com, 600 reviews) - Address: Kandy - VERIFIED LKR 4,640
- Hotel Cassendra: ~LKR 14,252/night (8.2 Booking.com, 1,217 reviews) - Address: Kandy - VERIFIED LKR 14,252
- Queens mount Ridge: ~LKR 6,686/night (7.9 Booking.com, 1,315 reviews) - Address: Kandy - VERIFIED Booking.com LKR 6,686/night.
- LOUIS LAKE VILLA: ~LKR 4,454/night (8.9 Booking.com, 210 reviews) - Address: Kandy - VERIFIED LKR 4,454
- Galaxy City Hotel: ~LKR 7,672/night (8.7 Booking.com, 861 reviews) - Address: Kandy - VERIFIED LKR 7,672
- Bed Station 210: ~LKR 7,223/night (7.1 Booking.com, 474 reviews) - Address: Kandy - VERIFIED LKR 7,223
- Kandy City Oasis Hotel: ~LKR 13,224/night (8.9 Booking.com, 1,001 reviews) - Address: Kandy - VERIFIED LKR 13,224
- Villa Mount Melody: ~LKR 12,064/night (8.7 Booking.com, 499 reviews) - Address: Kandy - VERIFIED LKR 12,064
- Hill Country Villa: ~LKR 9,899/night (8.8 Booking.com, 276 reviews) - Address: Kandy - VERIFIED LKR 9,899
- Orchid Villa Kandy: ~LKR 12,992/night (8.2 Booking.com, 330 reviews) - Address: Kandy - VERIFIED LKR 12,992

Mid-range (LKR 15,000-40,000/night):
- Queen's Hotel: ~LKR 24,000-28,000/night (4.0 rating, heritage) - Address: Dalada Veediya, Kandy (city center, opposite Temple of Tooth)
- Earl's Regency Hotel: ~LKR 28,000-35,000/night (4.1 rating, 5-star) - Address: Tennekumbura, Kandy
- Theva Residency: ~LKR 25,000-32,000/night (4.3 rating) - Address: Heerassagala, Kandy (hillside views)
- Hotel Suisse Kandy: ~LKR 25,000-30,000/night (4.0 rating, 2559 reviews, 4-star on Google Maps. Booking.com name: "Hotel Suisse Kandy - Since 1890", 5-star, 8.3 score, 635 reviews) - Address: 30 Sangaraja Mawatha, Kandy (near lake) - VERIFIED Google Maps LKR 27,469/night. ⚠️ Booking.com much higher: LKR 63,411/night! Often NO availability. Pool, heritage building.
- OZO Kandy: ~LKR 18,000-22,000/night (4.2 rating) - Address: 35 Sangaraja Mawatha, Kandy
- The Radh Hotel: ~LKR 25,000-35,000/night (8.5 rating, 4-star) - Address: Colombo Street, Kandy - VERIFIED
- 360 Viewpoint by Queens Mount: ~LKR 15,894/night (7.8 Booking.com, 582 reviews) - Address: Kandy - VERIFIED LKR 15,894
- Hotel Travellers Nest Kandy: ~LKR 16,586/night (7.4 Booking.com, 631 reviews) - Address: Kandy - VERIFIED LKR 16,586
- Eagle Regency Hotel: ~LKR 25,552/night (7.6 Booking.com, 441 reviews) - Address: Kandy - VERIFIED LKR 25,552
- IRIS Kandy: ~LKR 20,046/night (8.6 Booking.com, 320 reviews) - Address: Kandy - VERIFIED LKR 20,046
- Kandy Myst by Cinnamon: ~LKR 29,697/night (9.0 Booking.com, 703 reviews) - Address: Kandy - VERIFIED LKR 29,697

Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- Theva Residency (premium rooms): ~LKR 35,000-45,000/night (4.3 rating, hillside views) - Address: Heerassagala, Kandy - AFFORDABLE luxury!
- Mahaweli Reach Hotel: ~LKR 40,000-50,000/night (4.2 rating, riverside) - Address: Kandy
- Earl's Regency Hotel (lake view rooms): ~LKR 45,000-55,000/night (4.1 rating, 5-star) - Address: Tennekumbura, Kandy
- Kings Pavilion: ~LKR 55,000-70,000/night (boutique luxury) - Address: Kandy
- The Golden Crown Hotel: ~LKR 45,000-60,000/night (8.8 rating, 5-star) - Address: Ampitiya, Kandy - VERIFIED
- Aarunya Nature Resort & Spa: ~LKR 80,000-110,000/night (4.6 rating, nature retreat) - ULTRA-LUXURY

ANURADHAPURA (VERIFIED 2026 prices):
Budget (LKR 3,000-15,000/night):
- Emarald Holiday Homes: ~LKR 3,403/night (8.4 Booking.com, 127 reviews, dorm) - Address: Anuradhapura - VERIFIED LKR 3,403
- Levi's Tourist - Anuradhapura: ~LKR 4,640/night (8.5 Booking.com, 719 reviews) - Address: Anuradhapura - VERIFIED LKR 4,640
- CTC Receptions: ~LKR 5,259/night (7.5 Booking.com, 183 reviews) - Address: Anuradhapura - VERIFIED LKR 5,259
- Deanna Inn: ~LKR 6,404/night (8.6 Booking.com, 17 reviews) - Address: Anuradhapura - VERIFIED LKR 6,404
- Sudunelum Holiday Resort: ~LKR 6,496/night (8.1 Booking.com, 235 reviews) - Address: Anuradhapura - VERIFIED LKR 6,496
- Sacred City Tourist Resort: ~LKR 7,115/night (8.8 Booking.com, 401 reviews) - Address: Anuradhapura - VERIFIED LKR 7,115
- The Ivy Lake: ~LKR 8,464/night (8.4 Booking.com, 607 reviews) - Address: Anuradhapura - VERIFIED LKR 8,464
- Isi Arana Eco Villa: ~LKR 10,781/night (7.6 Booking.com, 70 reviews) - Address: Anuradhapura - VERIFIED LKR 10,781
- Hotel 4 U Saliya Garden: ~LKR 11,755/night (8.1 Booking.com, 664 reviews) - Address: Anuradhapura - VERIFIED LKR 11,755
- Amuththa Resort: ~LKR 12,529/night (9.0 Booking.com, 18 reviews) - Address: Anuradhapura - VERIFIED LKR 12,529
- London Palace: ~LKR 14,539/night (8.1 Booking.com, 147 reviews) - Address: Anuradhapura - VERIFIED LKR 14,539

Mid-range (LKR 15,000-40,000/night):
- Hotel White House: ~LKR 16,677/night (8.2 Booking.com, 648 reviews) - Address: Anuradhapura - VERIFIED LKR 16,677
- Diyakawa Boutique Hotel: ~LKR 21,160/night (8.2 Booking.com, 266 reviews) - Address: Anuradhapura - VERIFIED LKR 21,160
- Hotel Bella Vista: ~LKR 21,299/night (8.1 Booking.com, 402 reviews) - Address: Anuradhapura - VERIFIED LKR 21,299
- Kubura Resort: ~LKR 28,036/night (8.1 Booking.com, 1,099 reviews) - Address: Anuradhapura - VERIFIED LKR 28,036

TRINCOMALEE (VERIFIED 2026 Google/Booking.com prices):
⚠️ DO NOT invent hotel names for Trincomalee - use verified list only
⚠️ "Club Oceanic" DOES NOT EXIST - Google Maps shows no such hotel. Do NOT suggest it! (likely confused with "Pearl Oceanic Resort")
⚠️ "Fernando's Inn" exists ONLY in Negombo on Booking.com, NOT in Trincomalee! DO NOT suggest!

Budget (LKR 3,000-15,000/night) - MANY options, vary your picks!:
- Coconut Beach Resort - Trincomalee: ~LKR 7,000-10,000/night (4.1 rating, 36 reviews) - Address: Uppuveli Beach, Trincomalee - use EXACT name for Booking.com
- C U Hostel: ~LKR 4,000-7,000/night (4.8 rating, top-rated hostel) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps
- Amila Guest House: ~LKR 3,700-5,000/night (budget guesthouse) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps LKR 3,700
- Siva Villas: ~LKR 5,000-8,000/night (budget) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps LKR 5,930
- TJ Janse Guest Inn: ~LKR 4,000-6,000/night (budget) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps
- HOME STAY RESORT: ~LKR 4,000-6,000/night (budget homestay) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps
- Season Villa: ~LKR 3,800-5,500/night (budget) - Address: near Uppuveli, Trincomalee - VERIFIED Google Maps LKR 3,799
- Golden Beach Hotel & Restaurant: ~LKR 6,000-10,000/night (budget) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps
- Alles Beach Hotel: ~LKR 6,000-9,000/night (2.5 rating, 4 reviews - low quality) - Address: Uppuveli, Trincomalee - only suggest as last resort
- Trinco Waves: ~LKR 6,000-9,000/night (4.1 rating, 25 reviews, 3-star) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps
- Aathi Resort: ~LKR 6,000-10,000/night (budget) - Address: Uppuveli area, Trincomalee - VERIFIED Google Maps

Mid-range (LKR 15,000-45,000/night):
- Pearl Oceanic Resort: ~LKR 16,000-20,000/night (4.5 rating, 224 reviews, 3-star) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps LKR 16,400
- Pleasant Park Holiday Inn: ~LKR 12,000-18,000/night (4.5 rating, 177 reviews, 3-star) - Address: Uppuveli, Trincomalee
- Uppuveli Beach by DSK: ~LKR 15,000-22,000/night (4.7 rating, 315 reviews) - Address: Uppuveli, Trincomalee
- Capital Trincomalee: ~LKR 15,000-20,000/night (9.1 Booking.com score, 83 reviews) - Address: Uppuveli, Trincomalee
- Pigeon Island Beach Resort: ~LKR 25,000-30,000/night (3.8 rating, 823 reviews, 3-star) - Address: Nilaveli, Trincomalee - VERIFIED Google Maps LKR 25,466/night
- Trinco Blu by Cinnamon: ~LKR 28,000-35,000/night (4.5 rating, 4063 reviews, 4-star, beachfront) - Address: Uppuveli, Trincomalee - VERIFIED Google Maps LKR 29,783/night
- Nilaveli Beach Hotel: ~LKR 18,000-25,000/night (4.0 rating, 3-star) - Address: Nilaveli, Trincomalee
- Amaranthe Bay Resort & Spa: ~LKR 28,000-35,000/night (4.5 rating, 966 reviews, 4-star) - Address: Alles Garden, Trincomalee - VERIFIED Google Maps LKR 29,986/night
- The Palm Beach Hotel Trincomalee: ~LKR 16,000-22,000/night (4.1 rating) - Address: Trincomalee

Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
⚠️ DO NOT create room type variants - suggest DIFFERENT properties!
- Trinco Blu by Cinnamon (premium): ~LKR 38,000-50,000/night (4.5 rating, 4063 reviews, 4-star) - Address: Uppuveli, Trincomalee - AFFORDABLE luxury!
- Amaranthe Bay Resort & Spa (premium): ~LKR 40,000-55,000/night (4.5 rating, 966 reviews, 4-star) - Address: Alles Garden, Trincomalee
- Nilaveli Beach Resort: ~LKR 45,000-60,000/night (4.0 rating, 4-star) - Address: Nilaveli, Trincomalee
- MRD Beach Hotel: ~LKR 45,000-55,000/night (4.2 rating, 4-star) - Address: Uppuveli, Trincomalee
- Trinco Blu by Cinnamon (suite): ~LKR 60,000-80,000/night (4.5 rating, 4-star) - Address: Uppuveli, Trincomalee
- Uga Jungle Beach: ~LKR 180,000-200,000/night (4.7 rating, 1679 reviews, 5-star) - Address: Kuchchaveli, Trincomalee - ULTRA-LUXURY, VERIFIED LKR 188,593/night

ANURADHAPURA (VERIFIED 2026 Google/Booking.com prices):
⚠️ DO NOT invent hotel names - use verified list only

Budget (LKR 5,000-15,000/night):
- Randiya Hotel: ~LKR 8,000-11,000/night (4.0 rating) - Address: Anuradhapura
- Lake View Hotel Anuradhapura: ~LKR 9,000-13,000/night (4.1 rating) - Address: Anuradhapura (near Nuwara Wewa)
- Milano Tourist Rest: ~LKR 7,000-9,000/night (4.0 rating) - Address: 153 Maithreepala Senanayake Mawatha, Anuradhapura - VERIFIED Google Maps LKR 7,408
- Cielstar Resort: ~LKR 8,000-12,000/night (9.0 rating) - Address: Anuradhapura - VERIFIED
- D-Family Resort: ~LKR 10,000-13,000/night (4.3 rating, 244 reviews, 2-star) - Address: No 11, Freeman Mawatha, Anuradhapura - VERIFIED Google Maps LKR 12,000
- Anuradhapura Villa by TEMCO: ~LKR 12,000-15,000/night (4.4 rating, 31 reviews) - Address: Freeman Mawatha, Anuradhapura - VERIFIED Google Maps LKR 12,978
- Forest Edge Villa: ~LKR 7,500-10,000/night (9.0 rating) - Address: Anuradhapura - VERIFIED Google Maps LKR 8,883

⚠️ POSSIBLY NON-EXISTENT: "Shalini Guest House" - verify before suggesting

Mid-range (LKR 15,000-40,000/night):
- Palm Garden Village Hotel: ~LKR 18,000-25,000/night (4.2 rating, 3-star) - Address: Post 42, Puttalam Road, Pandulagama, Anuradhapura - VERIFIED
- Chaaya Citadel Anuradhapura: ~LKR 22,000-28,000/night (4.1 rating, 4-star) - Address: Anuradhapura
- The Sanctuary at Tissawewa: ~LKR 42,876/night (8.0 rating, 2-star, heritage) - Address: Near Tissawewa tank, Anuradhapura
- Hotel Heladiv: ~LKR 18,000-22,000/night (9.1 rating) - Address: Anuradhapura - VERIFIED Google Maps LKR 20,009
- Rajarata Hotel: ~LKR 18,000-24,000/night (4.1 rating, 4-star) - Address: Anuradhapura - VERIFIED
- Lolu Village Resort: ~LKR 21,000-26,000/night (3-star, pool) - Address: Anuradhapura - VERIFIED Google Maps LKR 23,792
- The Lakeside at Nuwarawewa: ~LKR 32,791/night (6.6 rating, 3-star) - Address: Anuradhapura - VERIFIED
- PEONY luxury Homestay - Anuradhapura: ~LKR 26,295/night (8.0 rating) - Address: Anuradhapura City Centre - VERIFIED
- Kings Town Hotel Anuradhapura: ~LKR 24,439/night (3-star) - Address: Anuradhapura City Centre - VERIFIED
- Hotel Alakamanda: ~LKR 32,825/night (7.8 rating, 3-star) - Address: Anuradhapura - VERIFIED

⚠️ LUXURY - DO NOT show as mid-range:
- Ulagalla by Uga Escapes: LKR 35,000-90,000/night (4.5 rating, boutique/luxury eco resort) - ranges from mid-range rooms to luxury villas

Luxury (LKR 35,000+/night - wide range, pick based on user's BUDGET!):
⚠️ IMPORTANT: Luxury has a WIDE price range. Pick hotels that FIT the user's budget!
- The Sanctuary at Tissawewa (premium): ~LKR 42,876/night (8.0 rating, 2-star, heritage) - Address: Anuradhapura - AFFORDABLE luxury!
- Ulagalla by Uga Escapes (rooms): ~LKR 45,000-60,000/night (4.5 rating, eco resort) - Address: Thirappane, Anuradhapura
- Ulagalla by Uga Escapes (villas): ~LKR 70,000-90,000/night (4.5 rating, luxury eco resort) - ULTRA-LUXURY
- Maho Boutique Hotel: ~LKR 36,333/night (9.7 rating, 4-star luxury) - Address: Anuradhapura - VERIFIED
- Golden Gate Ceylon: ~LKR 50,000-65,000/night (5-star luxury) - Address: Anuradhapura - VERIFIED
- Kaala Kalaththewa Luxury Eco Resort: ~LKR 33,707/night (9.2 rating, eco luxury villas) - Address: Anuradhapura - VERIFIED

JAFFNA (VERIFIED 2026 Google/Booking.com prices):
⚠️ DO NOT invent hotel names for Jaffna - use verified list only
⚠️ "Quest Hotel Jaffna" - DOES NOT EXIST on Google Maps! Do NOT suggest!
⚠️ "Lux Manor Hotel" / "Lux Manor Guest House" - DOES NOT EXIST! Google Maps shows no such hotel.
⚠️ "Hotel Tilko Jaffna" - WRONG NAME! Real name is "Tilko Jaffna City Hotel"
⚠️ "Rio Hotel Jaffna" / "Blue Haven Guest House" / "Subhas Hotel" - UNVERIFIED, may not exist

Budget (LKR 4,000-15,000/night) - MANY verified options, vary your picks!:
- J Hotel - Jaffna: ~LKR 8,000-12,000/night (4.6 rating, 2516 reviews, 3-star, cafe & garden) - Address: Jaffna - VERIFIED Google Maps. TOP-RATED budget option!
- US Hotel: ~LKR 7,000-10,000/night (3.8 rating, 1642 reviews, 1-star) - Address: Jaffna - VERIFIED Google Maps. Free parking, breakfast, WiFi.
- Mathura Guest House: ~LKR 5,000-8,000/night (4.0 rating, 66 reviews, 2-star) - Address: Jaffna - VERIFIED Google Maps
- Bosco Guest House: ~LKR 4,000-7,000/night (budget) - Address: Jaffna - VERIFIED Google Maps
- Berty's Cottage Home Stay: ~LKR 4,000-6,000/night (budget homestay) - Address: Jaffna - VERIFIED Google Maps
- Four Seasons Guest House: ~LKR 5,000-8,000/night (budget) - Address: Jaffna - VERIFIED Google Maps
- Jaffna Bright Hotel: ~LKR 6,000-10,000/night (budget) - Address: Jaffna - VERIFIED Google Maps
- Station Garden Hotel - Jaffna: ~LKR 7,000-11,000/night (budget) - Address: Jaffna - VERIFIED Google Maps

Mid-range (LKR 15,000-40,000/night):
- Tilko Jaffna City Hotel: ~LKR 20,000-25,000/night (3.9 rating, 1146 reviews, 4-star) - Address: Jaffna - VERIFIED Google Maps LKR 21,821/night. Use EXACT name "Tilko Jaffna City Hotel"!
- Nallur Residence: ~LKR 15,000-20,000/night (4.8 rating, 121 reviews) - Address: Nallur, Jaffna - VERIFIED Google Maps. Top-rated!
- Jaffna Heritage Villa: ~LKR 22,000-28,000/night (3.9 rating, 69 reviews, 4-star) - Address: Jaffna - VERIFIED Google Maps
- Jetwing Jaffna: ~LKR 27,000-35,000/night (4.4 rating, 4-star, sea-facing) - Address: Mahatma Gandhi Road, Jaffna - VERIFIED
- North Gate Hotel: ~LKR 35,000-40,000/night (4.3 rating, 1352 reviews, 4-star) - Address: Jaffna - VERIFIED Google Maps LKR 37,800/night
- Jaffna City Palace Hotel: ~LKR 15,000-20,000/night (budget-mid) - Address: Jaffna - VERIFIED Google Maps

Luxury (LKR 45,000+/night):
- Thambu Illam: ~LKR 45,000-50,000/night (4.4 rating, 100 reviews, guesthouse with pool) - Address: Jaffna - VERIFIED Google Maps LKR 46,315/night (Booking.com)
- North Gate Hotel (premium): ~LKR 45,000-55,000/night (4.3 rating, 1352 reviews, 4-star) - Address: Jaffna
- Jetwing Jaffna (premium): ~LKR 55,000-70,000/night (4.4 rating) - Address: Mahatma Gandhi Road, Jaffna
- Jetwing Mahesa Bhawan: ~LKR 45,000-55,000/night (9.4 rating, 5-star) - Address: Chundikuli, Jaffna - VERIFIED
- The Thinnai Hotel - Jaffna: ~LKR 38,000-60,000/night (9.1 rating, 4-star) - Address: Thirunelveli, Jaffna - VERIFIED
- Fox Jaffna by Fox Resorts: ~LKR 35,000-55,000/night (8.8 rating, boutique heritage) - Address: Kokkuvil, Jaffna - VERIFIED

COLOMBO - Additional Mid-range options (LKR 15,000-40,000/night):
- Hilton Colombo Residencies: ~LKR 25,000-32,000/night (4.3 rating, Echelon Square) - VERIFIED
- Hotel Janaki: ~LKR 16,000-20,000/night (4.0 rating, Kollupitiya)
- Ramada Colombo: ~LKR 18,000-24,000/night (4.0 rating, Wellawatte)

⚠️ ACCOMMODATION SELECTION PRIORITY (FOLLOW THIS ORDER):

❌❌❌ HARD PRICE CAP - MOST IMPORTANT RULE ❌❌❌
The user's TOTAL budget is LKR ${budget.toLocaleString()} for ${duration} night(s).
Accommodation should be MAX ~45% of the total budget.
👉 MAXIMUM per-night price: LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night
� MAXIMUM total accommodation: LKR ${Math.round(budget * 0.45).toLocaleString()} for ${duration} night(s)
❌ Do NOT suggest ANY hotel with pricePerNight above LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}!
❌ Even if user selected "luxury" - if budget can't afford it, suggest the BEST hotel they CAN afford!
Example for THIS trip: Budget LKR ${budget.toLocaleString()} ÷ ${duration} nights × 45% = LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night max.
${Math.round(budget * 0.45 / duration) < effectiveAccomMin ? `⚠️ WARNING: User's budget can NOT afford ${accommodationType} minimum (LKR ${effectiveAccomMin.toLocaleString()}/night). Suggest the best available within LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night instead!` : ''}

1. 💰 BUDGET-SMART (HIGHEST PRIORITY): ALL 3 accommodation recommendations MUST have pricePerNight ≤ LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}
2. 🎯 PRICE RANGE: Try to match the ${accommodationType} range (LKR ${effectiveAccomMin.toLocaleString()}-${effectiveAccomMax.toLocaleString()}) BUT only if it fits within the budget cap above
3. 📍 LOCATION: Prefer hotels near the day's main attractions
4. ⭐ RATINGS: A 3.5-4.0 star hotel at the RIGHT price is BETTER than a 4.5 star hotel the user cannot afford
5. ✅ VERIFIED NAMES: Use ONLY hotels from the verified lists above
6. 🎲 VARIETY: Pick 3 DIFFERENT hotel properties - do NOT always pick the same top 3!
   Each call, choose from different entries in the list so users see variety when they refresh.
   ⚠️ NEVER suggest the same hotel twice with different room types (e.g. "Trinco Blu Premium Room" + "Trinco Blu Ocean View Suite" = WRONG!)
   Each recommendation MUST be a DIFFERENT property/building. 3 recommendations = 3 different hotels, no exceptions.

ACCEPTABLE LOWER-RATED OPTIONS (if price is accurate):
- 3.5-3.9 rating hotels are FINE if price matches user's budget
- 2-3 star properties are acceptable for "budget" category
- Guesthouses and homestays are valid budget options

EXAMPLE - User selects "luxury" with LKR 100,000 total budget for 2 nights:
- Budget cap: LKR 100,000 × 45% ÷ 2 = LKR 22,500/night max
- ✅ CORRECT: Sunset Fort Hotel (~LKR 22,000/night) - fits budget!
- ❌ WRONG: Fort Bazaar (~LKR 140,000/night) - 6x over budget! NEVER suggest!
- ❌ WRONG: Galle Fort Hotel (~LKR 200,000/night) - 9x over budget! NEVER suggest!

🔢 MANDATORY: Show EXACTLY 3 accommodation options, ALL with pricePerNight ≤ LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}.
Never show fewer than 3. Order them: budget-friendly first, mid-value second, premium-of-range third.

CRITICAL REQUIREMENTS:
1. Include ONLY real, VERIFIED places that exist in ${destination}
2. Provide accurate GPS coordinates for each location
3. 🎯 MATCH INTERESTS: At least 70% of attractions MUST match the user's selected interests: [${interests.join(', ') || 'general'}]. This is NOT optional!
4. Include ${attractionsCount} TOP attractions (at least ${Math.ceil(attractionsCount / duration)} per day - mix of popular + hidden gems matching interests). NEVER include fewer than 5 per day!
5. Include ${restaurantsCount} BEST local restaurants (${Math.ceil(restaurantsCount / duration)} per day - authentic cuisine)
6. DISTRIBUTE items EVENLY across all ${duration} days using "recommendedDay". Each day MUST have at least 5 attractions and 2 restaurants. Group nearby places on the same day for walkability. Do NOT put all items on Day 1!
7. Include 3 accommodations STRICTLY in the "${accommodationType}" price range (LKR ${effectiveAccomMin.toLocaleString()}-${effectiveAccomMax.toLocaleString()}/night). NEVER suggest a luxury hotel when user selected budget/midrange!
8. Set "type": "${accommodationType}" for ALL accommodations - they must ALL match the user's selected type
9. Use EXACT hotel names from the verified lists - do not make up names
10. CRITICAL ANTI-HALLUCINATION RULE: Use EXACT \`pricePerNight\` values precisely as they appear in the verified lists! 
    - DO NOT make up prices.
    - DO NOT calculate an average.
    - NEVER assign the identical price to all 3 hotels! 
    - YOU MUST extract the exact price string from the verified list provided.
11. REQUIRED: ALWAYS show realistic Booking.com prices matching exactly what is in the prompt instead of Google Maps generic estimates.
12. Match accommodation type to "${accommodationType}" when budget allows${excludeInstruction}

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
    "accommodationType": "${accommodationType}",
    "transportMode": "${transportMode}",
    "highlights": ["array of 3-5 trip highlights"]
  },
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme",
      "geographicZone": "Area/neighborhood name (e.g., 'Galle Fort District', 'Unawatuna Beach Area')",
      "zoneDescription": "Why these attractions are grouped together (proximity, logical flow)",
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
      "category": "nature|culture|adventure|history|religious|beach|food|photography|shopping|wildlife|nightlife",
      "recommendedDay": 1
    }
  ],
  "recommendedRestaurants": [
    {
      "name": "REAL restaurant name (must exist)",
      "cuisine": "Cuisine type (Sri Lankan, Indian, Chinese, etc.)",
      "specialty": "Must-try signature dish",
      "priceRange": "$|$$|$$$",
      "averageCost": 1000,
      "rating": 4.5,
      "location": "Specific location/area",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "recommendedDay": 1
    }
  ],
  "recommendedAccommodations": [
    {
      "name": "Real ${accommodationType} hotel in ${destination} - USE EXACT NAME from verified list",
      "type": "${accommodationType}",
      "pricePerNight": ${Math.min(effectiveAccomMin, Math.round(budget * 0.45 / duration))},
      "totalCost": ${Math.min(effectiveAccomMin, Math.round(budget * 0.45 / duration)) * duration},
      "location": "REAL Google Maps address from verified list (e.g. 'Uppuveli, Trincomalee' or 'Inamaluwa, Sigiriya' or 'Galle Fort, Galle'). MUST be searchable on Google Maps! Do NOT include parenthetical descriptions like '(1.8km from rock)' or '(near beach)' - these break Google Maps search!",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "amenities": ["WiFi", "AC", "Restaurant"],
      "rating": 4.0,
      "whyRecommended": "Best value option within budget cap of LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night"
    },
    {
      "name": "Another real ${accommodationType} hotel",
      "type": "${accommodationType}",
      "pricePerNight": ${Math.min(Math.round((effectiveAccomMin + effectiveAccomMax) / 2), Math.round(budget * 0.45 / duration))},
      "totalCost": ${Math.min(Math.round((effectiveAccomMin + effectiveAccomMax) / 2), Math.round(budget * 0.45 / duration)) * duration},
      "location": "Use the EXACT address from the verified hotel list above - must be searchable on Google Maps",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "amenities": ["WiFi", "Pool", "Breakfast"],
      "rating": 4.2,
      "whyRecommended": "Mid-value option within budget cap of LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night"
    },
    {
      "name": "Third verified ${accommodationType} hotel",
      "type": "${accommodationType}",
      "pricePerNight": ${Math.round(budget * 0.45 / duration)},
      "totalCost": ${Math.round(budget * 0.45 / duration) * duration},
      "location": "Prime location",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "amenities": ["WiFi", "Spa", "Fine dining"],
      "rating": 4.3,
      "whyRecommended": "Premium option at the budget cap of LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}/night"
    }
  ],
  "budgetNote": "⚠️ ALL hotels MUST have pricePerNight ≤ LKR ${Math.round(budget * 0.45 / duration).toLocaleString()}. Do NOT exceed this cap even for ${accommodationType}!",
  "budgetWarning": {
    "insufficient": ${!isBudgetSufficient},
    "shortfall": ${budgetShortfall},
    "recommendedBudget": ${recommendedBudget},
    "message": "${!isBudgetSufficient ? `Your budget is insufficient for ${accommodationType} accommodation. You need LKR ${budgetShortfall.toLocaleString()} more, or increase budget to LKR ${recommendedBudget.toLocaleString()}.` : ''}"
  },
  "transportEstimate": {
    "mode": "${transportMode}",
    "dailyCost": ${selectedTransport.avg},
    "totalCost": ${selectedTransport.avg * duration},
    "tips": ["transport-specific tips for ${destination}"]
  },
  "budgetBreakdown": { 
    "accommodation": ${(() => {
      // Budget-aware accommodation estimate: cap at what user can actually afford, UNLESS they picked luxury
      const transportTotal = selectedTransport.avg * duration;
      const remainingAfterTransport = budget - transportTotal;
      const allocRatio = accommodationType === 'Luxury (4-5 star Resort)' || accommodationType === 'luxury' ? 0.80 : 0.45;
      const maxAccomFromBudget = Math.round(remainingAfterTransport * allocRatio);
      const avgAccomCost = Math.round((effectiveAccomMin + effectiveAccomMax) / 2) * duration;
      return accommodationType === 'Luxury (4-5 star Resort)' || accommodationType === 'luxury' 
        ? avgAccomCost // For luxury, show actual average cost regardless of strict constraints
        : Math.min(maxAccomFromBudget, avgAccomCost);
    })()}, 
    "food": ${(() => {
      const transportTotal = selectedTransport.avg * duration;
      const remainingAfterTransport = budget - transportTotal;
      const accomEstimate = Math.min(Math.round(remainingAfterTransport * 0.45), Math.round((effectiveAccomMin + effectiveAccomMax) / 2) * duration);
      const remainingAfterAccom = remainingAfterTransport - accomEstimate;
      return Math.round(remainingAfterAccom * 0.35); // 35% of remaining for food
    })()}, 
    "transport": ${selectedTransport.avg * duration}, 
    "activities": ${(() => {
      const transportTotal = selectedTransport.avg * duration;
      const remainingAfterTransport = budget - transportTotal;
      const accomEstimate = Math.min(Math.round(remainingAfterTransport * 0.45), Math.round((effectiveAccomMin + effectiveAccomMax) / 2) * duration);
      const remainingAfterAccom = remainingAfterTransport - accomEstimate;
      return Math.round(remainingAfterAccom * 0.55); // 55% of remaining for activities
    })()}, 
    "miscellaneous": ${Math.round(dailyBudget * 0.05 * duration)}, 
    "total": ${budget} 
  },
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
