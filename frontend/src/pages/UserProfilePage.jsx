import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Settings,
  Heart,
  MapPin,
  Calendar,
  Sliders,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ui/Toast';
import {
  ProfileForm,
  PreferencesSelector,
  FavoritesList,
  SavedTripsList,
  SettingsPanel,
} from '../components/profile';

const UserProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Tab configuration with translation keys
  const TABS = [
    { id: 'profile', labelKey: 'profile.tabs.profile', icon: User },
    { id: 'preferences', labelKey: 'profile.tabs.preferences', icon: Sliders },
    { id: 'favorites', labelKey: 'profile.tabs.favorites', icon: Heart },
    { id: 'trips', labelKey: 'profile.tabs.myTrips', icon: Calendar },
    { id: 'settings', labelKey: 'profile.tabs.settings', icon: Settings },
  ];

  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    favorites,
    favoritesLoading,
    trips,
    tripsLoading,
    fetchProfile,
    updateProfile,
    updatePreferences,
    removeFavorite,
    deleteTrip,
    updateTrip,
    logout,
    clearError,
  } = useUserStore();

  // Check if user has token
  const [hasValidToken, setHasValidToken] = useState(
    !!localStorage.getItem('token')
  );

  // Fetch profile on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      fetchProfile().catch((err) => {
        console.error('Failed to fetch profile:', err);
        // If token is invalid, clear it and show sign-in prompt
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setHasValidToken(false);
          clearError();
        }
      });
    }
  }, [user, fetchProfile, clearError]);

  // Handle profile update
  const handleProfileSave = async (profileData) => {
    try {
      await updateProfile(profileData);
      toast.success(t('profile.messages.profileUpdated'));
    } catch (err) {
      toast.error(err.message || t('profile.messages.updateFailed'));
    }
  };

  // Handle preferences update
  const handlePreferencesSave = async (preferences) => {
    try {
      await updatePreferences(preferences);
      toast.success(t('profile.messages.preferenceSaved'));
    } catch (err) {
      toast.error(err.message || t('profile.messages.preferenceFailed'));
    }
  };

  // Handle favorite removal
  const handleRemoveFavorite = async (attractionId) => {
    try {
      await removeFavorite(attractionId);
      toast.success(t('profile.messages.removedFromFavorites'));
    } catch (err) {
      toast.error(t('profile.messages.failedToRemoveFavorite'));
    }
  };

  // Handle trip deletion
  const handleDeleteTrip = async (tripId) => {
    try {
      await deleteTrip(tripId);
      toast.success(t('profile.messages.tripDeleted'));
    } catch (err) {
      toast.error(t('profile.messages.tripDeleteFailed'));
    }
  };

  // Handle trip status update
  const handleUpdateTripStatus = async (tripId, status) => {
    try {
      await updateTrip(tripId, { status });
      toast.success(`Trip marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update trip');
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    toast.success(t('profile.messages.signedOut'));
    navigate('/');
  };

  // Not authenticated - show sign in prompt
  if (!hasValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[#208896]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-[#208896]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('profile.signInPrompt')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('profile.signInDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-[#208896] text-white rounded-lg hover:bg-[#1a6d78] transition-colors font-medium"
            >
              {t('profile.goToHome')}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            {t('profile.comingSoon')}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#208896] mx-auto" />
          <p className="mt-4 text-gray-600">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {t('profile.unableToLoad')}
          </h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchProfile();
            }}
            className="mt-4 px-4 py-2 bg-[#208896] text-white rounded-lg hover:bg-[#1a6d78] transition-colors"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileForm
            user={user}
            onSave={handleProfileSave}
            isLoading={isLoading}
          />
        );
      case 'preferences':
        return (
          <PreferencesSelector
            preferences={user?.preferences}
            onSave={handlePreferencesSave}
            isLoading={isLoading}
          />
        );
      case 'favorites':
        return (
          <FavoritesList
            favorites={favorites}
            onRemove={handleRemoveFavorite}
            isLoading={favoritesLoading}
          />
        );
      case 'trips':
        return (
          <SavedTripsList
            trips={trips}
            onDelete={handleDeleteTrip}
            onUpdateStatus={handleUpdateTripStatus}
            isLoading={tripsLoading}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            user={user}
            onLogout={handleLogout}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#208896] to-[#1a6d78] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('profile.back')}
          </button>

          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 border-4 border-white/20">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.fullName || 'User'}</h1>
              <p className="text-white/80">{user?.email}</p>
              {user?.bio && (
                <p className="text-sm text-white/60 mt-1 max-w-md truncate">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{trips?.length || 0}</p>
              <p className="text-sm text-white/80">{t('profile.stats.trips')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{favorites?.length || 0}</p>
              <p className="text-sm text-white/80">{t('profile.stats.favorites')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{user?.reviews?.length || 0}</p>
              <p className="text-sm text-white/80">{t('profile.stats.reviews')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#208896] text-[#208896]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
