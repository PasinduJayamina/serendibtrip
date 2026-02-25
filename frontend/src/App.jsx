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
import ResetPasswordPage from './pages/ResetPasswordPage';
import AIChatAssistant from './components/AIChatAssistant';
import { sampleAttractions } from './data/attractions';
import { useUserStore } from './store/userStore';
import useItineraryStore from './store/itineraryStore';
import { useFeatureAccess } from './hooks/useFeatureAccess';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  CloudSun,
  Map,
  Route as RouteIcon,
  Home,
  Calendar,
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
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.success(t('nav.signOut'));
    navigate('/');
    setShowUserMenu(false);
  };

  const navLinks = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/recommendations', label: t('nav.aiPicks'), icon: Sparkles },
    { to: '/itinerary', label: t('nav.myItinerary'), icon: RouteIcon },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-[1100]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-secondary-600 to-accent-500 bg-clip-text text-transparent">
              {t('common.appName')}
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
                    ? 'bg-secondary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-secondary-50 hover:text-secondary-700'
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
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
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
                      {t('nav.profile')}
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                {/* Guest Mode Badge */}
                <span className="hidden lg:flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  Guest
                </span>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-lg font-medium hover:from-secondary-600 hover:to-secondary-700 transition-all shadow-sm"
                >
                  {t('nav.getStarted')}
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
                    ? 'bg-secondary-500 text-white'
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
                  className="px-4 py-3 text-center bg-secondary-500 text-white rounded-lg font-medium hover:bg-secondary-600"
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Use userStore as single source of truth for trips
  const { 
    isAuthenticated, 
    saveTrip, 
    trips, 
    fetchTrips 
  } = useUserStore();

  // Feature access to check AI recommendation limits
  const { canUseFeature, isGuest } = useFeatureAccess();

  // State for selected destination weather
  const [selectedDestination, setSelectedDestination] = useState('colombo');

  // Get local trips metadata for date overlap checking
  const { tripsMetadata } = useItineraryStore();

  // Fetch trips when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrips().catch(console.error);
    }
  }, [isAuthenticated, fetchTrips]);

  const handleSubmit = async (formData) => {
    // Check AI recommendation limit BEFORE saving trip
    const aiAccess = canUseFeature('aiRecommendations');
    
    if (!aiAccess.allowed) {
      // Limit reached - don't save trip, show error
      if (isGuest) {
        toast.error('Sign in to get more AI recommendations!');
      } else {
        toast.error('Daily AI recommendation limit reached. Try again tomorrow!');
      }
      // Still navigate to show the limit message
      navigate('/recommendations', { state: { tripData: formData } });
      return;
    }

    // NOTE: Trip is now saved to backend when items are added via itinerary sync
    // This ensures trips only appear in Profile after user adds items
    // (Previously: saveTrip was called here, creating empty trips prematurely)

    // Navigate to AI recommendations
    navigate('/recommendations', { state: { tripData: formData } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary-600 via-secondary-500 to-accent-500 text-white py-16 px-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-20 w-24 h-24 border-4 border-white rounded-full"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/20 rounded-full"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
            🌴 {t('home.aiPowered') || 'AI-Powered Travel Planning'}
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {t('home.heroTitle')}
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {t('home.heroSubtitle')}
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {t('home.startPlanningFree')}
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Trip Planner Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 -mt-8 relative z-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {t('home.planYourTrip')}
          </h2>
          <p className="text-gray-500 mb-6">
            {t('home.fillDetails')}
          </p>
          <TripPlannerForm onSubmit={handleSubmit} existingTrips={trips} localTripsMetadata={tripsMetadata} />
        </div>

        {/* Weather Widget Section */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CloudSun className="w-6 h-6 text-secondary-500" />
              {t('home.destinationWeather')}
            </h2>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none"
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
            <Map className="w-6 h-6 text-secondary-500" />
            {t('home.exploreAttractions')}
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

        {/* Saved Trips Quick Access - Links to Profile for management */}
        {/* Only show trips that have saved items (not empty/premature trips) */}
        {isAuthenticated && trips.filter(t => t.savedItems?.length > 0).length > 0 && (
          <div className="mt-12">
            <Link
              to="/profile"
              state={{ activeTab: 'trips' }}
              className="block bg-gradient-to-r from-secondary-500 to-accent-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{trips.filter(t => t.savedItems?.length > 0).length} Saved Trip{trips.filter(t => t.savedItems?.length > 0).length !== 1 ? 's' : ''}</h3>
                    <p className="text-white/80 text-sm">View and manage in your profile</p>
                  </div>
                </div>
                <div className="text-white/80 group-hover:text-white transition-colors">
                  <span className="text-sm font-medium">Manage Trips →</span>
                </div>
              </div>
            </Link>
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
  const hideNav = ['/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/reset-password');

  return (
    <>
      {!hideNav && <Navigation />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
      {/* AI Chat Assistant - Global floating button */}
      {!hideNav && <AIChatAssistant />}
    </>
  );
}

export default App;
