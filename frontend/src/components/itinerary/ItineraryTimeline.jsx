import { useState, useRef, useCallback } from 'react';
import {
  DocumentArrowDownIcon,
  ShareIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ChartBarIcon,
  MapIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import DayCard from './DayCard';
import ActivityModal from './ActivityModal';
import { formatCurrency } from '../../utils/categoryIcons';

const ItineraryTimeline = ({
  itinerary,
  tripSummary,
  onActivityUpdate,
  onActivityDelete,
  onActivityAdd,
  onActivityReorder,
  totalBudget,
  weatherData,
  onViewMap,
  onLocationClick,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const timelineRef = useRef(null);
  const printRef = useRef(null);

  // Calculate budget stats
  const calculateTotalSpent = () => {
    if (!itinerary) return 0;
    return itinerary.reduce((total, day) => {
      const activitiesCost =
        day.activities?.reduce(
          (sum, activity) => sum + (activity.cost || 0),
          0
        ) || 0;
      const mealsCost =
        (day.meals?.breakfast?.estimatedCost || 0) +
        (day.meals?.lunch?.estimatedCost || 0) +
        (day.meals?.dinner?.estimatedCost || 0);
      const transportCost = day.transportation?.estimatedCost || 0;
      return total + activitiesCost + mealsCost + transportCost;
    }, 0);
  };

  const totalSpent = calculateTotalSpent();
  const budgetRemaining = totalBudget - totalSpent;
  const budgetPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Handle add activity
  const handleAddActivity = (dayIndex) => {
    setSelectedDayIndex(dayIndex);
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  // Handle save activity from modal
  const handleSaveActivity = (activityData) => {
    if (editingActivity) {
      onActivityUpdate?.(selectedDayIndex, editingActivity.index, activityData);
    } else {
      onActivityAdd?.(selectedDayIndex, activityData);
    }
    setShowActivityModal(false);
    setEditingActivity(null);
  };

  // Handle view route on map
  const handleViewRoute = (day) => {
    const coordinates = day.activities
      ?.filter((a) => a.coordinates?.lat && a.coordinates?.lng)
      .map((a) => ({
        lat: a.coordinates.lat,
        lng: a.coordinates.lng,
        name: a.name,
        time: a.time,
      }));
    onViewMap?.(coordinates, day.day);
  };

  // Handle export to PDF
  const handleExportPDF = async () => {
    // Dynamic import for better code splitting
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const opt = {
        margin: [10, 10],
        filename: `itinerary-${tripSummary?.destination || 'trip'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(
        'PDF export requires html2pdf.js library. Please install it with: npm install html2pdf.js'
      );
    }
  };

  // Handle share
  const handleShare = async () => {
    const shareData = {
      title: `Trip to ${tripSummary?.destination || 'My Trip'}`,
      text: `Check out my ${itinerary?.length}-day itinerary to ${tripSummary?.destination}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  // Timeline navigation
  const scrollToDay = (dayIndex) => {
    setActiveDay(dayIndex);
    // Smooth scroll to the day
    const dayElements = document.querySelectorAll('[data-day-index]');
    if (dayElements[dayIndex]) {
      dayElements[dayIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <CalendarDaysIcon className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Itinerary Yet
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          Generate an AI-powered itinerary or create your own trip plan to see
          it displayed here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Share toast */}
      {showShareToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary-600 text-white rounded-lg shadow-lg">
            <ClipboardDocumentIcon className="w-5 h-5" />
            <span>Link copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        {/* Trip title and actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {tripSummary?.overallTheme ||
                `Trip to ${tripSummary?.destination}`}
            </h1>
            <p className="text-gray-500 mt-1">
              {itinerary.length} days · {tripSummary?.groupSize || 2} travelers
              · {tripSummary?.destination}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                isEditMode
                  ? 'bg-secondary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isEditMode ? (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Done Editing
                </>
              ) : (
                <>
                  <PencilSquareIcon className="w-5 h-5" />
                  Edit
                </>
              )}
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary-50 text-secondary-700 rounded-lg font-medium hover:bg-secondary-100 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Budget overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-secondary-50 to-accent-50 rounded-xl">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 mb-1">Total Budget</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalBudget)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Estimated Spending</p>
            <p className="text-2xl font-bold text-secondary-600">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500 mb-1">Remaining</p>
            <p
              className={`text-2xl font-bold ${
                budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(Math.abs(budgetRemaining))}
              {budgetRemaining < 0 && (
                <span className="text-sm font-normal ml-1">over budget</span>
              )}
            </p>
          </div>
        </div>

        {/* Budget progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Budget Usage</span>
            <span
              className={`font-medium ${
                budgetPercentage > 100 ? 'text-red-600' : 'text-secondary-600'
              }`}
            >
              {budgetPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercentage > 100
                  ? 'bg-red-500'
                  : budgetPercentage > 80
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-r from-secondary-400 to-secondary-600'
              }`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          {budgetPercentage > 100 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>
                You're {(budgetPercentage - 100).toFixed(1)}% over budget
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline navigation - horizontal scroll on mobile */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-6 overflow-hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollToDay(Math.max(0, activeDay - 1))}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={activeDay === 0}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max px-2">
              {itinerary.map((day, index) => (
                <button
                  key={index}
                  onClick={() => scrollToDay(index)}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${
                    activeDay === index
                      ? 'bg-secondary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xs font-medium opacity-80">Day</span>
                  <span className="text-lg font-bold">{day.day}</span>
                  <span className="text-xs truncate max-w-[60px]">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() =>
              scrollToDay(Math.min(itinerary.length - 1, activeDay + 1))
            }
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={activeDay === itinerary.length - 1}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days list */}
      <div ref={printRef} className="space-y-6">
        {/* Print header - only visible when printing */}
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {tripSummary?.overallTheme || `Trip to ${tripSummary?.destination}`}
          </h1>
          <p className="text-gray-600">
            {itinerary.length} days · Budget: {formatCurrency(totalBudget)}
          </p>
        </div>

        {itinerary.map((day, index) => (
          <div key={day.day || index} data-day-index={index}>
            <DayCard
              day={day}
              dayIndex={index}
              isEditMode={isEditMode}
              onActivityUpdate={onActivityUpdate}
              onActivityDelete={onActivityDelete}
              onActivityReorder={onActivityReorder}
              onAddActivity={handleAddActivity}
              onViewRoute={handleViewRoute}
              onLocationClick={onLocationClick}
              weatherData={weatherData}
            />
          </div>
        ))}
      </div>

      {/* Best time info */}
      {tripSummary?.bestTimeToVisit && (
        <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-accent-50 rounded-2xl">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🌤️ Best Time to Visit
          </h3>
          <p className="text-blue-700">{tripSummary.bestTimeToVisit}</p>
        </div>
      )}

      {/* Activity modal */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setEditingActivity(null);
        }}
        onSave={handleSaveActivity}
        activity={editingActivity?.data}
        dayDate={
          selectedDayIndex !== null ? itinerary[selectedDayIndex]?.date : null
        }
      />

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-print-area],
          [data-print-area] * {
            visibility: visible;
          }
          [data-print-area] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ItineraryTimeline;
