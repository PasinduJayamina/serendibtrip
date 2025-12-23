import { useState, useEffect, useCallback } from 'react';

/**
 * @typedef {Object} CurrentWeather
 * @property {number} temp - Temperature in Celsius
 * @property {number} feelsLike - Feels like temperature in Celsius
 * @property {number} humidity - Humidity percentage
 * @property {number} windSpeed - Wind speed in km/h
 * @property {string} condition - Weather condition (sunny, rainy, etc.)
 * @property {string} description - Detailed weather description
 * @property {string} icon - Weather icon code
 */

/**
 * @typedef {Object} ForecastDay
 * @property {string} date - Date string
 * @property {number} tempMax - Max temperature in Celsius
 * @property {number} tempMin - Min temperature in Celsius
 * @property {string} condition - Weather condition
 * @property {string} icon - Weather icon code
 */

/**
 * @typedef {Object} WeatherData
 * @property {CurrentWeather} current - Current weather data
 * @property {ForecastDay[]} forecast - 5-day forecast
 */

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Map weather condition to simple condition name
 * @param {string} condition - Weather condition from API
 * @returns {string} Simple condition name
 */
const mapCondition = (condition) => {
  const conditionLower = condition?.toLowerCase() || '';
  if (conditionLower.includes('thunder')) return 'thunderstorm';
  if (conditionLower.includes('drizzle')) return 'drizzle';
  if (conditionLower.includes('rain')) return 'rainy';
  if (conditionLower.includes('snow')) return 'snow';
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) return 'foggy';
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) return 'sunny';
  if (conditionLower.includes('cloud')) return 'cloudy';
  return 'unknown';
};

/**
 * Custom hook for fetching weather data via backend API
 * Uses backend's caching system for optimized API calls
 * 
 * @param {string} destination - Destination name (e.g., 'Colombo', 'Kandy')
 * @returns {Object} Weather data, loading state, error, and refetch function
 */
const useWeather = (destination) => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchWeather = useCallback(async (forceRefresh = false) => {
    if (!destination) {
      setError('Destination is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend weather API (uses caching)
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const response = await fetch(
        `${API_BASE_URL}/weather/${encodeURIComponent(destination)}${refreshParam}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch weather data');
      }

      const data = result.data;

      // Process current weather
      const processedWeather = {
        temp: data.current.temp,
        feelsLike: data.current.feelsLike,
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.windSpeed * 3.6), // Convert m/s to km/h
        condition: mapCondition(data.current.condition),
        description: data.current.description,
        icon: data.current.icon,
      };

      // Process forecast
      const processedForecast = (data.forecast || []).slice(0, 5).map((day) => ({
        date: typeof day.date === 'string' ? day.date.split('T')[0] : new Date(day.date).toISOString().split('T')[0],
        tempMax: day.tempMax,
        tempMin: day.tempMin,
        condition: mapCondition(day.condition),
        icon: day.icon,
      }));

      setWeather(processedWeather);
      setForecast(processedForecast);
      setFromCache(data.fromCache || false);
      setError(null);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [destination]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return {
    weather,
    forecast,
    loading,
    error,
    fromCache,
    refetch: fetchWeather,
  };
};

export default useWeather;
