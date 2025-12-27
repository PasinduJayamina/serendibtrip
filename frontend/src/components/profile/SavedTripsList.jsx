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
    color: 'text-blue-600 bg-blue-50',
  },
  ongoing: {
    label: 'Ongoing',
    icon: Plane,
    color: 'text-green-600 bg-green-50',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-gray-600 bg-gray-100',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
  },
};

const SavedTripsList = ({
  trips,
  onDelete,
  onView,
  onUpdateStatus,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32" />
        ))}
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No saved trips
        </h3>
        <p className="text-gray-500">Plan your first trip and save it here!</p>
      </div>
    );
  }

  // Sort trips by date (most recent first)
  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">
          {trips.length} saved trip{trips.length !== 1 ? 's' : ''}
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
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-secondary-500" />
                    {trip.destination}
                  </h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
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
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
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
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {onView && (
                  <button
                    onClick={() => onView(trip)}
                    className="flex-1 px-3 py-2 text-sm text-secondary-500 hover:bg-secondary-500/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                )}

                {trip.status === 'planned' && onUpdateStatus && (
                  <button
                    onClick={() => onUpdateStatus(trip.tripId, 'ongoing')}
                    className="flex-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plane className="w-4 h-4" />
                    Start Trip
                  </button>
                )}

                {trip.status === 'ongoing' && onUpdateStatus && (
                  <button
                    onClick={() => onUpdateStatus(trip.tripId, 'completed')}
                    className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Are you sure you want to delete this trip?'
                        )
                      ) {
                        onDelete(trip.tripId);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
