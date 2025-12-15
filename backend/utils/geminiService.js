const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
async function generateTravelItinerary(tripDetails) {
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

    // Calculate daily budget
    const dailyBudget = Math.round(budget / duration);

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Create detailed prompt for Gemini
    const prompt = `You are an expert Sri Lankan travel planner with deep knowledge of local attractions, culture, cuisine, and hidden gems. Generate a detailed, personalized travel itinerary based on the following trip details:

**TRIP DETAILS:**
- Destination: ${destination}, Sri Lanka
- Start Date: ${startDate}
- End Date: ${endDate}
- Duration: ${duration} days
- Total Budget: LKR ${budget.toLocaleString()} (approximately LKR ${dailyBudget.toLocaleString()} per day)
- Group Size: ${groupSize} ${groupSize === 1 ? 'person' : 'people'}
- Interests: ${
      interests.length > 0 ? interests.join(', ') : 'General sightseeing'
    }
- Response Language: ${language}

**IMPORTANT INSTRUCTIONS:**
1. Create a realistic day-by-day itinerary that respects the budget constraints
2. Include specific times, locations with actual coordinates in Sri Lanka
3. Consider travel time between locations
4. Mix popular attractions with hidden local gems
5. Include authentic local restaurants and food recommendations
6. Account for ${groupSize} ${
      groupSize === 1 ? 'person' : 'people'
    } in cost estimates
7. Consider weather and best times to visit each attraction
8. Include practical tips specific to each location

**RESPOND WITH ONLY VALID JSON in this exact structure (no markdown, no code blocks, just pure JSON):**

{
  "tripSummary": {
    "destination": "${destination}",
    "duration": ${duration},
    "totalBudget": ${budget},
    "groupSize": ${groupSize},
    "bestTimeToVisit": "Brief description of weather/season",
    "overallTheme": "A catchy theme for the trip"
  },
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "theme": "Day theme (e.g., Arrival & Cultural Exploration)",
      "activities": [
        {
          "time": "09:00",
          "name": "Activity Name",
          "description": "Detailed description of the activity (2-3 sentences)",
          "duration": "2 hours",
          "location": "Specific location name",
          "coordinates": { "lat": 7.2906, "lng": 80.6337 },
          "cost": 5000,
          "currency": "LKR",
          "tips": "Practical tips for this activity",
          "category": "culture|nature|adventure|food|relaxation|shopping"
        }
      ],
      "meals": {
        "breakfast": {
          "name": "Restaurant/Place Name",
          "cuisine": "Sri Lankan/International/etc",
          "specialty": "Must-try dish",
          "priceRange": "$|$$|$$$",
          "estimatedCost": 1500,
          "location": "Location",
          "coordinates": { "lat": 7.2906, "lng": 80.6337 }
        },
        "lunch": { "same structure as breakfast" },
        "dinner": { "same structure as breakfast" }
      },
      "accommodation": {
        "name": "Hotel/Guesthouse Name",
        "type": "hotel|guesthouse|resort|hostel",
        "pricePerNight": 8000,
        "location": "Area name",
        "amenities": ["WiFi", "AC", "Pool"]
      },
      "transportation": {
        "mode": "tuk-tuk|taxi|bus|train|walking",
        "estimatedCost": 2000,
        "tips": "Transportation tips for the day"
      },
      "totalDayBudget": 25000,
      "dailyTips": ["Tip 1", "Tip 2"]
    }
  ],
  "topAttractions": [
    {
      "name": "Attraction Name",
      "description": "Brief description",
      "location": "Location",
      "coordinates": { "lat": 7.2906, "lng": 80.6337 },
      "entryFee": 2500,
      "bestTime": "Best time to visit",
      "duration": "Recommended duration",
      "rating": 4.5
    }
  ],
  "recommendedRestaurants": [
    {
      "name": "Restaurant Name",
      "cuisine": "Cuisine type",
      "specialty": "Signature dish",
      "priceRange": "$$",
      "rating": 4.5,
      "location": "Location",
      "coordinates": { "lat": 7.2906, "lng": 80.6337 }
    }
  ],
  "culturalTips": [
    "Important cultural tip 1",
    "Important cultural tip 2"
  ],
  "safetyTips": [
    "Safety tip 1",
    "Safety tip 2"
  ],
  "transportationGuide": {
    "gettingThere": "How to reach ${destination}",
    "localTransport": "Local transportation options",
    "tips": ["Transport tip 1", "Transport tip 2"],
    "estimatedTransportBudget": 15000
  },
  "packingList": [
    "Essential item 1",
    "Essential item 2"
  ],
  "emergencyContacts": {
    "police": "119",
    "ambulance": "110",
    "touristPolice": "1912",
    "nearestHospital": "Hospital name and location"
  },
  "budgetBreakdown": {
    "accommodation": 40000,
    "food": 30000,
    "transportation": 15000,
    "activities": 25000,
    "miscellaneous": 10000,
    "total": ${budget}
  }
}

Generate a complete, realistic itinerary with actual Sri Lankan locations, restaurants, and attractions. All coordinates must be real locations in Sri Lanka. Costs should be realistic for Sri Lanka in LKR.`;

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
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
    return {
      success: true,
      data: itinerary,
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
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

module.exports = {
  generateTravelItinerary,
  generateActivityRecommendations,
  generateFoodRecommendations,
};
