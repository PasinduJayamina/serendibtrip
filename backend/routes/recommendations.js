const express = require('express');
const router = express.Router();
const {
  generateTravelItinerary,
  generateActivityRecommendations,
  generateFoodRecommendations,
  generateChatResponse,
  generatePackingList,
} = require('../utils/geminiService');

/**
 * @route   POST /api/recommendations/itinerary
 * @desc    Generate a complete travel itinerary
 * @access  Public
 */
router.post('/itinerary', async (req, res) => {
  try {
    const {
      destination,
      startDate,
      endDate,
      duration,
      budget,
      groupSize,
      interests,
      language,
    } = req.body;

    // Validate required fields
    if (
      !destination ||
      !startDate ||
      !endDate ||
      !duration ||
      !budget ||
      !groupSize
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: destination, startDate, endDate, duration, budget, groupSize',
      });
    }

    const result = await generateTravelItinerary({
      destination,
      startDate,
      endDate,
      duration: parseInt(duration),
      budget: parseInt(budget),
      groupSize: parseInt(groupSize),
      interests: interests || [],
      language: language || 'English',
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Itinerary generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate itinerary',
    });
  }
});

/**
 * @route   POST /api/recommendations/activities
 * @desc    Get activity recommendations for a location
 * @access  Public
 */
router.post('/activities', async (req, res) => {
  try {
    const { location, interests, budget, timeOfDay } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required',
      });
    }

    const result = await generateActivityRecommendations({
      location,
      interests: interests || [],
      budget: budget ? parseInt(budget) : undefined,
      timeOfDay: timeOfDay || 'morning',
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Activity recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate activity recommendations',
    });
  }
});

/**
 * @route   POST /api/recommendations/food
 * @desc    Get food and restaurant recommendations
 * @access  Public
 */
router.post('/food', async (req, res) => {
  try {
    const { location, preferences, budget } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required',
      });
    }

    const result = await generateFoodRecommendations(
      location,
      preferences || [],
      budget ? parseInt(budget) : undefined
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Food recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate food recommendations',
    });
  }
});

/**
 * @route   POST /api/recommendations/packing-list
 * @desc    Generate personalized packing list based on trip and weather
 * @access  Public
 */
router.post('/packing-list', async (req, res) => {
  try {
    const { destination, duration, activities, weather, groupSize } = req.body;

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Destination is required',
      });
    }

    const result = await generatePackingList({
      destination,
      duration: duration || 3,
      activities: activities || [],
      weather: weather || null,
      groupSize: groupSize || 1,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Packing list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate packing list',
    });
  }
});

/**
 * @route   POST /api/recommendations/chat
 * @desc    AI Chat Concierge - conversational travel assistant
 * @access  Public
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory, userContext } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const result = await generateChatResponse({
      message,
      conversationHistory: conversationHistory || [],
      userContext: userContext || null,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate chat response',
    });
  }
});

/**
 * @route   GET /api/recommendations/health
 * @desc    Check if recommendation service is available
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Recommendations service is running',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

module.exports = router;
