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

// OpenWeatherMap API base URL
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const API_KEY =
  import.meta.env.VITE_WEATHER_API_KEY || '6847c1477b9a4a03a72e431a0195d8a2';

/**
 * Map OpenWeatherMap condition codes to simple conditions
 * @param {number} code - Weather condition code
 * @returns {string} Simple condition name
 */
const mapCondition = (code) => {
  if (code >= 200 && code < 300) return 'thunderstorm';
  if (code >= 300 && code < 400) return 'drizzle';
  if (code >= 500 && code < 600) return 'rainy';
  if (code >= 600 && code < 700) return 'snow';
  if (code >= 700 && code < 800) return 'foggy';
  if (code === 800) return 'sunny';
  if (code > 800 && code < 900) return 'cloudy';
  return 'unknown';
};

/**
 * Custom hook for fetching weather data
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @returns {Object} Weather data, loading state, error, and refetch function
 */
const useWeather = (latitude, longitude) => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async () => {
    if (!latitude || !longitude) {
      setError('Location coordinates are required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch current weather
      const currentResponse = await fetch(
        `${API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
      );

      if (!currentResponse.ok) {
        throw new Error('Failed to fetch current weather');
      }

      const currentData = await currentResponse.json();

      // Fetch 5-day forecast
      const forecastResponse = await fetch(
        `${API_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
      );

      if (!forecastResponse.ok) {
        throw new Error('Failed to fetch forecast');
      }

      const forecastData = await forecastResponse.json();

      // Process current weather
      const processedWeather = {
        temp: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
        condition: mapCondition(currentData.weather[0].id),
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
      };

      // Process forecast - get one entry per day (noon)
      const dailyForecasts = {};
      forecastData.list.forEach((item) => {
        const date = item.dt_txt.split(' ')[0];
        const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);

        // Prefer noon (12:00) reading for each day
        if (!dailyForecasts[date] || hour === 12) {
          dailyForecasts[date] = {
            date: date,
            tempMax: Math.round(item.main.temp_max),
            tempMin: Math.round(item.main.temp_min),
            condition: mapCondition(item.weather[0].id),
            icon: item.weather[0].icon,
          };
        }
      });

      // Get next 5 days
      const processedForecast = Object.values(dailyForecasts).slice(0, 5);

      setWeather(processedWeather);
      setForecast(processedForecast);
      setError(null);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return {
    weather,
    forecast,
    loading,
    error,
    refetch: fetchWeather,
  };
};

export default useWeather;
