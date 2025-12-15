import { useMemo } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  AlertCircle,
  Umbrella,
  Shirt,
  Glasses,
  MapPin,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import useWeather from '../hooks/useWeather';

/**
 * Get weather icon component based on condition
 * @param {string} condition - Weather condition
 * @param {string} className - CSS classes
 * @returns {JSX.Element} Icon component
 */
const WeatherIcon = ({ condition, className = 'w-8 h-8' }) => {
  const icons = {
    sunny: <Sun className={`${className} text-yellow-500`} />,
    cloudy: <Cloud className={`${className} text-gray-500`} />,
    rainy: <CloudRain className={`${className} text-blue-500`} />,
    snow: <CloudSnow className={`${className} text-blue-200`} />,
    thunderstorm: <CloudLightning className={`${className} text-purple-500`} />,
    foggy: <CloudFog className={`${className} text-gray-400`} />,
    drizzle: <CloudDrizzle className={`${className} text-blue-400`} />,
  };

  return icons[condition] || <Cloud className={`${className} text-gray-400`} />;
};

/**
 * Get outfit suggestion based on weather conditions
 * @param {Object} weather - Current weather data
 * @returns {Array} Array of suggestion objects
 */
const getOutfitSuggestions = (weather) => {
  if (!weather) return [];

  const suggestions = [];
  const { temp, condition, humidity } = weather;

  // Temperature-based suggestions
  if (temp >= 30) {
    suggestions.push({
      icon: Shirt,
      text: 'Light cotton clothes recommended',
      color: 'text-orange-500',
    });
    suggestions.push({
      icon: Glasses,
      text: 'Sunglasses & sunscreen essential',
      color: 'text-yellow-500',
    });
  } else if (temp >= 25) {
    suggestions.push({
      icon: Shirt,
      text: 'Comfortable light clothing ideal',
      color: 'text-green-500',
    });
  } else if (temp >= 20) {
    suggestions.push({
      icon: Shirt,
      text: 'Light layers recommended',
      color: 'text-blue-500',
    });
  } else {
    suggestions.push({
      icon: Shirt,
      text: 'Bring a light jacket',
      color: 'text-indigo-500',
    });
  }

  // Condition-based suggestions
  if (
    condition === 'rainy' ||
    condition === 'drizzle' ||
    condition === 'thunderstorm'
  ) {
    suggestions.push({
      icon: Umbrella,
      text: 'Umbrella essential',
      color: 'text-blue-600',
    });
  }

  // Humidity-based suggestions
  if (humidity > 80) {
    suggestions.push({
      icon: Droplets,
      text: 'High humidity - stay hydrated',
      color: 'text-cyan-500',
    });
  }

  return suggestions;
};

/**
 * Skeleton loader for weather widget
 */
const WeatherSkeleton = () => (
  <div className="animate-pulse">
    {/* Current weather skeleton */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full" />
        <div>
          <div className="h-10 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-3">
          <div className="h-4 w-12 bg-gray-200 rounded mb-2" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>

    {/* Forecast skeleton */}
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-3">
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto mb-2" />
          <div className="h-4 w-full bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Error state component
 */
const WeatherError = ({ error, onRetry }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Unable to load weather
    </h3>
    <p className="text-gray-500 text-sm mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#208896] text-white rounded-lg hover:bg-[#1a6f7a] transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      Try Again
    </button>
  </div>
);

/**
 * WeatherWidget Component
 * Displays current weather and 5-day forecast for a destination
 *
 * @param {Object} props
 * @param {number} props.latitude - Location latitude
 * @param {number} props.longitude - Location longitude
 * @param {string} props.destinationName - Name of the destination
 */
const WeatherWidget = ({ latitude, longitude, destinationName }) => {
  const { weather, forecast, loading, error, refetch } = useWeather(
    latitude,
    longitude
  );

  const outfitSuggestions = useMemo(
    () => getOutfitSuggestions(weather),
    [weather]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Weather</h2>
        </div>
        <WeatherSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Weather</h2>
        <WeatherError error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">Weather</h2>
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{destinationName}</span>
          </div>
        </div>
        <button
          onClick={refetch}
          className="p-2 text-gray-500 hover:text-[#208896] hover:bg-[#208896]/10 rounded-lg transition-colors"
          title="Refresh weather"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Current Weather */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#208896]/10 to-[#208896]/5 rounded-2xl">
            <WeatherIcon condition={weather.condition} className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-gray-800">
                {weather.temp}
              </span>
              <span className="text-2xl text-gray-400">°C</span>
            </div>
            <p className="text-gray-500 capitalize">{weather.description}</p>
          </div>
        </div>

        <div className="flex sm:flex-col gap-4 sm:gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span>Feels like {weather.feelsLike}°C</span>
          </div>
        </div>
      </div>

      {/* Weather Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 text-center">
          <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-1">Humidity</p>
          <p className="text-lg font-bold text-gray-800">{weather.humidity}%</p>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-4 text-center">
          <Wind className="w-5 h-5 text-teal-500 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-1">Wind</p>
          <p className="text-lg font-bold text-gray-800">
            {weather.windSpeed} km/h
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 text-center">
          <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-1">Feels Like</p>
          <p className="text-lg font-bold text-gray-800">
            {weather.feelsLike}°C
          </p>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          5-Day Forecast
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {forecast.map((day, index) => (
            <div
              key={day.date}
              className={`rounded-xl p-3 text-center transition-all ${
                index === 0
                  ? 'bg-[#208896]/10 border-2 border-[#208896]/30'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <p className="text-xs font-medium text-gray-500 mb-2">
                {index === 0 ? 'Today' : format(parseISO(day.date), 'EEE')}
              </p>
              <WeatherIcon
                condition={day.condition}
                className="w-6 h-6 mx-auto mb-2"
              />
              <div className="text-sm">
                <span className="font-bold text-gray-800">{day.tempMax}°</span>
                <span className="text-gray-400 ml-1">{day.tempMin}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outfit Suggestions */}
      {outfitSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-[#208896]/5 to-[#208896]/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#208896]" />
            What to Wear
          </h3>
          <div className="space-y-2">
            {outfitSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm text-gray-700"
                >
                  <Icon className={`w-4 h-4 ${suggestion.color}`} />
                  <span>{suggestion.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
