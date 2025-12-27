import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Shield,
  Globe,
  Moon,
  LogOut,
  ChevronRight,
  Loader2,
  Mail,
  CloudSun,
  Calendar,
  Send,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SettingsPanel = ({ user, onLogout, isLoading }) => {
  const { t } = useTranslation();
  const toast = useToast();
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    tripReminders: true,
    weatherAlerts: true,
    reminderDays: [7, 3, 1],
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(null); // 'reminder' | 'weather' | null

  // Fetch notification settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotificationSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  // Save notification settings
  const saveSettings = async (newSettings) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationSettings(data.settings);
          toast.success(t('settings.notificationsSaved') || 'Notification settings saved!');
        }
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('settings.saveFailed') || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle a setting
  const handleToggle = (key) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(newSettings);
    saveSettings(newSettings);
  };

  // Toggle reminder day
  const handleToggleReminderDay = (day) => {
    const currentDays = notificationSettings.reminderDays || [];
    let newDays;
    if (currentDays.includes(day)) {
      newDays = currentDays.filter((d) => d !== day);
    } else {
      newDays = [...currentDays, day].sort((a, b) => b - a);
    }
    const newSettings = { ...notificationSettings, reminderDays: newDays };
    setNotificationSettings(newSettings);
    saveSettings(newSettings);
  };

  // Send test notification
  const sendTestNotification = async (type) => {
    setIsSendingTest(type);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/notifications/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || `Test ${type} email sent!`);
      } else {
        throw new Error(data.error || 'Failed to send');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(null);
    }
  };

  const reminderDayOptions = [
    { value: 7, label: '7 days before' },
    { value: 3, label: '3 days before' },
    { value: 1, label: '1 day before' },
  ];

  return (
    <div className="space-y-6">
      {/* Email Notifications Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Notifications
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Trip Reminders Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-secondary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Trip Reminders</p>
                <p className="text-sm text-gray-500">Get reminded before your trips</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('tripReminders')}
              disabled={isLoadingSettings || isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.tripReminders
                  ? 'bg-secondary-500'
                  : 'bg-gray-300'
              } ${isLoadingSettings ? 'opacity-50' : ''}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  notificationSettings.tripReminders
                    ? 'translate-x-6'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Reminder Days (only show if reminders enabled) */}
          {notificationSettings.tripReminders && (
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Remind me:</p>
              <div className="flex flex-wrap gap-2">
                {reminderDayOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleToggleReminderDay(option.value)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      (notificationSettings.reminderDays || []).includes(option.value)
                        ? 'bg-secondary-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weather Alerts Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <CloudSun className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Weather Alerts</p>
                <p className="text-sm text-gray-500">Get weather updates for your trips</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('weatherAlerts')}
              disabled={isLoadingSettings || isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.weatherAlerts
                  ? 'bg-secondary-500'
                  : 'bg-gray-300'
              } ${isLoadingSettings ? 'opacity-50' : ''}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  notificationSettings.weatherAlerts
                    ? 'translate-x-6'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Test Email Section */}
          <div className="p-4 bg-gradient-to-r from-sand-50 to-primary-50">
            <p className="text-sm text-gray-600 mb-3">Send test email:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => sendTestNotification('reminder')}
                disabled={isSendingTest}
                className="flex items-center gap-2 px-4 py-2 bg-secondary-500 text-white rounded-lg text-sm font-medium hover:bg-secondary-600 transition-colors disabled:opacity-50"
              >
                {isSendingTest === 'reminder' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Trip Reminder
              </button>
              <button
                onClick={() => sendTestNotification('weather')}
                disabled={isSendingTest}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
              >
                {isSendingTest === 'weather' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudSun className="w-4 h-4" />
                )}
                Weather Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Appearance
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Moon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Dark Mode</p>
                <p className="text-sm text-gray-500">Use dark theme</p>
              </div>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-gray-300 transition-colors">
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Language</p>
                <p className="text-sm text-gray-500">
                  {user?.preferences?.language || 'English'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Privacy & Security */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Privacy & Security
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your password</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Account
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl">
          <button
            onClick={onLogout}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50 transition-colors rounded-xl disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-sm text-gray-400 pt-4">
        <p>SerendibTrip v1.0.0</p>
        <p className="mt-1">Made with ❤️ in Sri Lanka</p>
      </div>
    </div>
  );
};

export default SettingsPanel;
