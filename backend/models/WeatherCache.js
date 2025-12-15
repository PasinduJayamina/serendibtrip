const mongoose = require('mongoose');

/**
 * WeatherCache Schema
 * Stores cached weather data to minimize API calls
 */
const weatherCacheSchema = new mongoose.Schema(
  {
    // Normalized destination name (lowercase, trimmed)
    destination: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Location coordinates (for precise location matching)
    coordinates: {
      lat: { type: Number },
      lon: { type: Number },
    },

    // Current weather data
    current: {
      temp: { type: Number, required: true },
      feelsLike: { type: Number },
      humidity: { type: Number },
      pressure: { type: Number },
      windSpeed: { type: Number },
      windDeg: { type: Number },
      clouds: { type: Number },
      visibility: { type: Number },
      condition: { type: String },
      conditionId: { type: Number },
      description: { type: String },
      icon: { type: String },
      sunrise: { type: Date },
      sunset: { type: Date },
    },

    // 5-day forecast data (compressed)
    forecast: [
      {
        date: { type: Date },
        tempMin: { type: Number },
        tempMax: { type: Number },
        humidity: { type: Number },
        condition: { type: String },
        conditionId: { type: Number },
        description: { type: String },
        icon: { type: String },
        pop: { type: Number }, // Probability of precipitation
      },
    ],

    // Original API response (compressed JSON string for debugging)
    rawData: {
      type: String,
      select: false, // Don't include in normal queries
    },

    // Cache metadata
    cachedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // Note: Index is defined separately as TTL index below
    },

    // Cache hit counter (for analytics)
    hitCount: {
      type: Number,
      default: 0,
    },

    // Last accessed timestamp
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },

    // API response metadata
    apiSource: {
      type: String,
      default: 'openweathermap',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
weatherCacheSchema.index({ destination: 1, expiresAt: 1 });

// TTL index to automatically delete expired documents (MongoDB handles this)
weatherCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check if cache entry is expired
 */
weatherCacheSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/**
 * Increment hit count and update last accessed
 */
weatherCacheSchema.methods.recordHit = async function () {
  this.hitCount += 1;
  this.lastAccessedAt = new Date();
  await this.save();
};

/**
 * Static method to find valid (non-expired) cache
 */
weatherCacheSchema.statics.findValidCache = async function (destination) {
  const normalizedDest = destination.toLowerCase().trim();
  const cache = await this.findOne({
    destination: normalizedDest,
    expiresAt: { $gt: new Date() },
  });

  if (cache) {
    // Record cache hit asynchronously (don't await)
    cache.recordHit().catch(console.error);
  }

  return cache;
};

/**
 * Static method to upsert weather cache
 */
weatherCacheSchema.statics.upsertWeather = async function (
  destination,
  weatherData,
  ttlMinutes = 10
) {
  const normalizedDest = destination.toLowerCase().trim();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  return this.findOneAndUpdate(
    { destination: normalizedDest },
    {
      ...weatherData,
      destination: normalizedDest,
      cachedAt: now,
      expiresAt,
      lastAccessedAt: now,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

/**
 * Static method to get cache statistics
 */
weatherCacheSchema.statics.getStats = async function () {
  const now = new Date();

  const [total, valid, expired, stats] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ expiresAt: { $gt: now } }),
    this.countDocuments({ expiresAt: { $lte: now } }),
    this.aggregate([
      {
        $group: {
          _id: null,
          totalHits: { $sum: '$hitCount' },
          avgHits: { $avg: '$hitCount' },
        },
      },
    ]),
  ]);

  return {
    totalEntries: total,
    validEntries: valid,
    expiredEntries: expired,
    totalHits: stats[0]?.totalHits || 0,
    avgHitsPerEntry: Math.round(stats[0]?.avgHits || 0),
  };
};

/**
 * Static method to cleanup expired entries manually
 * (MongoDB TTL index handles this automatically, but this can force cleanup)
 */
weatherCacheSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  return result.deletedCount;
};

const WeatherCache = mongoose.model('WeatherCache', weatherCacheSchema);

module.exports = WeatherCache;
