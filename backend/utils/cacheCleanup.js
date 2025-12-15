const cron = require('node-cron');
const weatherCacheService = require('../services/weatherCacheService');

/**
 * Cache Cleanup Cron Job
 * Runs every 15 minutes to cleanup expired cache entries
 * Note: MongoDB TTL index also handles cleanup, but this is for immediate cleanup
 */

let cleanupJob = null;
let statsJob = null;

/**
 * Start the cache cleanup cron jobs
 */
const startCacheCleanup = () => {
  // Cleanup expired entries every 15 minutes
  cleanupJob = cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('🧹 Running cache cleanup job...');
      const deletedCount = await weatherCacheService.cleanup();
      if (deletedCount > 0) {
        console.log(
          `✅ Cache cleanup: Removed ${deletedCount} expired entries`
        );
      } else {
        console.log('✅ Cache cleanup: No expired entries found');
      }
    } catch (error) {
      console.error('❌ Cache cleanup error:', error);
    }
  });

  // Log cache stats every hour
  statsJob = cron.schedule('0 * * * *', async () => {
    try {
      const stats = await weatherCacheService.getStats();
      console.log('📊 Cache Statistics:', {
        totalEntries: stats.totalEntries,
        validEntries: stats.validEntries,
        totalHits: stats.totalHits,
        avgHitsPerEntry: stats.avgHitsPerEntry,
      });
    } catch (error) {
      console.error('❌ Cache stats error:', error);
    }
  });

  console.log('🕐 Cache cleanup cron jobs started');
  console.log('   - Cleanup: Every 15 minutes');
  console.log('   - Stats: Every hour');
};

/**
 * Stop the cron jobs
 */
const stopCacheCleanup = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
  if (statsJob) {
    statsJob.stop();
    statsJob = null;
  }
  console.log('🛑 Cache cleanup cron jobs stopped');
};

/**
 * Run cleanup immediately (for testing/manual trigger)
 */
const runCleanupNow = async () => {
  try {
    console.log('🧹 Running immediate cache cleanup...');
    const deletedCount = await weatherCacheService.cleanup();
    console.log(
      `✅ Immediate cleanup: Removed ${deletedCount} expired entries`
    );
    return deletedCount;
  } catch (error) {
    console.error('❌ Immediate cleanup error:', error);
    throw error;
  }
};

module.exports = {
  startCacheCleanup,
  stopCacheCleanup,
  runCleanupNow,
};
