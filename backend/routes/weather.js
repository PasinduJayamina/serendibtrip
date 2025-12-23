const express = require('express');
const router = express.Router();
const weatherCacheService = require('../services/weatherCacheService');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/weather/:destination
 * @desc    Get weather for a destination (with caching)
 * @access  Public
 */
router.get('/:destination', async (req, res) => {
  try {
    const { destination } = req.params;
    const { refresh } = req.query;

    if (!destination || destination.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Destination is required',
      });
    }

    const forceRefresh = refresh === 'true';
    const weather = await weatherCacheService.getWeather(
      destination,
      forceRefresh
    );

    res.json({
      success: true,
      data: weather,
    });
  } catch (error) {
    console.error('Weather API Error:', error);

    const statusCode = error.message.includes('not found')
      ? 404
      : error.message.includes('API key')
      ? 401
      : error.message.includes('rate limit')
      ? 429
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/weather/batch
 * @desc    Get weather for multiple destinations (optimized batch)
 * @access  Public
 */
router.post('/batch', async (req, res) => {
  try {
    const { destinations } = req.body;

    if (
      !destinations ||
      !Array.isArray(destinations) ||
      destinations.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'Destinations array is required',
      });
    }

    if (destinations.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 destinations allowed per batch request',
      });
    }

    const results = await weatherCacheService.getMultipleWeather(destinations);

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      summary: {
        total: destinations.length,
        successful: successCount,
        failed: failedCount,
      },
      data: results,
    });
  } catch (error) {
    console.error('Batch Weather API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/weather/update-batch
 * @desc    Force update weather for multiple destinations
 * @access  Private (requires authentication)
 */
router.post('/update-batch', auth, async (req, res) => {
  try {
    const { destinations } = req.body;

    if (
      !destinations ||
      !Array.isArray(destinations) ||
      destinations.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'Destinations array is required',
      });
    }

    if (destinations.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 destinations allowed per batch request',
      });
    }

    const results = await weatherCacheService.updateMultipleDestinations(
      destinations
    );

    res.json({
      success: true,
      summary: {
        fromCache: results.fromCache.length,
        fetched: results.success.length,
        failed: results.failed.length,
      },
      data: results,
    });
  } catch (error) {
    console.error('Batch Update Weather API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/weather/cache/stats
 * @desc    Get cache statistics
 * @access  Private (requires authentication)
 */
router.get('/cache/stats', auth, async (req, res) => {
  try {
    const stats = await weatherCacheService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Cache Stats Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/weather/cache/cleanup
 * @desc    Manually cleanup expired cache entries
 * @access  Private (requires authentication)
 */
router.post('/cache/cleanup', auth, async (req, res) => {
  try {
    const deletedCount = await weatherCacheService.cleanup();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired cache entries`,
      deletedCount,
    });
  } catch (error) {
    console.error('Cache Cleanup Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/weather/cache/clear
 * @desc    Clear all cache (admin only)
 * @access  Private (requires authentication)
 */
router.delete('/cache/clear', auth, async (req, res) => {
  try {
    const deletedCount = await weatherCacheService.clearAll();

    res.json({
      success: true,
      message: `Cleared ${deletedCount} cache entries`,
      deletedCount,
    });
  } catch (error) {
    console.error('Cache Clear Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
