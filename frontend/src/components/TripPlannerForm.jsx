import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { format, differenceInDays, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  Heart,
  Loader2,
  ChevronDown,
  Check,
  X,
  Lock,
  Home,
  Car,
} from "lucide-react";
import { useToast } from "./ui/Toast";
import { useFeatureAccess } from "../hooks/useFeatureAccess";
import { useItineraryStore } from "../store/itineraryStore";

// Constants
const DESTINATIONS = [
  "Colombo",
  "Kandy",
  "Galle",
  "Mirissa",
  "Nuwara Eliya",
  "Sigiriya",
  "Anuradhapura",
  "Trincomalee",
  "Ella",
  "Jaffna",
];

const INTERESTS = [
  { id: "culture", label: "Culture", icon: "🏛️" },
  { id: "adventure", label: "Adventure", icon: "🏔️" },
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "food", label: "Food", icon: "🍛" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "wildlife", label: "Wildlife", icon: "🐘" },
  { id: "history", label: "History", icon: "📜" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "nightlife", label: "Nightlife", icon: "🌙" },
];

const GROUP_SIZES = Array.from({ length: 10 }, (_, i) => i + 1);

// Accommodation type options with average costs per night - 2026 PRICES
const ACCOMMODATION_TYPES = [
  {
    id: "budget",
    label: "Budget (Hostel/Guesthouse)",
    icon: "🏠",
    avgCost: 10000,
    description: "LKR 5,000-15,000/night",
  },
  {
    id: "midrange",
    label: "Mid-range (3-star Hotel)",
    icon: "🏨",
    avgCost: 35000,
    description: "LKR 15,000-55,000/night",
  },
  {
    id: "luxury",
    label: "Luxury (4-5 star Resort)",
    icon: "🏰",
    avgCost: 110000,
    description: "LKR 55,000-170,000/night",
  },
];

// Transport mode options with average daily costs
const TRANSPORT_MODES = [
  {
    id: "public",
    label: "Public Transport (Bus/Train)",
    icon: "🚌",
    avgCost: 1000,
    description: "LKR 500-2,000/day",
  },
  {
    id: "tuktuk",
    label: "Tuk-Tuk (PickMe/Local)",
    icon: "🛺",
    avgCost: 3500,
    description: "LKR 2,000-5,000/day",
  },
  {
    id: "private",
    label: "Private Car with Driver",
    icon: "🚗",
    avgCost: 12000,
    description: "LKR 8,000-15,000/day",
  },
  {
    id: "mix",
    label: "Mix (Combination)",
    icon: "🎯",
    avgCost: 2500,
    description: "Flexible based on needs",
  },
];

const BUDGET_MIN = 10000;
const BUDGET_MAX = 500000;

// Utility function for formatting currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Autocomplete Input Component
const AutocompleteInput = ({
  value,
  onChange,
  onBlur,
  suggestions,
  placeholder,
  error,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange(filteredSuggestions[highlightedIndex]);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle mouse down to prevent blur from firing before click
  const handleMouseDown = (e) => {
    e.preventDefault(); // Prevent blur
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 150);
            onBlur?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${id}-option-${highlightedIndex}`
              : undefined
          }
          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-secondary-500"
          } focus:ring-2 focus:border-transparent outline-none transition-all bg-white`}
        />
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          onMouseDown={handleMouseDown}
          className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                highlightedIndex === index
                  ? "bg-secondary-500/10 text-secondary-500"
                  : "hover:bg-gray-50"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Multi-Select Checkbox Component
const InterestsSelect = ({ value = [], onChange, error }) => {
  const toggleInterest = (interestId) => {
    if (value.includes(interestId)) {
      onChange(value.filter((id) => id !== interestId));
    } else {
      onChange([...value, interestId]);
    }
  };

  return (
    <div
      role="group"
      aria-labelledby="interests-label"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
    >
      {INTERESTS.map((interest) => {
        const isSelected = value.includes(interest.id);
        return (
          <label
            key={interest.id}
            className={`relative flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              isSelected
                ? "border-secondary-500 bg-secondary-500/10 text-secondary-500"
                : "border-gray-200 hover:border-gray-300 bg-white"
            } ${error ? "border-red-300" : ""}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleInterest(interest.id)}
              className="sr-only"
              aria-describedby={error ? "interests-error" : undefined}
            />
            <span className="text-lg" aria-hidden="true">
              {interest.icon}
            </span>
            <span className="text-sm font-medium">{interest.label}</span>
            {isSelected && (
              <Check
                className="absolute top-1 right-1 w-4 h-4 text-secondary-500"
                aria-hidden="true"
              />
            )}
          </label>
        );
      })}
    </div>
  );
};

// Main TripPlannerForm Component
const TripPlannerForm = ({ onSubmit, existingTrips = [], localTripsMetadata = {} }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isGuest, isAuthenticated, canUseFeature } = useFeatureAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [dateOverlapError, setDateOverlapError] = useState(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultEndDate = format(addDays(new Date(), 3), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      destination: "",
      startDate: today,
      endDate: defaultEndDate,
      budget: 50000,
      groupSize: 2,
      accommodationType: "midrange", // Default to mid-range
      transportMode: "tuktuk", // Default to tuk-tuk (popular choice)
      interests: [],
    },
    mode: "onBlur",
  });

  const watchStartDate = watch("startDate");
  const watchEndDate = watch("endDate");
  const watchBudget = watch("budget");
  const watchGroupSize = watch("groupSize");
  const watchAccommodationType = watch("accommodationType");
  const watchTransportMode = watch("transportMode");

  // Calculate trip duration
  const tripDuration = useCallback(() => {
    if (watchStartDate && watchEndDate) {
      const days = differenceInDays(
        new Date(watchEndDate),
        new Date(watchStartDate)
      );
      return days > 0 ? days : 0;
    }
    return 0;
  }, [watchStartDate, watchEndDate]);

  // Calculate budget per person
  const budgetPerPerson = useCallback(() => {
    const budget = Number(watchBudget) || 0;
    const groupSize = Number(watchGroupSize) || 1;
    return Math.round(budget / groupSize);
  }, [watchBudget, watchGroupSize]);

  // Update end date when start date changes
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      if (new Date(watchEndDate) <= new Date(watchStartDate)) {
        setValue(
          "endDate",
          format(addDays(new Date(watchStartDate), 1), "yyyy-MM-dd")
        );
      }
    }
  }, [watchStartDate, watchEndDate, setValue]);

  // Check if new trip dates overlap with existing trips
  // Checks BOTH backend trips AND local-only trips (from tripsMetadata)
  const checkDateOverlap = (startDate, endDate) => {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    // 1. Check backend trips
    if (existingTrips && existingTrips.length > 0) {
      for (const trip of existingTrips) {
        if (!trip.startDate || !trip.endDate) continue;
        const existingStart = new Date(trip.startDate);
        const existingEnd = new Date(trip.endDate);
        
        // Skip trips with invalid dates
        if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) continue;
        
        if (newStart <= existingEnd && newEnd >= existingStart) {
          return {
            destination: trip.destination,
            startDate: format(existingStart, "MMM d"),
            endDate: format(existingEnd, "MMM d, yyyy"),
          };
        }
      }
    }

    // 2. Check local-only trips (from tripsMetadata in itinerary store)
    // Only consider trips that have actual saved items (skip ghost/stale metadata)
    if (localTripsMetadata && Object.keys(localTripsMetadata).length > 0) {
      const backendTripIds = new Set((existingTrips || []).map(t => t.tripId));
      // Get saved items to verify which local trips are real (have items)
      const allSavedItems = useItineraryStore.getState().savedItems || [];
      const tripIdsWithItems = new Set(allSavedItems.map(item => item.tripId));
      
      for (const [tripId, meta] of Object.entries(localTripsMetadata)) {
        if (backendTripIds.has(tripId)) continue; // Already checked above
        if (!tripIdsWithItems.has(tripId)) continue; // Skip ghost trips with no items
        if (!meta.startDate || !meta.endDate) continue;
        const existingStart = new Date(meta.startDate);
        const existingEnd = new Date(meta.endDate);
        
        // Skip trips with invalid dates
        if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) continue;
        
        if (newStart <= existingEnd && newEnd >= existingStart) {
          return {
            destination: meta.destination || tripId,
            startDate: format(existingStart, "MMM d"),
            endDate: format(existingEnd, "MMM d, yyyy"),
          };
        }
      }
    }

    return null;
  };

  const processSubmit = async (data) => {
    setIsSubmitting(true);
    setDateOverlapError(null);

    try {
      // Check for date overlap (against both backend and local trips)
      const overlap = checkDateOverlap(data.startDate, data.endDate);
      if (overlap) {
        setDateOverlapError(
          `You already have a trip to ${overlap.destination} from ${overlap.startDate} - ${overlap.endDate}. Please choose different dates.`
        );
        setIsSubmitting(false);
        return;
      }

      const formData = {
        ...data,
        tripDuration: tripDuration(),
        budgetPerPerson: budgetPerPerson(),
      };

      // Check AI limit before processing
      const aiAccess = canUseFeature("aiRecommendations");

      if (onSubmit) {
        await onSubmit(formData);
      }

      // Only show success messages if AI limit was not reached
      if (aiAccess.allowed) {
        if (isGuest) {
          toast.success(
            "Exploring recommendations! Sign in to save your trip. 🎉"
          );
          // Show upgrade prompt after a delay
          setTimeout(() => setShowLoginPrompt(true), 3000);
        } else {
          toast.success("Trip plan created successfully! 🎉");
        }
      }
      // If limit was reached, the error toast is shown in App.jsx handleSubmit
    } catch (error) {
      toast.error(
        error.message || "Failed to create trip plan. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Upgrade Prompt Modal for Guests */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLoginPrompt(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Love What You See?</h3>
                  <p className="text-sm text-white/80">
                    Save your trip for later
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 text-sm mb-4">
                Create a free account to save this trip and unlock more
                features:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-secondary-500" />
                  Save trips & itineraries
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-secondary-500" />
                  20 AI chats per day
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-secondary-500" />
                  Personalized packing lists
                </li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    navigate("/register");
                  }}
                  className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    navigate("/login");
                  }}
                  className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
                >
                  Sign In
                </button>
              </div>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Continue exploring
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit(processSubmit)}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6"
          noValidate
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              {t("tripPlanner.title")}
            </h2>
            <p className="text-gray-500 mt-2">{t("tripPlanner.subtitle")}</p>
          </div>

          {/* Destination Field */}
          <div className="space-y-2">
            <label
              htmlFor="destination"
              className="block text-sm font-semibold text-gray-700"
            >
              {t("tripPlanner.destination")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <Controller
              name="destination"
              control={control}
              rules={{
                required: t("tripPlanner.validation.destinationRequired"),
                validate: (value) =>
                  DESTINATIONS.some(
                    (d) => d.toLowerCase() === value.toLowerCase()
                  ) || t("tripPlanner.validation.destinationInvalid"),
              }}
              render={({ field }) => (
                <AutocompleteInput
                  id="destination"
                  name="destination"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  suggestions={DESTINATIONS}
                  placeholder={t("tripPlanner.destinationPlaceholder")}
                  error={errors.destination}
                />
              )}
            />
            {errors.destination && (
              <p
                className="text-red-500 text-sm flex items-center gap-1"
                role="alert"
              >
                <X className="w-4 h-4" />
                {errors.destination.message}
              </p>
            )}
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <label
                htmlFor="startDate"
                className="block text-sm font-semibold text-gray-700"
              >
                {t("tripPlanner.startDate")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  id="startDate"
                  min={today}
                  {...register("startDate", {
                    required: t("tripPlanner.validation.startDateRequired"),
                    validate: (value) =>
                      new Date(value) >= new Date(today) ||
                      t("tripPlanner.validation.startDatePast"),
                  })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.startDate
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-secondary-500"
                  } focus:ring-2 focus:border-transparent outline-none transition-all`}
                />
              </div>
              {errors.startDate && (
                <p
                  className="text-red-500 text-sm flex items-center gap-1"
                  role="alert"
                >
                  <X className="w-4 h-4" />
                  {errors.startDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label
                htmlFor="endDate"
                className="block text-sm font-semibold text-gray-700"
              >
                {t("tripPlanner.endDate")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  id="endDate"
                  min={watchStartDate || today}
                  {...register("endDate", {
                    required: t("tripPlanner.validation.endDateRequired"),
                    validate: {
                      afterStart: (value) =>
                        new Date(value) > new Date(watchStartDate) ||
                        t("tripPlanner.validation.endDateBeforeStart"),
                      maxDuration: (value) => {
                        const days = differenceInDays(new Date(value), new Date(watchStartDate));
                        return days <= 14 || "Trip duration cannot exceed 14 days. For longer trips, please plan in segments.";
                      }
                    }
                  })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.endDate
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-secondary-500"
                  } focus:ring-2 focus:border-transparent outline-none transition-all`}
                />
              </div>
              {errors.endDate && (
                <p
                  className="text-red-500 text-sm flex items-center gap-1"
                  role="alert"
                >
                  <X className="w-4 h-4" />
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Trip Duration Display */}
          {tripDuration() > 0 && (
            <div className="bg-secondary-500/5 border border-secondary-500/20 rounded-lg p-4 flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-secondary-500" />
              <span className="text-secondary-500 font-medium">
                {t("tripPlanner.tripDuration")}: {tripDuration()}{" "}
                {tripDuration() === 1
                  ? t("tripPlanner.day")
                  : t("tripPlanner.days")}
              </span>
            </div>
          )}

          {/* Budget and Group Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget */}
            <div className="space-y-2">
              <label
                htmlFor="budget"
                className="block text-sm font-semibold text-gray-700"
              >
                {t("tripPlanner.budgetLKR")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Wallet
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="number"
                  id="budget"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={1000}
                  {...register("budget", {
                    required: t("tripPlanner.validation.budgetRequired"),
                    min: {
                      value: BUDGET_MIN,
                      message: t("tripPlanner.validation.budgetMin", {
                        amount: formatCurrency(BUDGET_MIN),
                      }),
                    },
                    max: {
                      value: BUDGET_MAX,
                      message: t("tripPlanner.validation.budgetMax", {
                        amount: formatCurrency(BUDGET_MAX),
                      }),
                    },
                    valueAsNumber: true,
                  })}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.budget
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-secondary-500"
                  } focus:ring-2 focus:border-transparent outline-none transition-all`}
                />
              </div>
              {errors.budget && (
                <p
                  className="text-red-500 text-sm flex items-center gap-1"
                  role="alert"
                >
                  <X className="w-4 h-4" />
                  {errors.budget.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {t("tripPlanner.budgetRange")}: {formatCurrency(BUDGET_MIN)} -{" "}
                {formatCurrency(BUDGET_MAX)}
              </p>
            </div>

            {/* Group Size */}
            <div className="space-y-2">
              <label
                htmlFor="groupSize"
                className="block text-sm font-semibold text-gray-700"
              >
                {t("tripPlanner.groupSize")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
                <select
                  id="groupSize"
                  {...register("groupSize", {
                    required: t("tripPlanner.validation.groupSizeRequired"),
                    valueAsNumber: true,
                  })}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg border appearance-none ${
                    errors.groupSize
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-secondary-500"
                  } focus:ring-2 focus:border-transparent outline-none transition-all bg-white`}
                >
                  {GROUP_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}{" "}
                      {size === 1
                        ? t("tripPlanner.person")
                        : t("tripPlanner.people")}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              {errors.groupSize && (
                <p
                  className="text-red-500 text-sm flex items-center gap-1"
                  role="alert"
                >
                  <X className="w-4 h-4" />
                  {errors.groupSize.message}
                </p>
              )}
            </div>
          </div>

          {/* Budget Per Person Display */}
          {budgetPerPerson() > 0 && (
            <div className="bg-gradient-to-r from-secondary-500/5 to-secondary-500/10 border border-secondary-500/20 rounded-lg p-4 flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5 text-secondary-500" />
              <span className="text-secondary-500 font-medium">
                {t("tripPlanner.budgetPerPerson")}:{" "}
                {formatCurrency(budgetPerPerson())}
              </span>
            </div>
          )}

          {/* Accommodation & Transport Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Accommodation Type */}
            <div className="space-y-2">
              <label
                htmlFor="accommodationType"
                className="block text-sm font-semibold text-gray-700"
              >
                <Home className="w-4 h-4 inline mr-1 text-gray-500" />
                Accommodation Type
              </label>
              <div className="relative">
                <select
                  id="accommodationType"
                  {...register("accommodationType")}
                  className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-secondary-500 focus:ring-2 focus:border-transparent outline-none transition-all bg-white appearance-none"
                >
                  {ACCOMMODATION_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-gray-500">
                {ACCOMMODATION_TYPES.find(t => t.id === watchAccommodationType)?.description || ''}
              </p>
            </div>

            {/* Transport Mode */}
            <div className="space-y-2">
              <label
                htmlFor="transportMode"
                className="block text-sm font-semibold text-gray-700"
              >
                <Car className="w-4 h-4 inline mr-1 text-gray-500" />
                Transport Mode
              </label>
              <div className="relative">
                <select
                  id="transportMode"
                  {...register("transportMode")}
                  className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-secondary-500 focus:ring-2 focus:border-transparent outline-none transition-all bg-white appearance-none"
                >
                  {TRANSPORT_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.icon} {mode.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-gray-500">
                {TRANSPORT_MODES.find(m => m.id === watchTransportMode)?.description || ''}
              </p>
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-3">
            <label
              id="interests-label"
              className="block text-sm font-semibold text-gray-700"
            >
              <Heart className="w-4 h-4 inline mr-1 text-secondary-500" />
              {t("tripPlanner.interests")}{" "}
              <span className="text-red-500">*</span>
              <span className="font-normal text-gray-500 ml-2">
                ({t("tripPlanner.selectAtLeastOne")})
              </span>
            </label>
            <Controller
              name="interests"
              control={control}
              rules={{
                validate: (value) =>
                  (value && value.length > 0) ||
                  t("tripPlanner.validation.interestsRequired"),
              }}
              render={({ field }) => (
                <InterestsSelect
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.interests}
                />
              )}
            />
            {errors.interests && (
              <p
                id="interests-error"
                className="text-red-500 text-sm flex items-center gap-1"
                role="alert"
              >
                <X className="w-4 h-4" />
                {errors.interests.message}
              </p>
            )}
          </div>

          {/* Date Overlap Error */}
          {dateOverlapError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                <X className="w-4 h-4" />
                {dateOverlapError}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-secondary-500 hover:bg-[#1a6f7a] text-white font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-secondary-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("tripPlanner.creatingTrip")}
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  {t("tripPlanner.planTrip")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default TripPlannerForm;
