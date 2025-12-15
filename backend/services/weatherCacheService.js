const axios = require('axios');
const WeatherCache = require('../models/WeatherCache');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Configuration
const CONFIG = {
  TTL_MINUTES: 10, // Cache TTL in minutes
  API_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  BATCH_SIZE: 5, // Max concurrent API calls
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

/**
 * WeatherCacheService
 * Efficient caching system for weather data with batch processing
 */
class WeatherCacheService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.pendingRequests = new Map(); // Dedupe in-flight requests
  }

  /**
   * Get weather for a single destination (with caching)
   */
  async getWeather(destination, forceRefresh = false) {
    const normalizedDest = destination.toLowerCase().trim();

    // Check for pending request (dedupe)
    if (this.pendingRequests.has(normalizedDest)) {
      return this.pendingRequests.get(normalizedDest);
    }

    // Create pending request promise
    const requestPromise = this._fetchWithCache(normalizedDest, forceRefresh);
    this.pendingRequests.set(normalizedDest, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(normalizedDest);
    }
  }

  /**
   * Internal: Fetch with cache logic
   */
  async _fetchWithCache(destination, forceRefresh) {
    // Step 1: Check cache (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.getCachedWeather(destination);
      if (cached) {
        console.log(`✅ Cache HIT for: ${destination}`);
        return {
          ...this._formatCacheResponse(cached),
          fromCache: true,
          cachedAt: cached.cachedAt,
          expiresAt: cached.expiresAt,
        };
      }
    }

    console.log(`🌐 Cache MISS for: ${destination} - Fetching from API`);

    // Step 2: Fetch from API
    const weatherData = await this._fetchFromAPI(destination);

    // Step 3: Cache the result
    const cached = await this.setWeather(destination, weatherData);

    return {
      ...this._formatCacheResponse(cached),
      fromCache: false,
      cachedAt: cached.cachedAt,
      expiresAt: cached.expiresAt,
    };
  }

  /**
   * Get cached weather if valid (not expired)
   */
  async getCachedWeather(destination) {
    try {
      return await WeatherCache.findValidCache(destination);
    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  /**
   * Store weather data in cache
   */
  async setWeather(destination, weatherData) {
    try {
      // Compress raw data for storage
      const rawDataCompressed = await this._compressData(weatherData.rawData);

      const cacheData = {
        coordinates: weatherData.coordinates,
        current: weatherData.current,
        forecast: weatherData.forecast,
        rawData: rawDataCompressed,
        apiSource: 'openweathermap',
      };

      return await WeatherCache.upsertWeather(
        destination,
        cacheData,
        CONFIG.TTL_MINUTES
      );
    } catch (error) {
      console.error('Error setting cache:', error);
      throw error;
    }
  }

  /**
   * Check if timestamp is expired (10+ minutes old)
   */
  isExpired(timestamp) {
    const now = new Date();
    const cacheTime = new Date(timestamp);
    const diffMinutes = (now - cacheTime) / (1000 * 60);
    return diffMinutes >= CONFIG.TTL_MINUTES;
  }

  /**
   * Batch update multiple destinations efficiently
   */
  async updateMultipleDestinations(destinations) {
    const uniqueDestinations = [
      ...new Set(destinations.map((d) => d.toLowerCase().trim())),
    ];
    const results = {
      success: [],
      failed: [],
      fromCache: [],
    };

    // Step 1: Check which destinations are already cached
    const cacheChecks = await Promise.all(
      uniqueDestinations.map(async (dest) => {
        const cached = await this.getCachedWeather(dest);
        return { destination: dest, cached };
      })
    );

    const needsFetch = [];
    for (const { destination, cached } of cacheChecks) {
      if (cached) {
        results.fromCache.push({
          destination,
          data: this._formatCacheResponse(cached),
          cachedAt: cached.cachedAt,
        });
      } else {
        needsFetch.push(destination);
      }
    }

    // Step 2: Batch fetch destinations that need updates
    if (needsFetch.length > 0) {
      const batches = this._chunkArray(needsFetch, CONFIG.BATCH_SIZE);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map((dest) => this._fetchAndCache(dest))
        );

        batchResults.forEach((result, index) => {
          const destination = batch[index];
          if (result.status === 'fulfilled') {
            results.success.push({
              destination,
              data: result.value,
            });
          } else {
            results.failed.push({
              destination,
              error: result.reason.message,
            });
          }
        });

        // Small delay between batches to avoid rate limiting
        if (batches.indexOf(batch) < batches.length - 1) {
          await this._delay(500);
        }
      }
    }

    return results;
  }

  /**
   * Get weather for multiple destinations (optimized)
   */
  async getMultipleWeather(destinations) {
    const uniqueDestinations = [
      ...new Set(destinations.map((d) => d.toLowerCase().trim())),
    ];

    const results = await Promise.allSettled(
      uniqueDestinations.map((dest) => this.getWeather(dest))
    );

    return results.map((result, index) => ({
      destination: uniqueDestinations[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  /**
   * Fetch from API and cache
   */
  async _fetchAndCache(destination) {
    const weatherData = await this._fetchFromAPI(destination);
    const cached = await this.setWeather(destination, weatherData);
    return this._formatCacheResponse(cached);
  }

  /**
   * Fetch weather from OpenWeatherMap API with retry logic
   */
  async _fetchFromAPI(destination, attempt = 1) {
    try {
      // Fetch current weather and forecast in parallel
      const [currentResponse, forecastResponse] = await Promise.all([
        axios.get(`${CONFIG.API_BASE_URL}/weather`, {
          params: {
            q: destination,
            appid: this.apiKey,
            units: 'metric',
          },
          timeout: 10000,
        }),
        axios.get(`${CONFIG.API_BASE_URL}/forecast`, {
          params: {
            q: destination,
            appid: this.apiKey,
            units: 'metric',
          },
          timeout: 10000,
        }),
      ]);

      const current = currentResponse.data;
      const forecast = forecastResponse.data;

      // Process and structure the data
      return {
        coordinates: {
          lat: current.coord.lat,
          lon: current.coord.lon,
        },
        current: {
          temp: Math.round(current.main.temp),
          feelsLike: Math.round(current.main.feels_like),
          humidity: current.main.humidity,
          pressure: current.main.pressure,
          windSpeed: current.wind.speed,
          windDeg: current.wind.deg,
          clouds: current.clouds.all,
          visibility: current.visibility,
          condition: current.weather[0].main,
          conditionId: current.weather[0].id,
          description: current.weather[0].description,
          icon: current.weather[0].icon,
          sunrise: new Date(current.sys.sunrise * 1000),
          sunset: new Date(current.sys.sunset * 1000),
        },
        forecast: this._processForecast(forecast.list),
        rawData: { current, forecast },
      };
    } catch (error) {
      // Retry on network errors
      if (attempt < CONFIG.RETRY_ATTEMPTS && this._isRetryableError(error)) {
        console.log(`Retry attempt ${attempt} for ${destination}`);
        await this._delay(CONFIG.RETRY_DELAY_MS * attempt);
        return this._fetchFromAPI(destination, attempt + 1);
      }

      // Handle specific API errors
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error(`Destination "${destination}" not found`);
        } else if (status === 401) {
          throw new Error('Invalid API key');
        } else if (status === 429) {
          throw new Error('API rate limit exceeded');
        }
      }

      throw new Error(`Failed to fetch weather: ${error.message}`);
    }
  }

  /**
   * Process 5-day forecast into daily summaries
   */
  _processForecast(forecastList) {
    const dailyMap = new Map();

    for (const item of forecastList) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: new Date(dateKey),
          temps: [],
          humidity: [],
          conditions: [],
          icons: [],
          pop: [],
        });
      }

      const day = dailyMap.get(dateKey);
      day.temps.push(item.main.temp);
      day.humidity.push(item.main.humidity);
      day.conditions.push({
        main: item.weather[0].main,
        id: item.weather[0].id,
        description: item.weather[0].description,
      });
      day.icons.push(item.weather[0].icon);
      day.pop.push(item.pop || 0);
    }

    // Convert to array and calculate daily summaries
    return Array.from(dailyMap.values())
      .slice(0, 5) // Only 5 days
      .map((day) => {
        // Find most common condition
        const conditionCounts = {};
        day.conditions.forEach((c) => {
          conditionCounts[c.main] = (conditionCounts[c.main] || 0) + 1;
        });
        const mainCondition = Object.entries(conditionCounts).sort(
          (a, b) => b[1] - a[1]
        )[0][0];
        const conditionData = day.conditions.find(
          (c) => c.main === mainCondition
        );

        // Find most common icon (prefer day icons)
        const dayIcons = day.icons.filter((i) => i.endsWith('d'));
        const mainIcon = dayIcons.length > 0 ? dayIcons[0] : day.icons[0];

        return {
          date: day.date,
          tempMin: Math.round(Math.min(...day.temps)),
          tempMax: Math.round(Math.max(...day.temps)),
          humidity: Math.round(
            day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length
          ),
          condition: mainCondition,
          conditionId: conditionData.id,
          description: conditionData.description,
          icon: mainIcon,
          pop: Math.round(Math.max(...day.pop) * 100),
        };
      });
  }

  /**
   * Format cache document for API response
   */
  _formatCacheResponse(cache) {
    return {
      destination: cache.destination,
      coordinates: cache.coordinates,
      current: cache.current,
      forecast: cache.forecast,
    };
  }

  /**
   * Compress data for storage
   */
  async _compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = await gzip(jsonString);
      return compressed.toString('base64');
    } catch (error) {
      console.error('Compression error:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress data from storage
   */
  async _decompressData(compressedData) {
    try {
      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      // Fallback: try parsing as regular JSON
      try {
        return JSON.parse(compressedData);
      } catch {
        console.error('Decompression error:', error);
        return null;
      }
    }
  }

  /**
   * Check if error is retryable
   */
  _isRetryableError(error) {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  /**
   * Chunk array into batches
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return WeatherCache.getStats();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup() {
    return WeatherCache.cleanupExpired();
  }

  /**
   * Clear all cache (for testing/admin)
   */
  async clearAll() {
    const result = await WeatherCache.deleteMany({});
    return result.deletedCount;
  }
}

// Export singleton instance
module.exports = new WeatherCacheService();
