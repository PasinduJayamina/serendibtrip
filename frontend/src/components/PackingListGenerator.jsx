import { useState, useEffect, useRef, useCallback } from 'react';
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
  clothing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  toiletries: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  electronics: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  documents: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accessories: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  footwear: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  essentials: 'bg-green-500/10 text-green-600 border-green-500/20',
  weather: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  default: 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
};

/**
 * Packing List Generator Component
 * Generates personalized packing lists based on trip details and weather
 */
const PackingListGenerator = ({ tripDetails, weather }) => {
  const { t } = useTranslation();
  const storageKey = `serendibtrip-packing-${tripDetails?.destination || 'default'}`;
  const categoriesRef = useRef(null);

  // Restore state from sessionStorage if available
  const [packingList, setPackingList] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.packingList || null;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.checkedItems || {};
      }
    } catch { /* ignore */ }
    return {};
  });
  const [expandedCategories, setExpandedCategories] = useState({});

  // Persist to sessionStorage whenever checkedItems or packingList change
  useEffect(() => {
    if (packingList) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ packingList, checkedItems }));
      } catch { /* ignore */ }
    }
  }, [checkedItems, packingList, storageKey]);

  useEffect(() => {
    if (tripDetails?.destination && !packingList && !isLoading) {
      generatePackingList();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripDetails?.destination]);

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

  const toggleItem = useCallback((categoryName, itemIndex) => {
    // Save scroll position before state update
    const scrollTop = categoriesRef.current?.scrollTop;
    setCheckedItems(prev => ({
      ...prev,
      [`${categoryName}-${itemIndex}`]: !prev[`${categoryName}-${itemIndex}`],
    }));
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      if (categoriesRef.current && scrollTop !== undefined) {
        categoriesRef.current.scrollTop = scrollTop;
      }
    });
  }, []);

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

  // Initial state - better empty state or error state if clicked regenerate
  if (!packingList && !isLoading) {
    if (!tripDetails?.destination) {
      return (
        <div className="card p-6 text-center h-[300px] flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
            <Luggage className="w-8 h-8 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            {t('packingList.smartTitle', 'Smart Packing List')}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto">
            {t('packingList.selectDestination', 'Select a destination to auto-generate your personalized packing list')}
          </p>
        </div>
      );
    }
    // Generated but errored
    return (
      <div className="card p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <Luggage className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          {t('packingList.title')}
        </h3>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={generatePackingList}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-brand-primary)] text-white rounded-xl font-medium hover:bg-[#d69527] transition-colors shadow-sm"
        >
          <RefreshCw className="w-5 h-5" />
          {t('packingList.tryAgain', 'Try Again')}
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">{t('packingList.generating')}</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">{t('packingList.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // Packing list generated
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-brand-ocean)] to-[#2a5a6e] text-white p-4">
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const text = packingList.categories
                  .map(cat => `\n${cat.name}:\n${cat.items.map(item => `  □ ${typeof item === 'string' ? item : item.name}`).join('\n')}`)
                  .join('\n');
                navigator.clipboard.writeText(`Packing List for ${tripDetails.destination}\n${text}`);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={generatePackingList}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={t('packingList.regenerate')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
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
        <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-3 flex items-start gap-3">
          {weather?.current?.condition?.includes('rain') ? (
            <CloudRain className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Sun className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-sky-800">{packingList.weatherTip}</p>
        </div>
      )}

      {/* Categories - scrollable container with scroll isolation */}
      <div
        ref={categoriesRef}
        className="divide-y divide-gray-100 max-h-[55vh] overflow-y-auto"
        style={{ overscrollBehavior: 'contain' }}
      >
        {packingList?.categories?.map((category) => {
          const IconComponent = CATEGORY_ICONS[category.name?.toLowerCase()] || CATEGORY_ICONS.default;
          const colorClass = CATEGORY_COLORS[category.name?.toLowerCase()] || CATEGORY_COLORS.default;
          const isExpanded = expandedCategories[category.name];
          
          return (
            <div key={category.name} className="bg-[var(--color-bg-secondary)]">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg-sunken)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-[var(--color-text-primary)]">{category.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)]">{category.items?.length} {t('packingList.items')}</p>
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
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                          isChecked 
                            ? 'bg-emerald-500/5 border-emerald-500/10 opacity-75' 
                            : 'bg-[var(--color-bg-sunken)] border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          isChecked 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(category.name, idx)}
                          className="sr-only"
                        />
                        <span className={`text-sm ${isChecked ? 'text-[var(--color-text-primary)] line-through' : 'text-[var(--color-text-secondary)]'}`}>
                          {typeof item === 'string' ? item : item.name}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isChecked ? 'bg-emerald-500/20 text-emerald-600' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
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
        <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-brand-primary)]/5">
          <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-brand-primary)]" />
            {t('packingList.proTips')}
          </h4>
          <ul className="space-y-1">
            {packingList.tips.map((tip, idx) => (
              <li key={idx} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
                <span className="text-[var(--color-brand-primary)]">•</span>
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
