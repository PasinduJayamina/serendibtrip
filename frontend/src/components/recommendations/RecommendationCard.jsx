import { useState } from 'react';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  HeartIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  HandThumbUpIcon as ThumbUpSolidIcon,
  HandThumbDownIcon as ThumbDownSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import { CategoryBadge } from '../../utils/categoryIcons';
import { getPriceDisplay } from '../../services/pricingService';

const RecommendationCard = ({
  recommendation,
  onAddToItinerary,
  onToggleFavorite,
  onThumbsUp,
  onThumbsDown,
  isFavorite = false,
  feedback = null, // 'thumbsUp' | 'thumbsDown' | null
  showActions = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    name,
    description,
    category,
    type,
    location,
    coordinates,
    cost,
    entryFee,
    estimatedCost,
    priceRange,
    rating,
    duration,
    bestTime,
    cuisine,
    specialty,
    aiReason,
    tips,
  } = recommendation;

  // Calculate display cost using smart pricing
  const priceDisplay = getPriceDisplay(recommendation);

  // Determine category for badge
  const displayCategory = category || type || 'attraction';

  // Rating stars - Note: These are AI-estimated ratings, not Google Maps ratings
  const renderRating = () => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div
        className="flex items-center gap-1 cursor-help"
        title="AI Estimated Rating - May differ from actual Google Maps rating"
      >
        {[...Array(5)].map((_, i) => (
          <span key={i}>
            {i < fullStars ? (
              <StarSolidIcon className="w-4 h-4 text-yellow-400" />
            ) : i === fullStars && hasHalfStar ? (
              <StarIcon className="w-4 h-4 text-yellow-400" />
            ) : (
              <StarIcon className="w-4 h-4 text-gray-300" />
            )}
          </span>
        ))}
        <span className="text-sm font-medium text-gray-600 ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // Price range display
  const renderPriceRange = () => {
    if (!priceRange) return null;
    const dollars = priceRange.length;
    return <span className="text-[var(--color-brand-primary)] font-medium">{priceRange}</span>;
  };

  // Open in Google Maps
  const handleLocationClick = () => {
    if (name) {
      const encodedName = encodeURIComponent(name);
      if (coordinates?.lat && coordinates?.lng) {
        window.open(
          `https://www.google.com/maps/search/${encodedName}/@${coordinates.lat},${coordinates.lng},17z`,
          '_blank'
        );
      } else {
        window.open(
          `https://www.google.com/maps/search/${encodedName}`,
          '_blank'
        );
      }
    }
  };

  if (compact) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[var(--color-text-primary)] truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <CategoryBadge category={displayCategory} />
              {renderRating()}
            </div>
          </div>
          {showActions && (
            <button
              onClick={() => onAddToItinerary?.(recommendation)}
              className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
              title="Add to itinerary"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border-2 border-[var(--color-border)] hover:border-secondary-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">
              {name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <CategoryBadge category={displayCategory} />
              {renderRating()}
              {renderPriceRange()}
            </div>
          </div>

          {/* Favorite button */}
          {showActions && (
            <button
              onClick={() => onToggleFavorite?.(recommendation)}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <HeartSolidIcon className="w-6 h-6" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </button>
          )}
        </div>

        {/* Description */}
        <p
          className={`mt-3 text-[var(--color-text-secondary)] text-sm ${
            isExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {description}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {/* Location */}
          {location && (
            <button
              onClick={handleLocationClick}
              className="flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-secondary-600 transition-colors"
            >
              <MapPinIcon className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{location}</span>
            </button>
          )}

          {/* Cost - Smart pricing display */}
          <div className="flex items-center gap-1.5">
            <CurrencyDollarIcon className={`w-4 h-4 ${priceDisplay.isFree ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`} />
            <span className={priceDisplay.isFree ? 'font-medium text-emerald-600' : 'text-[var(--color-text-secondary)]'}>
              {priceDisplay.text}
            </span>
            {priceDisplay.isEstimate && !priceDisplay.isFree && (
              <span className="text-xs text-gray-400 italic" title="Estimated price - may vary">
                (Est.)
              </span>
            )}
          </div>

          {/* Duration */}
          {duration && (
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <ClockIcon className="w-4 h-4" />
              <span>{duration}</span>
            </div>
          )}

          {/* Cuisine (for restaurants) */}
          {cuisine && (
            <div className="text-[var(--color-text-muted)]">
              <span className="font-medium">Cuisine:</span> {cuisine}
            </div>
          )}
        </div>

        {/* Expandable content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
            {/* Best time to visit */}
            {bestTime && (
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Best Time
                </span>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{bestTime}</p>
              </div>
            )}

            {/* Specialty (for restaurants) */}
            {specialty && (
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Specialty
                </span>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{specialty}</p>
              </div>
            )}

            {/* Tips */}
            {tips && (
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Tips
                </span>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{tips}</p>
              </div>
            )}

            {/* AI Reason */}
            {aiReason && (
              <div className="p-3 bg-gradient-to-r from-secondary-50 to-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <SparklesIcon className="w-4 h-4 text-secondary-500" />
                  <span className="text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                    Why We Recommend
                  </span>
                </div>
                <p className="text-sm text-secondary-800">{aiReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mt-3 text-sm text-secondary-600 hover:text-secondary-700 font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" />
              Show more
            </>
          )}
        </button>
      </div>

      {/* Action bar */}
      {showActions && (
        <div className="px-5 py-3 bg-[var(--color-bg-sunken)] border-t border-[var(--color-border)] flex items-center justify-between">
          {/* Feedback buttons */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-text-muted)] mr-2">Helpful?</span>
            <button
              onClick={() => onThumbsUp?.(recommendation)}
              className={`p-2 rounded-lg transition-colors ${
                feedback === 'thumbsUp'
                  ? 'text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10'
              }`}
              title="This was helpful"
            >
              {feedback === 'thumbsUp' ? (
                <ThumbUpSolidIcon className="w-5 h-5" />
              ) : (
                <HandThumbUpIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onThumbsDown?.(recommendation)}
              className={`p-2 rounded-lg transition-colors ${
                feedback === 'thumbsDown'
                  ? 'text-red-600 bg-red-500/10'
                  : 'text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-500/10'
              }`}
              title="Not helpful"
            >
              {feedback === 'thumbsDown' ? (
                <ThumbDownSolidIcon className="w-5 h-5" />
              ) : (
                <HandThumbDownIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Add to itinerary button */}
          <button
            onClick={() => onAddToItinerary?.(recommendation)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded-lg font-medium hover:bg-secondary-700 transition-colors text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add to Itinerary
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
