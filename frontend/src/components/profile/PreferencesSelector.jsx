import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';

// Options data
const TRAVEL_STYLES = [
  { value: 'luxury', label: 'Luxury', icon: '✨' },
  { value: 'budget', label: 'Budget', icon: '💰' },
  { value: 'adventure', label: 'Adventure', icon: '🏔️' },
  { value: 'cultural', label: 'Cultural', icon: '🏛️' },
  { value: 'relaxation', label: 'Relaxation', icon: '🏖️' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'backpacker', label: 'Backpacker', icon: '🎒' },
  { value: 'eco-friendly', label: 'Eco-Friendly', icon: '🌿' },
];

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Seafood Allergy',
  'No Restrictions',
];

const MOBILITY_OPTIONS = [
  'Wheelchair Accessible',
  'Limited Walking',
  'No Stairs',
  'Elevator Required',
  'Assistance Animal',
  'Visual Impairment',
  'Hearing Impairment',
  'No Special Needs',
];

const SRI_LANKAN_DESTINATIONS = [
  'Colombo',
  'Kandy',
  'Galle',
  'Sigiriya',
  'Ella',
  'Nuwara Eliya',
  'Trincomalee',
  'Mirissa',
  'Anuradhapura',
  'Polonnaruwa',
  'Jaffna',
  'Hikkaduwa',
  'Bentota',
  'Arugam Bay',
  'Yala',
  'Udawalawe',
];

const CURRENCIES = [
  { value: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
];

const LANGUAGES = [
  'English',
  'Sinhala',
  'Tamil',
  'Hindi',
  'German',
  'French',
  'Chinese',
  'Japanese',
];

const PreferencesSelector = ({ preferences, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    travelStyle: preferences?.travelStyle || 'budget',
    favoriteDestinations: preferences?.favoriteDestinations || [],
    dietaryRestrictions: preferences?.dietaryRestrictions || [],
    mobilityNeeds: preferences?.mobilityNeeds || [],
    currency: preferences?.currency || 'LKR',
    language: preferences?.language || 'English',
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        travelStyle: preferences.travelStyle || 'budget',
        favoriteDestinations: preferences.favoriteDestinations || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        mobilityNeeds: preferences.mobilityNeeds || [],
        currency: preferences.currency || 'LKR',
        language: preferences.language || 'English',
      });
    }
  }, [preferences]);

  const toggleArrayItem = (field, item) => {
    setFormData((prev) => {
      const currentItems = prev[field] || [];
      const exists = currentItems.includes(item);
      return {
        ...prev,
        [field]: exists
          ? currentItems.filter((i) => i !== item)
          : [...currentItems, item],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Travel Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Travel Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRAVEL_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, travelStyle: style.value }))
              }
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                formData.travelStyle === style.value
                  ? 'border-secondary-500 bg-secondary-500/5 text-secondary-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{style.icon}</span>
              <span className="text-sm font-medium">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Favorite Destinations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Favorite Destinations in Sri Lanka
        </label>
        <div className="flex flex-wrap gap-2">
          {SRI_LANKAN_DESTINATIONS.map((dest) => (
            <button
              key={dest}
              type="button"
              onClick={() => toggleArrayItem('favoriteDestinations', dest)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                formData.favoriteDestinations?.includes(dest)
                  ? 'bg-secondary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Dietary Restrictions
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((diet) => (
            <button
              key={diet}
              type="button"
              onClick={() => toggleArrayItem('dietaryRestrictions', diet)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                formData.dietaryRestrictions?.includes(diet)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {diet}
            </button>
          ))}
        </div>
      </div>

      {/* Mobility Needs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Mobility & Accessibility Needs
        </label>
        <div className="flex flex-wrap gap-2">
          {MOBILITY_OPTIONS.map((need) => (
            <button
              key={need}
              type="button"
              onClick={() => toggleArrayItem('mobilityNeeds', need)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                formData.mobilityNeeds?.includes(need)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {need}
            </button>
          ))}
        </div>
      </div>

      {/* Currency & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, currency: e.target.value }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr.value} value={curr.value}>
                {curr.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Language
          </label>
          <select
            value={formData.language}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, language: e.target.value }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Preferences
        </button>
      </div>
    </form>
  );
};

export default PreferencesSelector;
