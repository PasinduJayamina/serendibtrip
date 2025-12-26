import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Luggage,
  Loader2,
  Check,
  Sun,
  CloudRain,
  Shirt,
  Camera,
  Footprints,
  Pill,
  CreditCard,
  FileText,
  Smartphone,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Category icons mapping
const CATEGORY_ICONS = {
  clothing: Shirt,
  toiletries: Pill,
  electronics: Smartphone,
  documents: FileText,
  accessories: Camera,
  footwear: Footprints,
  essentials: CreditCard,
  weather: Sun,
  default: Luggage,
};

// Category colors
const CATEGORY_COLORS = {
  clothing: 'bg-blue-50 text-blue-600 border-blue-200',
  toiletries: 'bg-pink-50 text-pink-600 border-pink-200',
  electronics: 'bg-purple-50 text-purple-600 border-purple-200',
  documents: 'bg-amber-50 text-amber-600 border-amber-200',
  accessories: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  footwear: 'bg-orange-50 text-orange-600 border-orange-200',
  essentials: 'bg-green-50 text-green-600 border-green-200',
  weather: 'bg-sky-50 text-sky-600 border-sky-200',
  default: 'bg-gray-50 text-gray-600 border-gray-200',
};

/**
 * Packing List Generator Component
 * Generates personalized packing lists based on trip details and weather
 */
const PackingListGenerator = ({ tripDetails, weather }) => {
  const { t } = useTranslation();
  const [packingList, setPackingList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  const generatePackingList = async () => {
    if (!tripDetails?.destination) {
      setError(t('packingList.noDestination'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/packing-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: tripDetails.destination,
          duration: tripDetails.duration || 3,
          activities: tripDetails.interests || [],
          weather: weather ? {
            temperature: weather.current?.temp,
            condition: weather.current?.condition,
            forecast: weather.forecast?.slice(0, 5),
          } : null,
          groupSize: tripDetails.groupSize || 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPackingList(data.packingList);
        // Expand all categories by default
        const expanded = {};
        data.packingList.categories?.forEach(cat => {
          expanded[cat.name] = true;
        });
        setExpandedCategories(expanded);
      } else {
        throw new Error(data.error || 'Failed to generate packing list');
      }
    } catch (err) {
      console.error('Packing list error:', err);
      setError(t('packingList.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (categoryName, itemIndex) => {
    const key = `${categoryName}-${itemIndex}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const getProgress = () => {
    if (!packingList?.categories) return { checked: 0, total: 0, percent: 0 };
    
    let total = 0;
    let checked = 0;
    
    packingList.categories.forEach(cat => {
      cat.items?.forEach((_, idx) => {
        total++;
        if (checkedItems[`${cat.name}-${idx}`]) checked++;
      });
    });
    
    return {
      checked,
      total,
      percent: total > 0 ? Math.round((checked / total) * 100) : 0,
    };
  };

  const progress = getProgress();

  // Initial state - show generate button
  if (!packingList && !isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Luggage className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t('packingList.title')}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            {t('packingList.description')}
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={generatePackingList}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm"
          >
            <Sparkles className="w-5 h-5" />
            {t('packingList.generate')}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('packingList.generating')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('packingList.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // Packing list generated
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Luggage className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">{t('packingList.title')}</h3>
              <p className="text-sm text-white/80">
                {tripDetails?.destination} • {tripDetails?.duration} {t('common.days')}
              </p>
            </div>
          </div>
          <button
            onClick={generatePackingList}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={t('packingList.regenerate')}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{t('packingList.progress')}</span>
            <span>{progress.checked}/{progress.total} ({progress.percent}%)</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weather tip */}
      {packingList?.weatherTip && (
        <div className="bg-sky-50 border-b border-sky-100 px-4 py-3 flex items-start gap-3">
          {weather?.current?.condition?.includes('rain') ? (
            <CloudRain className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Sun className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-sky-800">{packingList.weatherTip}</p>
        </div>
      )}

      {/* Categories */}
      <div className="divide-y divide-gray-100">
        {packingList?.categories?.map((category) => {
          const IconComponent = CATEGORY_ICONS[category.name?.toLowerCase()] || CATEGORY_ICONS.default;
          const colorClass = CATEGORY_COLORS[category.name?.toLowerCase()] || CATEGORY_COLORS.default;
          const isExpanded = expandedCategories[category.name];
          
          return (
            <div key={category.name} className="bg-white">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-800">{category.name}</h4>
                    <p className="text-xs text-gray-500">{category.items?.length} {t('packingList.items')}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {category.items?.map((item, idx) => {
                    const isChecked = checkedItems[`${category.name}-${idx}`];
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          isChecked 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(category.name, idx)}
                          className="sr-only"
                        />
                        <span className={`text-sm ${isChecked ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                          {typeof item === 'string' ? item : item.name}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            x{item.quantity}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips section */}
      {packingList?.tips && packingList.tips.length > 0 && (
        <div className="border-t border-gray-100 p-4 bg-sand-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            {t('packingList.proTips')}
          </h4>
          <ul className="space-y-1">
            {packingList.tips.map((tip, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-primary-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PackingListGenerator;
