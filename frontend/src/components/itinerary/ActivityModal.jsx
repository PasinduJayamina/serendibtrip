import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { categoryConfig } from '../../utils/categoryIcons';

const ActivityModal = ({ isOpen, onClose, onSave, activity, dayDate }) => {
  const [formData, setFormData] = useState({
    time: '09:00',
    name: '',
    description: '',
    location: '',
    coordinates: { lat: 0, lng: 0 },
    duration: '1 hour',
    cost: 0,
    currency: 'LKR',
    category: 'culture',
    tips: '',
  });

  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes or activity changes
  useEffect(() => {
    if (activity) {
      setFormData({
        time: activity.time || '09:00',
        name: activity.name || '',
        description: activity.description || '',
        location: activity.location || '',
        coordinates: activity.coordinates || { lat: 0, lng: 0 },
        duration: activity.duration || '1 hour',
        cost: activity.cost || 0,
        currency: activity.currency || 'LKR',
        category: activity.category || 'culture',
        tips: activity.tips || '',
      });
    } else {
      setFormData({
        time: '09:00',
        name: '',
        description: '',
        location: '',
        coordinates: { lat: 0, lng: 0 },
        duration: '1 hour',
        cost: 0,
        currency: 'LKR',
        category: 'culture',
        tips: '',
      });
    }
    setErrors({});
  }, [activity, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleCoordinateChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: { ...prev.coordinates, [field]: parseFloat(value) || 0 },
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Activity name is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.description.trim())
      newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  const categories = Object.entries(categoryConfig).filter(
    ([key]) => key !== 'default'
  );

  const durations = [
    '30 minutes',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '2.5 hours',
    '3 hours',
    '4 hours',
    'Half day',
    'Full day',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-500 to-teal-600">
            <div>
              <h2 className="text-xl font-bold text-white">
                {activity ? 'Edit Activity' : 'Add New Activity'}
              </h2>
              {dayDate && (
                <p className="text-teal-100 text-sm">
                  {new Date(dayDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="overflow-y-auto max-h-[calc(90vh-140px)]"
          >
            <div className="p-6 space-y-5">
              {/* Time and Category row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow ${
                      errors.time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.time && (
                    <p className="mt-1 text-xs text-red-500">{errors.time}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      handleInputChange('category', e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    {categories.map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Activity Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Visit Temple of the Sacred Tooth Relic"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  rows={3}
                  placeholder="Describe what this activity involves..."
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none transition-shadow ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange('location', e.target.value)
                    }
                    placeholder="e.g., Kandy City Center"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow ${
                      errors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.location && (
                  <p className="mt-1 text-xs text-red-500">{errors.location}</p>
                )}
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.coordinates.lat}
                    onChange={(e) =>
                      handleCoordinateChange('lat', e.target.value)
                    }
                    placeholder="7.2933"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.coordinates.lng}
                    onChange={(e) =>
                      handleCoordinateChange('lng', e.target.value)
                    }
                    placeholder="80.6406"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Duration and Cost row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange('duration', e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    {durations.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Cost (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(e) =>
                      handleInputChange('cost', parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tips & Notes
                </label>
                <textarea
                  value={formData.tips}
                  onChange={(e) => handleInputChange('tips', e.target.value)}
                  rows={2}
                  placeholder="Any helpful tips for this activity..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-medium transition-colors inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                {activity ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;
