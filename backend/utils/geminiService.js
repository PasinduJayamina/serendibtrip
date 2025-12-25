const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  generateCacheKey,
  getCachedResponse,
  cacheResponse,
  estimateTokens,
  selectOptimalModel,
  createOptimizedItineraryPrompt,
  checkRateLimit,
} = require('./aiCostOptimizer');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Available models to try (in order of preference)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-001',
];

/**
 * Retry helper with exponential backoff and model fallback
 */
async function retryWithBackoff(promptFn, maxRetries = 2, initialDelay = 1500) {
  let lastError;

  // Try each model
  for (let modelIndex = 0; modelIndex < GEMINI_MODELS.length; modelIndex++) {
    const modelName = GEMINI_MODELS[modelIndex];
    const model = genAI.getGenerativeModel({ model: modelName });

    // Retry each model a few times
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(
          `🤖 Trying ${modelName} (attempt ${attempt + 1}/${maxRetries})...`
        );
        return await promptFn(model);
      } catch (error) {
        lastError = error;

        // If quota exceeded (429), immediately try next model
        if (error.status === 429) {
          console.log(`⚠️ ${modelName} quota exceeded, trying next model...`);
          break; // Move to next model
        }

        // If overloaded (503), retry same model with backoff
        if (error.status === 503 && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(
            `⏳ ${modelName} overloaded, retrying in ${delay / 1000}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors or last attempt, try next model
        if (modelIndex < GEMINI_MODELS.length - 1) {
          console.log(`⚠️ ${modelName} failed, trying next model...`);
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Generates a detailed travel itinerary for Sri Lanka using Google Gemini AI
 *
 * @async
 * @function generateTravelItinerary
 * @param {Object} tripDetails - The trip details object
 * @param {string} tripDetails.destination - Sri Lankan location (e.g., "Colombo", "Kandy")
 * @param {string} tripDetails.startDate - Trip start date in YYYY-MM-DD format
 * @param {string} tripDetails.endDate - Trip end date in YYYY-MM-DD format
 * @param {number} tripDetails.duration - Trip length in days
 * @param {number} tripDetails.budget - Total budget in LKR
 * @param {number} tripDetails.groupSize - Number of travelers
 * @param {string[]} tripDetails.interests - Array of interests (e.g., ["culture", "nature", "food"])
 * @param {string} [tripDetails.language="English"] - User's preferred language for the response
 * @returns {Promise<Object>} Generated itinerary object or error object
 *
 * @example
 * const itinerary = await generateTravelItinerary({
 *   destination: "Kandy",
 *   startDate: "2024-01-15",
 *   endDate: "2024-01-18",
 *   duration: 4,
 *   budget: 150000,
 *   groupSize: 2,
 *   interests: ["culture", "nature", "food"],
 *   language: "English"
 * });
 */
async function generateTravelItinerary(tripDetails, userId = 'anonymous') {
  try {
    // Validate required fields
    const {
      destination,
      startDate,
      endDate,
      duration,
      budget,
      groupSize,
      interests = [],
      language = 'English',
    } = tripDetails;

    if (
      !destination ||
      !startDate ||
      !endDate ||
      !duration ||
      !budget ||
      !groupSize
    ) {
      throw new Error('Missing required trip details');
    }

    // ============ COST OPTIMIZATION 1: Check rate limit ============
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${rateCheck.waitTime} seconds.`,
        code: 'RATE_LIMITED',
        retryAfter: rateCheck.waitTime,
      };
    }

    // ============ COST OPTIMIZATION 2: Check cache ============
    const cacheKey = generateCacheKey(tripDetails);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('💰 Saved API call with cache hit!');
      return {
        success: true,
        data: cachedResponse,
        fromCache: true,
      };
    }

    // ============ COST OPTIMIZATION 3: Use optimized prompt ============
    // This reduces tokens by ~40%
    const prompt = createOptimizedItineraryPrompt(tripDetails);
    const tokenEstimate = estimateTokens(prompt);
    console.log(`📊 Estimated input tokens: ${tokenEstimate}`);

    // ============ COST OPTIMIZATION 4: Select optimal model ============
    const recommendedModel = selectOptimalModel(tripDetails);
    console.log(`🎯 Using model: ${recommendedModel} (based on complexity)`);

    // Generate content using Gemini with retry and model fallback
    const result = await retryWithBackoff(async (model) => {
      return await model.generateContent(prompt);
    });

    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let itinerary;
    try {
      // Clean the response - remove any markdown code blocks if present
      let cleanedText = text.trim();

      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      itinerary = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', text);
      throw new Error('Failed to parse itinerary response. Please try again.');
    }

    // Add metadata to the response
    itinerary.metadata = {
      generatedAt: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      inputDetails: {
        destination,
        startDate,
        endDate,
        duration,
        budget,
        groupSize,
        interests,
        language,
      },
    };

    console.log(`✅ Generated itinerary for ${destination} (${duration} days)`);

    // ============ COST OPTIMIZATION 5: Cache the response ============
    cacheResponse(cacheKey, itinerary);
    console.log('💾 Response cached for future requests');

    return {
      success: true,
      data: itinerary,
      fromCache: false,
    };
  } catch (error) {
    console.error('❌ Error generating travel itinerary:', error);

    // Handle specific error types
    if (error.message?.includes('API key')) {
      return {
        success: false,
        error: 'Invalid API key. Please check your Gemini API configuration.',
        code: 'INVALID_API_KEY',
      };
    }

    if (error.message?.includes('quota')) {
      return {
        success: false,
        error: 'API quota exceeded. Please try again later.',
        code: 'QUOTA_EXCEEDED',
      };
    }

    if (error.message?.includes('Missing required')) {
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to generate itinerary. Please try again.',
      code: 'GENERATION_ERROR',
    };
  }
}

/**
 * Generates personalized activity recommendations based on user preferences
 *
 * @async
 * @function generateActivityRecommendations
 * @param {Object} params - Parameters for recommendations
 * @param {string} params.location - Current location in Sri Lanka
 * @param {string[]} params.interests - User's interests
 * @param {number} params.budget - Budget for activities in LKR
 * @param {string} params.timeOfDay - morning|afternoon|evening
 * @returns {Promise<Object>} Recommended activities
 */
async function generateActivityRecommendations(params) {
  try {
    const { location, interests = [], budget, timeOfDay = 'morning' } = params;

    if (!location) {
      throw new Error('Location is required');
    }

    const prompt = `You are a Sri Lankan travel expert. Suggest 5 activities near ${location}, Sri Lanka for someone interested in ${
      interests.join(', ') || 'general sightseeing'
    }.

Budget: LKR ${budget || 'flexible'}
Time: ${timeOfDay}

Respond with ONLY valid JSON (no markdown):
{
  "recommendations": [
    {
      "name": "Activity name",
      "description": "Brief description",
      "location": "Specific location",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "estimatedCost": 2500,
      "duration": "2 hours",
      "bestFor": ["interest1", "interest2"],
      "rating": 4.5,
      "tips": "Practical tip"
    }
  ]
}`;

    const result = await retryWithBackoff(async (model) => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    let text = response.text().trim();

    // Clean markdown if present
    if (text.startsWith('```')) {
      text = text
        .replace(/```json?\n?/g, '')
        .replace(/```$/g, '')
        .trim();
    }

    const recommendations = JSON.parse(text);

    return {
      success: true,
      data: recommendations,
    };
  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate recommendations',
    };
  }
}

/**
 * Generates local food recommendations for a Sri Lankan destination
 *
 * @async
 * @function generateFoodRecommendations
 * @param {string} location - Location in Sri Lanka
 * @param {string[]} preferences - Dietary preferences (vegetarian, spicy, etc.)
 * @param {number} budget - Budget per meal in LKR
 * @returns {Promise<Object>} Food recommendations
 */
async function generateFoodRecommendations(location, preferences = [], budget) {
  try {
    const prompt = `You are a Sri Lankan food expert. Recommend local food experiences in ${location}, Sri Lanka.

Preferences: ${preferences.join(', ') || 'No specific preferences'}
Budget per meal: LKR ${budget || 'flexible'}

Respond with ONLY valid JSON (no markdown):
{
  "restaurants": [
    {
      "name": "Restaurant name",
      "cuisine": "Type",
      "specialty": "Must-try dish",
      "priceRange": "$$",
      "location": "Address",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "rating": 4.5,
      "tip": "Local tip"
    }
  ],
  "streetFood": [
    {
      "name": "Food item",
      "description": "Description",
      "whereToFind": "Location",
      "price": 200,
      "tip": "Tip"
    }
  ],
  "mustTryDishes": ["Dish 1", "Dish 2"]
}`;

    const result = await retryWithBackoff(async (model) => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    let text = response.text().trim();

    if (text.startsWith('```')) {
      text = text
        .replace(/```json?\n?/g, '')
        .replace(/```$/g, '')
        .trim();
    }

    const recommendations = JSON.parse(text);

    return {
      success: true,
      data: recommendations,
    };
  } catch (error) {
    console.error('❌ Error generating food recommendations:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate food recommendations',
    };
  }
}

/**
 * Generates a conversational chat response for the AI Travel Concierge
 * 
 * @async
 * @function generateChatResponse
 * @param {Object} params - Chat parameters
 * @param {string} params.message - User's message
 * @param {Array} params.conversationHistory - Previous messages for context
 * @param {Object} params.userContext - User preferences and info
 * @returns {Promise<Object>} Chat response with suggestions
 */
async function generateChatResponse(params) {
  try {
    const { message, conversationHistory = [], userContext } = params;

    if (!message) {
      throw new Error('Message is required');
    }

    // Build conversation context
    const historyContext = conversationHistory
      .slice(-6) // Keep last 6 messages for context
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // User context for personalization
    const userInfo = userContext ? `
User Information:
- Name: ${userContext.name || 'Guest'}
- Interests: ${userContext.preferences?.interests?.join(', ') || 'Not specified'}
- Budget preference: ${userContext.preferences?.budget || 'Not specified'}
` : '';

    const systemPrompt = `You are SerendibAI, a friendly and knowledgeable Sri Lanka travel assistant. Your personality:
- Warm, helpful, and enthusiastic about Sri Lanka
- Expert in Sri Lankan destinations, culture, food, and activities
- Give practical, actionable advice with local insights
- Keep responses concise (2-4 paragraphs max)
- Use emojis sparingly but effectively (🌴 🏛️ 🍛 etc.)
- Suggest follow-up actions when relevant

${userInfo}

${historyContext ? `Recent conversation:\n${historyContext}\n` : ''}

Current user message: ${message}

Respond naturally and helpfully. If the user asks about:
- Places: Suggest specific attractions with brief descriptions
- Food: Recommend local dishes and where to find them
- Weather: Give seasonal advice and what to pack
- Planning: Help structure their trip with practical tips
- Anything else: Be helpful and connect it to Sri Lanka travel when possible

Format your response as conversational text. At the end, if relevant, suggest 2-3 follow-up questions the user might want to ask.`;

    const result = await retryWithBackoff(async (model) => {
      return await model.generateContent(systemPrompt);
    });

    const response = await result.response;
    let text = response.text().trim();

    // Extract suggestions from the response if present
    const suggestions = [];
    const suggestionMatch = text.match(/(?:You might also want to know:|Follow-up questions:|You could also ask:)([\s\S]*?)$/i);
    if (suggestionMatch) {
      const suggestionText = suggestionMatch[1];
      const matches = suggestionText.match(/[-•]\s*([^\n]+)/g);
      if (matches) {
        matches.forEach(match => {
          const suggestion = match.replace(/^[-•]\s*/, '').trim();
          if (suggestion.length > 10 && suggestion.length < 100) {
            suggestions.push(suggestion);
          }
        });
      }
      // Remove suggestions from main response
      text = text.replace(suggestionMatch[0], '').trim();
    }

    console.log(`💬 Generated chat response (${text.length} chars)`);

    return {
      success: true,
      response: text,
      suggestions: suggestions.slice(0, 3),
    };
  } catch (error) {
    console.error('❌ Error generating chat response:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate response',
    };
  }
}

module.exports = {
  generateTravelItinerary,
  generateActivityRecommendations,
  generateFoodRecommendations,
  generateChatResponse,
};
