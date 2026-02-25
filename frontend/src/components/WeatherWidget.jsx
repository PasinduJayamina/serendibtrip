import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  CalendarDays,
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
 * @param {Function} t - Translation function
 * @returns {Array} Array of suggestion objects
 */
const getOutfitSuggestions = (weather, t) => {
  if (!weather) return [];

  const suggestions = [];
  const { temp, condition, humidity } = weather;

  // Temperature-based suggestions
  if (temp >= 30) {
    suggestions.push({
      icon: Shirt,
      text: t('weather.outfit.lightCotton'),
      color: 'text-orange-500',
    });
    suggestions.push({
      icon: Glasses,
      text: t('weather.outfit.sunglasses'),
      color: 'text-yellow-500',
    });
  } else if (temp >= 25) {
    suggestions.push({
      icon: Shirt,
      text: t('weather.outfit.comfortable'),
      color: 'text-green-500',
    });
  } else if (temp >= 20) {
    suggestions.push({
      icon: Shirt,
      text: t('weather.outfit.lightLayers'),
      color: 'text-blue-500',
    });
  } else {
    suggestions.push({
      icon: Shirt,
      text: t('weather.outfit.lightJacket'),
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
      text: t('weather.outfit.umbrella'),
      color: 'text-blue-600',
    });
  }

  // Humidity-based suggestions
  if (humidity > 80) {
    suggestions.push({
      icon: Droplets,
      text: t('weather.outfit.stayHydrated'),
      color: 'text-accent-500',
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
    <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full" />
        <div>
          <div className="h-10 w-24 bg-[var(--color-bg-sunken)] rounded mb-2" />
          <div className="h-4 w-32 bg-[var(--color-bg-sunken)] rounded" />
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
        <div key={i} className="bg-[var(--color-bg-sunken)] rounded-lg p-3">
          <div className="h-4 w-12 bg-[var(--color-bg-primary)] rounded mb-2" />
          <div className="h-6 w-16 bg-[var(--color-bg-primary)] rounded" />
        </div>
      ))}
    </div>

    {/* Forecast skeleton */}
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-[var(--color-bg-sunken)] rounded-lg p-3">
          <div className="h-4 w-full bg-[var(--color-bg-primary)] rounded mb-2" />
          <div className="h-8 w-8 bg-[var(--color-bg-primary)] rounded-full mx-auto mb-2" />
          <div className="h-4 w-full bg-[var(--color-bg-primary)] rounded" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Error state component
 */
const WeatherError = ({ error, onRetry, t }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
      {t('weather.unableToLoad')}
    </h3>
    <p className="text-[var(--color-text-muted)] text-sm mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-[#1a6f7a] transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      {t('weather.tryAgain')}
    </button>
  </div>
);

/**
 * WeatherWidget Component
 * Displays current weather and 5-day forecast for a destination
 *
 * @param {Object} props
 * @param {string} props.destinationName - Name of the destination
 */
const WeatherWidget = ({ destinationName, startDate, endDate, duration }) => {
  const { t } = useTranslation();
  const { weather, forecast, loading, error, refetch, fromCache } = useWeather(
    destinationName
  );

  const outfitSuggestions = useMemo(
    () => getOutfitSuggestions(weather, t),
    [weather, t]
  );

  const tripForecastDays = useMemo(() => {
    if (!startDate || !forecast?.length) return [];
    const start = new Date(startDate);
    const numDays = duration || 1;
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + (numDays - 1) * 24 * 60 * 60 * 1000);
    
    return forecast.filter(day => {
      const dayDate = parseISO(day.date);
      const dayDTR = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const sDTR = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDTR = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return dayDTR >= sDTR && dayDTR <= eDTR;
    });
  }, [startDate, endDate, duration, forecast]);

  const getWeatherAdvice = (days) => {
    if (!days || days.length === 0) return null;
    const rainyDays = days.filter(d => ['rainy', 'thunderstorm', 'drizzle'].includes(d.condition));
    const clearDays = days.filter(d => ['sunny', 'clear'].includes(d.condition));
    const maxTemp = Math.max(...days.map(d => d.tempMax));
    const minTemp = Math.min(...days.map(d => d.tempMin));
    
    return { rainyDays, clearDays, maxTemp, minTemp, totalDays: days.length };
  };

  // Find the best weather day (highest temp, no rain)
  const getBestDay = (days) => {
    if (!days || days.length === 0) return null;
    const scoredDays = days.map((day, idx) => {
      let score = day.tempMax;
      if (['sunny', 'clear'].includes(day.condition)) score += 10;
      if (['rainy', 'thunderstorm'].includes(day.condition)) score -= 15;
      if (['drizzle'].includes(day.condition)) score -= 5;
      if (day.condition === 'cloudy') score += 2; // pleasant for activities
      return { ...day, score, dayIndex: idx };
    });
    return scoredDays.reduce((best, d) => d.score > best.score ? d : best, scoredDays[0]);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('weather.title')}</h2>
        </div>
        <WeatherSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{t('weather.title')}</h2>
        <WeatherError error={error} onRetry={refetch} t={t} />
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('weather.title')}</h2>
          <div className="flex items-center gap-1 text-[var(--color-text-muted)] text-sm">
            <MapPin className="w-4 h-4" />
            <span>{destinationName}</span>
          </div>
        </div>
        <button
          onClick={refetch}
          className="p-2 text-[var(--color-text-muted)] hover:text-secondary-500 hover:bg-secondary-500/10 rounded-lg transition-colors"
          title={t('weather.refreshWeather')}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Current Weather */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--color-bg-sunken)] rounded-2xl border border-[var(--color-border)]">
            <WeatherIcon condition={weather.condition} className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-[var(--color-text-primary)]">
                {weather.temp}
              </span>
              <span className="text-2xl text-[var(--color-text-muted)]">°C</span>
            </div>
            <p className="text-[var(--color-text-muted)] capitalize">{weather.description}</p>
          </div>
        </div>

        <div className="flex sm:flex-col gap-4 sm:gap-2 text-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span>{t('weather.feelsLike')} {weather.feelsLike}°C</span>
          </div>
        </div>
      </div>

      {/* Weather Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--color-bg-sunken)] rounded-xl p-4 text-center border border-[var(--color-border)]">
          <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('weather.humidity')}</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{weather.humidity}%</p>
        </div>
        <div className="bg-[var(--color-bg-sunken)] rounded-xl p-4 text-center border border-[var(--color-border)]">
          <Wind className="w-5 h-5 text-secondary-500 mx-auto mb-2" />
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('weather.wind')}</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {weather.windSpeed} km/h
          </p>
        </div>
        <div className="bg-[var(--color-bg-sunken)] rounded-xl p-4 text-center border border-[var(--color-border)]">
          <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-2" />
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('weather.feelsLike')}</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {weather.feelsLike}°C
          </p>
        </div>
      </div>

      {/* Outfit Suggestions */}
      {outfitSuggestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
            {t('weather.whatToWear', 'What to Wear')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {outfitSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-sunken)] rounded-lg border border-[var(--color-border)]"
                >
                  <Icon className={`w-4 h-4 ${suggestion.color}`} />
                  <span className="text-sm text-[var(--color-text-secondary)]">{suggestion.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* 5-Day Forecast */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          {t('weather.forecast')}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {forecast.map((day, index) => {
            const bestDay = getBestDay(tripForecastDays.length > 0 ? tripForecastDays : forecast);
            const isBest = bestDay && day.date === bestDay.date;
            return (
            <div
              key={day.date}
              className={`rounded-xl p-3 text-center transition-all relative ${
                index === 0
                  ? 'bg-secondary-500/10 border-2 border-secondary-500/30'
                  : isBest 
                    ? 'bg-yellow-500/10 border-2 border-yellow-400/40 ring-1 ring-yellow-400/20'
                    : 'bg-[var(--color-bg-sunken)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              {isBest && (
                <span className="absolute -top-1.5 -right-1.5 text-xs" title="Best day for outdoor activities">⭐</span>
              )}
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
                {index === 0 ? t('weather.today') : format(parseISO(day.date), 'EEE')}
              </p>
              <WeatherIcon
                condition={day.condition}
                className="w-6 h-6 mx-auto mb-2"
              />
              <div className="text-sm">
                <span className="font-bold text-[var(--color-text-primary)]">{day.tempMax}°</span>
                <span className="text-[var(--color-text-muted)] ml-1">{day.tempMin}°</span>
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Trip Weather Summary — enhanced with actionable intelligence */}
      {startDate && tripForecastDays.length > 0 && (() => {
        const analysis = getWeatherAdvice(tripForecastDays);
        const bestDay = getBestDay(tripForecastDays);
        if (!analysis) return null;

        return (
          <div className="mb-6 space-y-3">
            {/* What to Expect Card */}
            <div className="p-4 bg-[var(--color-bg-sunken)] rounded-xl border border-[var(--color-border)]">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--color-brand-primary)]" />
                What to Expect
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {tripForecastDays.map((day, idx) => (
                  <div key={day.date} className="p-2 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] text-center">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Day {idx + 1}</p>
                    <WeatherIcon condition={day.condition} className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm">
                      <span className="font-bold text-[var(--color-text-primary)]">{day.tempMax}°</span>
                      <span className="text-[var(--color-text-muted)] ml-1">{day.tempMin}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pack Smart Callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.rainyDays.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <span className="text-lg flex-shrink-0">☔</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Pack rain gear
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {analysis.rainyDays.length} of {analysis.totalDays} day{analysis.totalDays !== 1 ? 's' : ''} show rain
                    </p>
                  </div>
                </div>
              )}
              {analysis.maxTemp > 30 && (
                <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <span className="text-lg flex-shrink-0">🧴</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Bring sunscreen
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Temps reach {analysis.maxTemp}°C — protect your skin
                    </p>
                  </div>
                </div>
              )}
              {analysis.clearDays.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <span className="text-lg flex-shrink-0">😎</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Sunglasses & hat
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {analysis.clearDays.length} sunny day{analysis.clearDays.length !== 1 ? 's' : ''} ahead
                    </p>
                  </div>
                </div>
              )}
              {analysis.maxTemp - analysis.minTemp > 8 && (
                <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <span className="text-lg flex-shrink-0">🧥</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Layer up
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {analysis.minTemp}° – {analysis.maxTemp}°C range
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Impact Alerts */}
            {analysis.rainyDays.length > 0 && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">💡</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    Plan indoor activities
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Rain expected on Day {analysis.rainyDays.map((d, i) => {
                      const dayIdx = tripForecastDays.indexOf(d) + 1;
                      return dayIdx;
                    }).join(', ')}. Consider museums, temples, or food tours for those days.
                    {bestDay && ` Best day for outdoor activities: Day ${tripForecastDays.indexOf(tripForecastDays.find(d => d.date === bestDay.date)) + 1}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Best Day Badge — only when no rain days (otherwise it's in the alert above) */}
            {analysis.rainyDays.length === 0 && bestDay && (
              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">🌟</span>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Great weather throughout your trip! All {analysis.totalDays} days look good for outdoor activities.
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default WeatherWidget;
