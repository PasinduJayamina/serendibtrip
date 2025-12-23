import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { formatCurrency, CategoryBadge } from '../utils/categoryIcons';
import { getAllCategories } from '../services/budgetService';

const MyItineraryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(true);

  const {
    savedItems,
    tripDetails,
    removeFromSaved,
    clearItinerary,
    getEstimatedBudget,
    getExpenseSummary,
    budgetAllocation,
  } = useItineraryStore();

  // Get stored recommendations params for navigation
  const { params: storedParams, hasStoredRecommendations } =
    useRecommendationsStore();

  const estimatedBudget = getEstimatedBudget();
  const expenseSummary = getExpenseSummary();
  const categories = getAllCategories();

  // Group saved items by type
  const attractions = savedItems.filter(
    (item) => item.type === 'attraction' || !item.type
  );
  const restaurants = savedItems.filter((item) => item.type === 'restaurant');

  // Handle clear all
  const handleClearAll = () => {
    clearItinerary();
    setShowClearConfirm(false);
  };

  // Render rating
  const renderRating = (rating) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);

    return (
      <div className="flex items-center gap-0.5" title="AI Estimated Rating">
        {[...Array(5)].map((_, i) => (
          <span key={i}>
            {i < fullStars ? (
              <StarSolidIcon className="w-3 h-3 text-yellow-400" />
            ) : (
              <StarIcon className="w-3 h-3 text-gray-300" />
            )}
          </span>
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Empty state
  if (savedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">{t('itinerary.title')}</h1>
            <p className="text-teal-200">
              {t('itinerary.buildTrip')}
            </p>
          </div>
        </div>

        {/* Empty state */}
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDaysIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('itinerary.empty')}
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {t('itinerary.emptyDescription')}
            </p>
            <Link
              to="/recommendations"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <SparklesIcon className="w-5 h-5" />
              {t('itinerary.browseRecommendations')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8" />
              <h3 className="text-lg font-bold">{t('itinerary.clearAllConfirm')}</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t('itinerary.clearAllWarning', { count: savedItems.length })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('itinerary.clearAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('itinerary.title')}</h1>
              <p className="text-teal-200">
                {t('itinerary.itemsSaved', { count: savedItems.length })}
              </p>
            </div>
            <Link
              to="/recommendations"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              {t('itinerary.addMore')}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-teal-600">
              {savedItems.length}
            </div>
            <div className="text-sm text-gray-500">{t('itinerary.totalItems')}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {attractions.length}
            </div>
            <div className="text-sm text-gray-500">{t('itinerary.attractions')}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {restaurants.length}
            </div>
            <div className="text-sm text-gray-500">{t('itinerary.restaurants')}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(estimatedBudget)}
            </div>
            <div className="text-sm text-gray-500">{t('itinerary.estimatedCost')}</div>
          </div>
        </div>

        {/* Budget & Expense Breakdown */}
        {tripDetails.budget > 0 && (
          <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden">
            <button
              onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-gray-900">
                  {t('itinerary.budgetTracking')}
                </h3>
              </div>
              <span className="text-gray-400">
                {showExpenseBreakdown ? '−' : '+'}
              </span>
            </button>

            {showExpenseBreakdown && (
              <div className="px-4 pb-4 space-y-4">
                {/* Overall Budget Progress */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {t('itinerary.budgetUsed')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(expenseSummary.totalSpent)} /{' '}
                      {formatCurrency(tripDetails.budget)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        expenseSummary.percentageUsed > 90
                          ? 'bg-red-500'
                          : expenseSummary.percentageUsed > 70
                          ? 'bg-yellow-500'
                          : 'bg-teal-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          expenseSummary.percentageUsed,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{t('itinerary.percentUsed', { percent: expenseSummary.percentageUsed })}</span>
                    <span>
                      {t('itinerary.remaining', { amount: formatCurrency(expenseSummary.remaining) })}
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(categories).map(([key, category]) => {
                    const spent = expenseSummary.byCategory[key]?.spent || 0;
                    const allocated =
                      budgetAllocation?.categories[key]?.total || 0;
                    const percentage =
                      allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

                    return (
                      <div
                        key={key}
                        className="bg-gray-50 rounded-lg p-3 text-center"
                      >
                        <div className="text-2xl mb-1">{category.icon}</div>
                        <div className="text-xs text-gray-500 mb-1">
                          {category.label}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(spent)}
                        </div>
                        {allocated > 0 && (
                          <div className="text-xs text-gray-400">
                            / {formatCurrency(allocated)}
                          </div>
                        )}
                        {allocated > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full ${
                                percentage > 100
                                  ? 'bg-red-500'
                                  : percentage > 80
                                  ? 'bg-yellow-500'
                                  : 'bg-teal-500'
                              }`}
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Daily Budget Info */}
                {tripDetails.duration > 0 && (
                  <div className="flex items-center justify-between text-sm bg-teal-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <BanknotesIcon className="w-4 h-4 text-teal-600" />
                      <span className="text-teal-800">
                        {t('itinerary.dailyBudget')}:
                      </span>
                    </div>
                    <span className="font-semibold text-teal-900">
                      {formatCurrency(
                        Math.round(
                          tripDetails.budget /
                            tripDetails.duration /
                            (tripDetails.groupSize || 1)
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attractions Section */}
        {attractions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPinIcon className="w-6 h-6 text-teal-600" />
              {t('itinerary.attractionsActivities')} ({attractions.length})
            </h2>
            <div className="space-y-3">
              {attractions.map((item) => (
                <div
                  key={item.id || item.name}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        {item.category && (
                          <CategoryBadge category={item.category} size="sm" />
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {item.location && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPinIcon className="w-4 h-4" />
                            {item.location}
                          </span>
                        )}
                        {(item.entryFee || item.cost) && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CurrencyDollarIcon className="w-4 h-4" />
                            {formatCurrency(item.entryFee || item.cost)}
                          </span>
                        )}
                        {item.duration && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <ClockIcon className="w-4 h-4" />
                            {item.duration}
                          </span>
                        )}
                        {item.rating && renderRating(item.rating)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromSaved(item.name)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('itinerary.removeFromItinerary')}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurants Section */}
        {restaurants.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🍽️ {t('itinerary.restaurants')} ({restaurants.length})
            </h2>
            <div className="space-y-3">
              {restaurants.map((item) => (
                <div
                  key={item.id || item.name}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        {item.cuisine && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {item.cuisine}
                          </span>
                        )}
                      </div>
                      {item.specialty && (
                        <p className="text-sm text-gray-500 mb-2">
                          <span className="font-medium">{t('itinerary.specialty')}:</span>{' '}
                          {item.specialty}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {item.location && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPinIcon className="w-4 h-4" />
                            {item.location}
                          </span>
                        )}
                        {item.priceRange && (
                          <span className="text-green-600 font-medium">
                            {item.priceRange}
                          </span>
                        )}
                        {item.rating && renderRating(item.rating)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromSaved(item.name)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from itinerary"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
          <Link
            to="/recommendations"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <SparklesIcon className="w-5 h-5" />
            {t('itinerary.addMoreRecommendations')}
          </Link>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center justify-center gap-2 border border-red-300 text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
            {t('itinerary.clearAll')}
          </button>
        </div>

        {/* Note about ratings */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> {t('itinerary.ratingNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyItineraryPage;
