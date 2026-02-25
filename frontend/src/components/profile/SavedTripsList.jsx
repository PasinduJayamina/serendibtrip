import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Wallet,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Plane,
} from 'lucide-react';

const STATUS_CONFIG = {
  planned: {
    label: 'Planned',
    icon: Calendar,
    color: 'text-blue-500 bg-blue-500/10 border border-blue-500/20',
  },
  ongoing: {
    label: 'Ongoing',
    icon: Plane,
    color: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-[var(--color-text-muted)] bg-[var(--color-bg-sunken)] border border-[var(--color-border)]',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-500 bg-red-500/10 border border-red-500/20',
  },
};

const SavedTripsList = ({
  trips,
  onDelete,
  onView,
  onUpdateStatus,
  isLoading,
}) => {
  // Track which trip is being confirmed for deletion
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-[var(--color-bg-sunken)] rounded-lg h-32" />
        ))}
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-[var(--color-text-muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          No saved trips
        </h3>
        <p className="text-[var(--color-text-secondary)]">Plan your first trip and save it here!</p>
      </div>
    );
  }

  // Filter to only show trips that have at least one saved item
  // This ensures trips only appear after user adds items via "Add to Itinerary"
  const tripsWithItems = trips.filter(trip => 
    trip.savedItems && trip.savedItems.length > 0
  );
  
  if (tripsWithItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-[var(--color-text-muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          No saved trips
        </h3>
        <p className="text-[var(--color-text-secondary)]">Add items to your itinerary to see trips here!</p>
      </div>
    );
  }

  // Sort trips by date (soonest first)
  const sortedTrips = [...tripsWithItems].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
          {tripsWithItems.length} saved trip{tripsWithItems.length !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="space-y-4">
        {sortedTrips.map((trip) => {
          const statusConfig =
            STATUS_CONFIG[trip.status] || STATUS_CONFIG.planned;
          const StatusIcon = statusConfig.icon;
          const startDate = new Date(trip.startDate);
          const endDate = new Date(trip.endDate);
          const duration = Math.ceil(
            (endDate - startDate) / (1000 * 60 * 60 * 24)
          );

          return (
            <div
              key={trip.tripId}
              className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    {trip.destination}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(startDate, 'MMM d')} -{' '}
                    {format(endDate, 'MMM d, yyyy')}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </div>

              {/* Trip Details */}
              <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)] mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {duration} day{duration !== 1 ? 's' : ''}
                </span>
                {trip.groupSize && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {trip.groupSize} traveler{trip.groupSize !== 1 ? 's' : ''}
                  </span>
                )}
                {trip.budget && (
                  <span className="flex items-center gap-1">
                    <Wallet className="w-4 h-4" />
                    LKR {trip.budget.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                {onView && (
                  <button
                    onClick={() => onView(trip)}
                    className="flex-1 px-3 py-2 text-sm text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                )}

                {trip.status === 'planned' && onUpdateStatus && (
                  <button
                    onClick={() => onUpdateStatus(trip.tripId, 'ongoing')}
                    className="flex-1 px-3 py-2 text-sm text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plane className="w-4 h-4" />
                    Start Trip
                  </button>
                )}

                {trip.status === 'ongoing' && onUpdateStatus && (
                  <button
                    onClick={() => onUpdateStatus(trip.tripId, 'completed')}
                    className="flex-1 px-3 py-2 text-sm text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                )}

                {onDelete && (
                  confirmingDeleteId === trip.tripId ? (
                    // Show confirmation buttons
                    <div className="flex items-center gap-1 bg-red-500/10 rounded-lg p-1">
                      <button
                        onClick={() => {
                          onDelete(trip.tripId);
                          setConfirmingDeleteId(null);
                        }}
                        className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // Show trash icon
                    <button
                      onClick={() => setConfirmingDeleteId(trip.tripId)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SavedTripsList;
