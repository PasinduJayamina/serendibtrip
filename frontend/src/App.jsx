import { useMemo, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import { ToastProvider, useToast } from './components/ui/Toast';
import TripPlannerForm from './components/TripPlannerForm';
import WeatherWidget from './components/WeatherWidget';
import AttractionMap from './components/AttractionMap';
import ItineraryPage from './pages/ItineraryPage';
import { sampleAttractions } from './data/attractions';
import useTripStore from './store/tripStore';
import { format } from 'date-fns';
import {
  Trash2,
  MapPin,
  Calendar,
  Users,
  Wallet,
  CloudSun,
  Map,
  Route as RouteIcon,
  Home,
} from 'lucide-react';

// Navigation component
const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#208896]">
              SerendibTrip
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-[#208896] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              to="/itinerary"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/itinerary'
                  ? 'bg-[#208896] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <RouteIcon className="w-4 h-4" />
              <span className="hidden sm:inline">My Itinerary</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Destination coordinates for Sri Lanka
const DESTINATION_COORDS = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  galle: { lat: 6.0535, lng: 80.221 },
  mirissa: { lat: 5.9483, lng: 80.4716 },
  'nuwara eliya': { lat: 6.9497, lng: 80.7891 },
  sigiriya: { lat: 7.957, lng: 80.7603 },
  anuradhapura: { lat: 8.3114, lng: 80.4037 },
  trincomalee: { lat: 8.5874, lng: 81.2152 },
  ella: { lat: 6.8667, lng: 81.0466 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
};

// Home Page Component
function HomePage() {
  const addTrip = useTripStore((state) => state.addTrip);
  const deleteTrip = useTripStore((state) => state.deleteTrip);
  const trips = useTripStore((state) => state.trips);
  const currentTrip = useTripStore((state) => state.currentTrip);

  // State for selected destination weather
  const [selectedDestination, setSelectedDestination] = useState('colombo');

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
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#208896]">SerendibTrip</h1>
          <p className="text-gray-600 mt-2">Your Sri Lanka Travel Planner</p>
          <Link
            to="/itinerary"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-medium hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md"
          >
            <RouteIcon className="w-5 h-5" />
            View Sample AI Itinerary
          </Link>
        </div>

        <TripPlannerForm onSubmit={handleSubmit} />

        {/* Weather Widget Section */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CloudSun className="w-6 h-6 text-[#208896]" />
              Destination Weather
            </h2>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208896] focus:border-transparent outline-none"
            >
              {Object.keys(DESTINATION_COORDS).map((dest) => (
                <option key={dest} value={dest}>
                  {dest.charAt(0).toUpperCase() + dest.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <WeatherWidget
            latitude={DESTINATION_COORDS[selectedDestination].lat}
            longitude={DESTINATION_COORDS[selectedDestination].lng}
            destinationName={
              selectedDestination.charAt(0).toUpperCase() +
              selectedDestination.slice(1)
            }
          />
        </div>

        {/* Attractions Map Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Map className="w-6 h-6 text-[#208896]" />
            Explore Attractions
          </h2>
          <AttractionMap
            attractions={sampleAttractions}
            onSelectAttraction={(attraction) => {
              console.log('Selected attraction:', attraction);
            }}
            onAddToItinerary={(attraction) => {
              console.log('Added to itinerary:', attraction);
            }}
          />
        </div>

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
  );
}

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
