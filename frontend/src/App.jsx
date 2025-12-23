import { useMemo, useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ToastProvider, useToast } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import TripPlannerForm from './components/TripPlannerForm';
import WeatherWidget from './components/WeatherWidget';
import AttractionMap from './components/AttractionMap';
import ItineraryPage from './pages/ItineraryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import MyItineraryPage from './pages/MyItineraryPage';
import UserProfilePage from './pages/UserProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { sampleAttractions } from './data/attractions';
import useTripStore from './store/tripStore';
import { useUserStore } from './store/userStore';
import LanguageSwitcher from './components/LanguageSwitcher';
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
  Sparkles,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

// Navigation component
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/');
    setShowUserMenu(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/recommendations', label: 'AI Picks', icon: Sparkles },
    { to: '/itinerary', label: 'My Itinerary', icon: RouteIcon },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#208896]">
              SerendibTrip
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-[#208896] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#208896] rounded-full flex items-center justify-center text-white font-medium">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-gray-700 font-medium hidden lg:block">
                    {user?.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#208896] text-white rounded-lg font-medium hover:bg-[#1a6d78] transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {showMobileMenu ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium ${
                  location.pathname === link.to
                    ? 'bg-[#208896] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <User className="w-5 h-5" />
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2 px-2">
                <Link
                  to="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="px-4 py-3 text-center text-gray-600 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setShowMobileMenu(false)}
                  className="px-4 py-3 text-center bg-[#208896] text-white rounded-lg font-medium hover:bg-[#1a6d78]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
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
  const navigate = useNavigate();
  const toast = useToast();
  const addTrip = useTripStore((state) => state.addTrip);
  const deleteTrip = useTripStore((state) => state.deleteTrip);
  const trips = useTripStore((state) => state.trips);
  const { isAuthenticated, saveTrip } = useUserStore();

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
    // Save to local Zustand store
    const tripId = addTrip(formData);
    console.log('Trip saved with ID:', tripId);

    // If authenticated, also save to user's profile
    if (isAuthenticated) {
      try {
        await saveTrip({
          destination: formData.destination,
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: formData.budget,
          groupSize: formData.groupSize,
          itinerary: { interests: formData.interests },
        });
        toast.success('Trip saved to your profile!');
      } catch (error) {
        console.error('Failed to save trip to profile:', error);
      }
    }

    // Navigate to AI recommendations
    navigate('/recommendations', { state: { tripData: formData } });
  };

  const handleDelete = (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      deleteTrip(tripId);
      toast.success('Trip deleted');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fafb] to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#208896] to-[#1a6d78] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Sri Lanka
          </h1>
          <p className="text-lg text-white/80 mb-6 max-w-2xl mx-auto">
            Plan your perfect trip with AI-powered recommendations, real-time
            weather, and personalized itineraries
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#208896] rounded-lg font-medium hover:bg-gray-100 transition-all shadow-lg"
            >
              Start Planning Free
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Trip Planner Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 -mt-8 relative z-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Plan Your Trip
          </h2>
          <p className="text-gray-500 mb-6">
            Fill in the details to get personalized recommendations
          </p>
          <TripPlannerForm onSubmit={handleSubmit} />
        </div>

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

                      {/* Continue Planning Button */}
                      <button
                        onClick={() =>
                          navigate('/recommendations', {
                            state: { tripData: trip },
                          })
                        }
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#208896] text-white rounded-lg text-sm font-medium hover:bg-[#1a6d78] transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Get AI Recommendations
                      </button>
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
        {process.env.NODE_ENV === 'development' && false && (
          <div className="mt-8 p-4 bg-gray-800 rounded-xl text-white">
            <h3 className="text-lg font-bold mb-2">
              🔧 Store Debug (check console too)
            </h3>
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify({ tripCount: trips.length }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App with Router
function App() {
  const { fetchProfile } = useUserStore();

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile().catch(() => {
        // Token invalid, will be handled by profile page
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

// App content (needs to be inside Router for useNavigate in Navigation)
function AppContent() {
  const location = useLocation();
  const hideNav = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {!hideNav && <Navigation />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/itinerary" element={<MyItineraryPage />} />
        <Route path="/sample-itinerary" element={<ItineraryPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
