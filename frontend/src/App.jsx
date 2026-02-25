import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
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
import AIChatAssistant from './components/AIChatAssistant';
import BottomTabBar from './components/ui/BottomTabBar';

// Lazy-loaded page components (route-level code splitting)
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const MyItineraryPage = lazy(() => import('./pages/MyItineraryPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
import { useUserStore } from './store/userStore';
import useItineraryStore from './store/itineraryStore';
import { useFeatureAccess } from './hooks/useFeatureAccess';
import { useTheme } from './hooks/useTheme';
import { useTranslation } from 'react-i18next';
import {
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
  Moon,
  Sun,
} from 'lucide-react';

// Navigation component
const Navigation = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserStore();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const toast = useToast();

  // Close menus on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
  }, [location.pathname]);

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
    <div className="sticky top-0 z-[1100] pt-4 px-4 w-full">
      <nav className="glass max-w-6xl mx-auto rounded-2xl border border-[var(--color-border)] shadow-sm" aria-label="Main navigation">
        <div className="px-4 md:px-6">
          <div className="flex items-center h-16 gap-8 md:gap-32">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)]">
                Serendib<span className="text-[var(--color-brand-primary)]">Trip</span>
              </span>
              <span className="text-xl transform group-hover:rotate-12 transition-transform hidden sm:inline-block">🌴</span>
            </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 flex-1">
            <div className="flex items-center bg-[var(--color-bg-sunken)]/50 p-1 rounded-xl border border-[var(--color-border)]/50">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={location.pathname === link.to ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    location.pathname === link.to
                      ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <link.icon className="w-4 h-4" aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="flex-1" /> {/* Spacer pushes auth section right */}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--color-bg-sunken)] transition-colors focus-visible:outline-none"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--color-brand-primary)] flex items-center justify-center text-white dark:text-gray-900 font-bold">
                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="text-[var(--color-text-primary)] font-semibold hidden lg:block">
                    {user?.fullName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-elevated)] rounded-lg shadow-lg border border-[var(--color-border)] py-1 z-50" role="menu">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)] focus-visible:outline-2 focus-visible:outline-[var(--color-brand-primary)]"
                      role="menuitem"
                    >
                      <User className="w-4 h-4" />
                      {t('nav.profile')}
                    </Link>
                    <hr className="my-1 border-[var(--color-border)]" />
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
                <span className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-xs font-semibold rounded-full border border-secondary-200/50 dark:border-secondary-800/50">
                  <span className="w-1.5 h-1.5 bg-secondary-500 rounded-full animate-pulse"></span>
                  Guest
                </span>
                <Link
                  to="/login"
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-[var(--color-brand-primary-hover)] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  {t('nav.getStarted')}
                </Link>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)]"
            aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
            aria-expanded={showMobileMenu}
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
          <div className="md:hidden pb-4 border-t border-[var(--color-border)] mt-2 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium ${
                  location.pathname === link.to
                    ? 'bg-[var(--color-brand-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]'
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
                  className="flex items-center gap-2 px-4 py-3 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] rounded-lg"
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
                  className="px-4 py-3 text-center text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-bg-sunken)]"
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
    </div>
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
    trips, 
    fetchTrips 
  } = useUserStore();

  // Feature access to check AI recommendation limits
  const { canUseFeature, isGuest } = useFeatureAccess();

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
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Hero Section — Minimalist Premium */}
      <div className="relative overflow-hidden bg-[var(--color-bg-primary)] pt-12 pb-24 md:pt-20 md:pb-32 px-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[var(--color-brand-primary)]/10 to-[var(--color-brand-accent)]/5"></div>
          {/* subtle decorative blur */}
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--color-brand-primary)]/20 blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[var(--color-brand-ocean)]/10 blur-[100px] pointer-events-none"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1.5 bg-[var(--color-bg-secondary)] text-[var(--color-brand-primary-hover)] font-bold text-sm tracking-wide rounded-full mb-6 border border-[var(--color-border)] shadow-sm">
            🌴 {t('home.aiPowered') || 'AI-Powered Travel Planning'}
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-[var(--color-brand-deep)] dark:text-[var(--color-text-primary)] tracking-tight leading-tight mb-6">
            Explore Sri Lanka,<br />
            <span className="text-[var(--color-brand-primary)]">your way.</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Beautifully crafted itineraries personalized to your vibe. Let our AI do the heavy lifting while you focus on the journey.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-brand-primary)] text-white dark:text-gray-900 rounded-2xl font-bold text-lg hover:bg-[var(--color-brand-primary-hover)] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Start Planning
              <Sparkles className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-20 pb-16">
        {/* Trip Planner Form — hovering over hero transition */}
        <div className="max-w-4xl mx-auto px-4 -mt-8 md:-mt-12">
          <div className="card p-2 md:p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/5 bg-[var(--color-bg-secondary)]/95 backdrop-blur-xl border-t-4 border-t-[var(--color-brand-primary)]">
            <TripPlannerForm onSubmit={handleSubmit} existingTrips={trips} localTripsMetadata={tripsMetadata} />
          </div>
        </div>

        {/* ——— Destination Quick-Pick Strip ——— */}
        <div className="mt-16 sm:mt-24 max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-display font-bold text-[var(--color-brand-deep)] dark:text-[var(--color-text-primary)] mb-2">
                Trending Escapes
              </h2>
              <p className="text-[var(--color-text-secondary)]">
                Tap a destination to start planning instantly
              </p>
            </div>
          </div>
          
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4" style={{scrollbarWidth: 'none'}}>
            {[
              { name: 'Colombo', emoji: '🏙️', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-500/20' },
              { name: 'Kandy', emoji: '🛕', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-500/20' },
              { name: 'Galle', emoji: '🏖️', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 ring-cyan-500/20' },
              { name: 'Sigiriya', emoji: '🏰', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ring-orange-500/20' },
              { name: 'Ella', emoji: '🚂', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-green-500/20' },
              { name: 'Nuwara Eliya', emoji: '🍵', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-teal-500/20' },
            ].map((dest) => (
              <button
                key={dest.name}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`flex-shrink-0 group flex items-center gap-3 px-5 py-4 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ring-1 flex-1 min-w-[130px] ${dest.color}`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{dest.emoji}</span>
                <span className="font-bold text-base leading-tight">{dest.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ——— How It Works ——— */}
        <div className="mt-16 sm:mt-24 max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-3xl font-display font-bold text-[var(--color-brand-deep)] dark:text-[var(--color-text-primary)] mb-10 text-center">
            How SerendibTrip Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', icon: '✨', title: 'Tell us your vibe', desc: 'Select your dates, budget, and travel style using our AI planner.' },
              { step: '2', icon: '🗺️', title: 'Get tailored picks', desc: 'Our AI finds the best attractions, stays, and food precisely for you.' },
              { step: '3', icon: '🎒', title: 'Organize your journey', desc: 'Build your itinerary, track budgets, and generate perfect packing lists.' },
            ].map((item) => (
              <div key={item.step} className="card p-8 border-transparent hover:border-[var(--color-brand-primary)]/30 hover:shadow-lg transition-all group bg-[var(--color-bg-sunken)]">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-secondary)] shadow-sm flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform group-hover:rotate-3 border border-[var(--color-border)]">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">{item.title}</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ——— Saved Trips Quick Access ——— */}
        {isAuthenticated && trips.filter(t => t.savedItems?.length > 0).length > 0 && (
          <div className="mt-8 max-w-5xl mx-auto px-4 pb-12">
            <Link
              to="/profile"
              state={{ activeTab: 'trips' }}
              className="block card bg-[var(--color-brand-deep)] text-white hover:bg-[var(--color-brand-deep)]/90 p-6 md:p-8 hover:shadow-xl transition-all group border-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Calendar className="w-8 h-8 text-[var(--color-brand-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{trips.filter(t => t.savedItems?.length > 0).length} Saved Trip{trips.filter(t => t.savedItems?.length > 0).length !== 1 ? 's' : ''}</h3>
                    <p className="text-white/70 font-medium">Continue planning or view itineraries</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[var(--color-brand-primary)] group-hover:text-black transition-colors">
                  <span className="font-bold">→</span>
                </div>
              </div>
            </Link>
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
      {/* Skip to content link — accessible keyboard shortcut */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-brand-primary)] focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to content
      </a>
      {!hideNav && <Navigation />}
      <main id="main-content" className="pb-16 md:pb-0">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-skeleton w-full max-w-2xl mx-4 h-64 rounded-2xl" />
          </div>
        }>
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
        </Suspense>
      </main>
      {/* Mobile Bottom Tab Bar */}
      {!hideNav && <BottomTabBar />}
      {/* AI Chat Assistant - Global floating button */}
      {!hideNav && <AIChatAssistant />}
    </>
  );
}

export default App;
