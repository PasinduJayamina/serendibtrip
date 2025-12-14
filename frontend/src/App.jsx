import { useMemo } from 'react';
import { ToastProvider } from './components/ui/Toast';
import TripPlannerForm from './components/TripPlannerForm';
import useTripStore from './store/tripStore';
import { format } from 'date-fns';
import { Trash2, MapPin, Calendar, Users, Wallet } from 'lucide-react';

function App() {
  const addTrip = useTripStore((state) => state.addTrip);
  const deleteTrip = useTripStore((state) => state.deleteTrip);
  const trips = useTripStore((state) => state.trips);
  const currentTrip = useTripStore((state) => state.currentTrip);

  // Sort trips in component with useMemo to avoid infinite loop
  const sortedTrips = useMemo(() => {
    return [...trips].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [trips]);

  const handleSubmit = async (formData) => {
    // Save to Zustand store
    const tripId = addTrip(formData);
    console.log('Trip saved with ID:', tripId);
    console.log('Form Data:', formData);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const handleDelete = (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      deleteTrip(tripId);
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#208896]">SerendibTrip</h1>
            <p className="text-gray-600 mt-2">Your Sri Lanka Travel Planner</p>
          </div>

          <TripPlannerForm onSubmit={handleSubmit} />

          {/* Saved Trips Section */}
          {sortedTrips.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Saved Trips ({sortedTrips.length})
              </h2>
              <div className="grid gap-4">
                {sortedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-5 h-5 text-[#208896]" />
                          <h3 className="text-xl font-semibold text-gray-800">
                            {trip.destination}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              trip.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {trip.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {format(new Date(trip.startDate), 'MMM d')} -{' '}
                              {format(new Date(trip.endDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>
                              {trip.groupSize}{' '}
                              {trip.groupSize === 1 ? 'person' : 'people'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-gray-400" />
                            <span>LKR {trip.budget.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#208896] font-medium">
                              {trip.tripDuration} days
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {trip.interests.map((interest) => (
                            <span
                              key={interest}
                              className="px-2 py-1 bg-[#208896]/10 text-[#208896] rounded-full text-xs"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete trip"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug: Show store state */}
          <div className="mt-8 p-4 bg-gray-800 rounded-xl text-white">
            <h3 className="text-lg font-bold mb-2">
              🔧 Store Debug (check console too)
            </h3>
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify(
                { tripCount: trips.length, currentTrip: currentTrip?.id },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
