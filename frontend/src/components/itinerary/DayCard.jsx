import { useState, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  MapIcon,
  SunIcon,
  CloudIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import ActivityCard from './ActivityCard';
import {
  formatCurrency,
  formatDate,
  getDayOfWeek,
} from '../../utils/categoryIcons';

const DayCard = ({
  day,
  dayIndex,
  isEditMode,
  onActivityUpdate,
  onActivityDelete,
  onActivityReorder,
  onAddActivity,
  onViewRoute,
  onLocationClick,
  weatherData,
}) => {
  const [isExpanded, setIsExpanded] = useState(dayIndex === 0); // First day expanded by default
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Calculate total day cost
  const totalDayCost =
    day.activities?.reduce((sum, activity) => sum + (activity.cost || 0), 0) ||
    0;

  // Get weather for this day
  const dayWeather = weatherData?.find(
    (w) => w.date === day.date || w.day === day.day
  );

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) return;
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (
      draggedItem !== null &&
      dragOverItem !== null &&
      draggedItem !== dragOverItem
    ) {
      onActivityReorder(dayIndex, draggedItem, dragOverItem);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleActivityUpdate = useCallback(
    (activityIndex, updatedActivity) => {
      onActivityUpdate(dayIndex, activityIndex, updatedActivity);
    },
    [dayIndex, onActivityUpdate]
  );

  const handleActivityDelete = useCallback(
    (activityIndex) => {
      onActivityDelete(dayIndex, activityIndex);
    },
    [dayIndex, onActivityDelete]
  );

  // Format the date for display
  const dayOfWeek = getDayOfWeek(day.date);
  const formattedDate = day.date
    ? new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="relative">
      {/* Day connector line */}
      {dayIndex > 0 && (
        <div className="absolute -top-6 left-6 w-0.5 h-6 bg-gradient-to-b from-teal-200 to-teal-400" />
      )}

      {/* Day card */}
      <div
        className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 border-2 ${
          isExpanded
            ? 'border-teal-200'
            : 'border-transparent hover:border-gray-200'
        }`}
      >
        {/* Day header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center gap-4 bg-gradient-to-r from-teal-50 to-white hover:from-teal-100 transition-colors"
        >
          {/* Day number badge */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white flex flex-col items-center justify-center shadow-lg">
            <span className="text-xs font-medium uppercase opacity-90">
              Day
            </span>
            <span className="text-xl font-bold leading-none">{day.day}</span>
          </div>

          {/* Day info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDaysIcon className="w-4 h-4" />
              <span>
                {dayOfWeek}, {formattedDate}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-0.5">
              {day.theme || `Day ${day.day} Activities`}
            </h3>
          </div>

          {/* Weather */}
          {dayWeather && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              {dayWeather.condition === 'sunny' ||
              dayWeather.condition === 'clear' ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <CloudIcon className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {dayWeather.temp || dayWeather.temperature}°C
              </span>
            </div>
          )}

          {/* Day total */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg">
            <CurrencyDollarIcon className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">
              {formatCurrency(totalDayCost)}
            </span>
          </div>

          {/* Activity count */}
          <div className="flex items-center gap-1 text-gray-400">
            <span className="text-sm">
              {day.activities?.length || 0} activities
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-6 py-4 border-t border-gray-100">
            {/* Mobile stats */}
            <div className="flex sm:hidden items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              {dayWeather && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  {dayWeather.condition === 'sunny' ? (
                    <SunIcon className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CloudIcon className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {dayWeather.temp}°C
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold text-teal-700">
                  {formatCurrency(totalDayCost)}
                </span>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => onViewRoute(day)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                View Route on Map
              </button>

              {isEditMode && (
                <button
                  onClick={() => onAddActivity(dayIndex)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Activity
                </button>
              )}
            </div>

            {/* Activities timeline */}
            <div className="relative pl-8 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 via-teal-200 to-teal-100" />

              {day.activities?.length > 0 ? (
                day.activities.map((activity, index) => (
                  <div
                    key={activity.id || index}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-200 ${
                      dragOverItem === index && draggedItem !== index
                        ? 'border-t-4 border-teal-400 pt-4'
                        : ''
                    }`}
                  >
                    <ActivityCard
                      activity={activity}
                      index={index}
                      isEditMode={isEditMode}
                      onUpdate={(updatedActivity) =>
                        handleActivityUpdate(index, updatedActivity)
                      }
                      onDelete={() => handleActivityDelete(index)}
                      onLocationClick={onLocationClick}
                      isDragging={draggedItem === index}
                      dragHandleProps={
                        isEditMode
                          ? {
                              draggable: true,
                            }
                          : {}
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No activities planned for this day</p>
                  {isEditMode && (
                    <button
                      onClick={() => onAddActivity(dayIndex)}
                      className="mt-2 text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Add your first activity
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Day summary */}
            {day.meals && (
              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <h4 className="text-sm font-semibold text-orange-800 mb-3">
                  🍽️ Meals for the Day
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {day.meals.breakfast && (
                    <div className="bg-white p-3 rounded-lg">
                      <span className="text-xs font-medium text-orange-600 uppercase">
                        Breakfast
                      </span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {day.meals.breakfast.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(day.meals.breakfast.estimatedCost)}
                      </p>
                    </div>
                  )}
                  {day.meals.lunch && (
                    <div className="bg-white p-3 rounded-lg">
                      <span className="text-xs font-medium text-orange-600 uppercase">
                        Lunch
                      </span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {day.meals.lunch.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(day.meals.lunch.estimatedCost)}
                      </p>
                    </div>
                  )}
                  {day.meals.dinner && (
                    <div className="bg-white p-3 rounded-lg">
                      <span className="text-xs font-medium text-orange-600 uppercase">
                        Dinner
                      </span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {day.meals.dinner.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(day.meals.dinner.estimatedCost)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transportation */}
            {day.transportation && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  🚕 Transportation
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {day.transportation.mode}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(day.transportation.estimatedCost)}
                  </span>
                </div>
                {day.transportation.tips && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 {day.transportation.tips}
                  </p>
                )}
              </div>
            )}

            {/* Daily tips */}
            {day.dailyTips?.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  💡 Tips for the Day
                </h4>
                <ul className="space-y-1">
                  {day.dailyTips.map((tip, index) => (
                    <li
                      key={index}
                      className="text-sm text-yellow-700 flex items-start gap-2"
                    >
                      <span className="text-yellow-500">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCard;
