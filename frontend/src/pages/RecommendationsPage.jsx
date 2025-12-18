import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendationPanel } from '../components/recommendations';
import {
  MapPinIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useItineraryStore } from '../store/itineraryStore';
import { useRecommendationsStore } from '../store/recommendationsStore';

// Sri Lanka destinations
const DESTINATIONS = [
  'Colombo',
  'Kandy',
  'Galle',
  'Sigiriya',
  'Nuwara Eliya',
  'Ella',
  'Mirissa',
  'Trincomalee',
  'Anuradhapura',
  'Jaffna',
];

// Interest options
const INTEREST_OPTIONS = [
  { id: 'culture', label: 'Culture & Heritage', emoji: '🏛️' },
  { id: 'nature', label: 'Nature & Wildlife', emoji: '🌿' },
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'food', label: 'Food & Cuisine', emoji: '🍜' },
  { id: 'beaches', label: 'Beaches', emoji: '🏖️' },
  { id: 'relaxation', label: 'Relaxation', emoji: '🧘' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'history', label: 'History', emoji: '📜' },
];

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Get default dates (starting tomorrow)
const getDefaultDates = (durationDays) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const endDate = new Date(tomorrow);
  endDate.setDate(endDate.getDate() + durationDays - 1);

  return {
    startDate: formatDate(tomorrow),
    endDate: formatDate(endDate),
  };
};

const RecommendationsPage = () => {
  const navigate = useNavigate();

  // Get cached params from recommendations store
  const { params: cachedParams, isValid } = useRecommendationsStore();

  // Always start with defaults - cache is only for showing recommendations
  // when navigating back to this page within the same session
  const [destination, setDestination] = useState('Kandy');
  const [interests, setInterests] = useState(['culture', 'nature', 'food']);
  const [budget, setBudget] = useState(150000);
  const [duration, setDuration] = useState(4);
  const [groupSize, setGroupSize] = useState(2);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);

  // Zustand store for itinerary
  const {
    savedItems,
    addToSaved,
    isSaved,
    setTripDetails,
    lastRecommendations,
    setLastRecommendations,
  } = useItineraryStore();

  // Sync preferences when destination matches cached recommendations
  useEffect(() => {
    if (cachedParams && isValid() && cachedParams.destination === destination) {
      // Update preferences to match cached params
      if (cachedParams.duration) setDuration(cachedParams.duration);
      if (cachedParams.groupSize) setGroupSize(cachedParams.groupSize);
      if (cachedParams.budget) setBudget(cachedParams.budget);
      if (cachedParams.interests) setInterests(cachedParams.interests);
    }
  }, [destination, cachedParams, isValid]);

  // Calculate dates based on duration
  const { startDate, endDate } = getDefaultDates(duration);

  // Update trip details in store when preferences change
  useEffect(() => {
    setTripDetails({
      destination,
      startDate,
      endDate,
      duration,
      budget,
      groupSize,
    });
  }, [
    destination,
    startDate,
    endDate,
    duration,
    budget,
    groupSize,
    setTripDetails,
  ]);

  // Toggle interest selection
  const toggleInterest = (interestId) => {
    setInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((i) => i !== interestId)
        : [...prev, interestId]
    );
  };

  // Handle add to itinerary - saves to Zustand store with persistence
  const handleAddToItinerary = (recommendation) => {
    if (isSaved(recommendation.name)) {
      // Already saved
      return;
    }

    addToSaved(recommendation);
    setLastAddedItem(recommendation.name);
    setShowAddedToast(true);

    // Hide toast after 3 seconds
    setTimeout(() => {
      setShowAddedToast(false);
      setLastAddedItem(null);
    }, 3000);
  };

  // Handle view itinerary
  const handleViewItinerary = () => {
    navigate('/itinerary');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Toast notification for added items */}
      {showAddedToast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className="bg-teal-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">"{lastAddedItem}" saved!</span>
            <button
              onClick={handleViewItinerary}
              className="ml-2 flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm transition-colors"
            >
              View Itinerary
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="w-8 h-8" />
            <span className="text-purple-200 font-medium">AI-Powered</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            Travel Recommendations
          </h1>
          <p className="text-purple-200">
            Get personalized suggestions powered by Google Gemini AI
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preferences Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Trip Preferences
              </h2>

              {/* Destination */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="w-4 h-4 text-purple-500" />
                  Destination
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  {DESTINATIONS.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <CalendarDaysIcon className="w-4 h-4 text-purple-500" />
                  Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Group Size */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="w-4 h-4 text-purple-500" />
                  Travelers
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={groupSize}
                  onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-purple-500" />
                  Budget (LKR)
                </label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value) || 10000)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ≈ ${(budget / 300).toFixed(0)} USD
                </p>
              </div>

              {/* Interests */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        interests.includes(interest.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{interest.emoji}</span>
                      {interest.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-purple-50 rounded-xl">
                <h3 className="text-sm font-semibold text-purple-800 mb-2">
                  Trip Summary
                </h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>📍 {destination}</li>
                  <li>📅 {duration} days</li>
                  <li>👥 {groupSize} travelers</li>
                  <li>💰 LKR {budget.toLocaleString()}</li>
                  <li>❤️ {interests.length} interests</li>
                </ul>
              </div>

              {/* Saved Items - From Zustand Store */}
              {savedItems.length > 0 && (
                <div className="mt-6 p-4 bg-teal-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-teal-800">
                      Saved to Itinerary ({savedItems.length})
                    </h3>
                    <button
                      onClick={handleViewItinerary}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      View All
                      <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="text-sm text-teal-700 space-y-1 max-h-32 overflow-y-auto">
                    {savedItems.slice(0, 5).map((item, idx) => (
                      <li
                        key={idx}
                        className="truncate flex items-center gap-1"
                      >
                        <CheckCircleIcon className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        {item.name}
                      </li>
                    ))}
                    {savedItems.length > 5 && (
                      <li className="text-teal-500 text-xs">
                        +{savedItems.length - 5} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations Panel */}
          <div className="lg:col-span-2">
            <RecommendationPanel
              destination={destination}
              interests={interests}
              budget={budget}
              duration={duration}
              groupSize={groupSize}
              startDate={startDate}
              endDate={endDate}
              onAddToItinerary={handleAddToItinerary}
              autoFetch={false}
              showFilters={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
