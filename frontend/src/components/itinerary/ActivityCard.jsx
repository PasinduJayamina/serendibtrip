import { useState } from 'react';
import {
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  Bars2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import {
  CategoryBadge,
  formatTime,
  formatCurrency,
} from '../../utils/categoryIcons';

const ActivityCard = ({
  activity,
  index,
  isEditMode,
  onUpdate,
  onDelete,
  onLocationClick,
  dragHandleProps,
  isDragging,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState({ ...activity });

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ ...activity });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className={`relative bg-white rounded-xl border-2 transition-all duration-300 ${
        isDragging
          ? 'shadow-2xl border-teal-400 scale-105'
          : 'shadow-sm hover:shadow-md border-gray-100'
      }`}
    >
      {/* Timeline connector */}
      <div className="absolute -left-8 top-6 w-4 h-4 rounded-full bg-teal-500 border-4 border-white shadow-sm z-10" />
      <div className="absolute -left-6 top-10 w-0.5 h-full bg-gradient-to-b from-teal-200 to-transparent" />

      {/* Card content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {isEditMode && (
            <div
              {...dragHandleProps}
              className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <Bars2Icon className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {/* Time badge */}
          <div className="flex-shrink-0 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-semibold text-sm">
            {formatTime(activity.time)}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full text-lg font-semibold text-gray-900 border-b-2 border-teal-300 focus:border-teal-500 outline-none bg-transparent"
              />
            ) : (
              <h4 className="text-lg font-semibold text-gray-900 truncate">
                {activity.name}
              </h4>
            )}

            {/* Category badge */}
            <div className="mt-1">
              <CategoryBadge category={activity.category} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <CheckIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {isEditMode && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(activity.id || index)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description - always visible but truncated */}
        <div className="mt-3 ml-0 md:ml-16">
          {isEditing ? (
            <textarea
              value={editData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full text-gray-600 text-sm border rounded-lg p-2 focus:border-teal-500 outline-none resize-none"
            />
          ) : (
            <p
              className={`text-gray-600 text-sm ${
                isExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {activity.description}
            </p>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-3 ml-0 md:ml-16 flex flex-wrap gap-4 text-sm">
          {/* Location */}
          <button
            onClick={() =>
              onLocationClick?.(activity.coordinates, activity.location)
            }
            className="flex items-center gap-1.5 text-gray-500 hover:text-teal-600 transition-colors"
          >
            <MapPinIcon className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{activity.location}</span>
          </button>

          {/* Duration */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>{activity.duration}</span>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span
              className={
                activity.cost === 0 ? 'text-green-600 font-medium' : ''
              }
            >
              {formatCurrency(activity.cost, activity.currency)}
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 ml-0 md:ml-16 p-4 bg-gray-50 rounded-lg space-y-3">
            {/* Tips */}
            {activity.tips && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Tips
                </h5>
                {isEditing ? (
                  <textarea
                    value={editData.tips}
                    onChange={(e) => handleInputChange('tips', e.target.value)}
                    rows={2}
                    className="w-full text-sm border rounded-lg p-2 focus:border-teal-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{activity.tips}</p>
                )}
              </div>
            )}

            {/* Coordinates */}
            {activity.coordinates && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Coordinates
                </h5>
                <p className="text-sm text-gray-600 font-mono">
                  {activity.coordinates.lat?.toFixed(4)},{' '}
                  {activity.coordinates.lng?.toFixed(4)}
                </p>
              </div>
            )}

            {/* Edit time and cost in edit mode */}
            {isEditing && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full mt-1 border rounded-lg p-2 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cost (LKR)
                  </label>
                  <input
                    type="number"
                    value={editData.cost}
                    onChange={(e) =>
                      handleInputChange('cost', parseInt(e.target.value) || 0)
                    }
                    className="w-full mt-1 border rounded-lg p-2 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;
