import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Loader2,
  Mail,
  CloudSun,
  Calendar,
  Send,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
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
  const [isSendingTest, setIsSendingTest] = useState(null);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setIsChangingPassword(false);
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
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Notifications
        </h3>
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {/* Trip Reminders Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-brand-primary)]/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--color-brand-primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Trip Reminders</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Get reminded before your trips</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('tripReminders')}
              disabled={isLoadingSettings || isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.tripReminders
                  ? 'bg-emerald-500'
                  : 'bg-[var(--color-bg-sunken)]'
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
            <div className="p-4 bg-[var(--color-bg-sunken)] border-b border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">Remind me:</p>
              <div className="flex flex-wrap gap-2">
                {reminderDayOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleToggleReminderDay(option.value)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      (notificationSettings.reminderDays || []).includes(option.value)
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weather Alerts Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <CloudSun className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Weather Alerts</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Get weather updates for your trips</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('weatherAlerts')}
              disabled={isLoadingSettings || isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.weatherAlerts
                  ? 'bg-emerald-500'
                  : 'bg-[var(--color-bg-sunken)]'
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
          <div className="p-4 bg-[var(--color-bg-sunken)]">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">Send test email:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => sendTestNotification('reminder')}
                disabled={isSendingTest}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-ocean)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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

      {/* Privacy & Security */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          Privacy & Security
        </h3>
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {/* Change Password */}
          <div className="border-b border-[var(--color-border)]">
            <button
              onClick={() => {
                setShowPasswordForm(!showPasswordForm);
                setPasswordError('');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg-sunken)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[var(--color-text-primary)]">Change Password</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Update your password</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
            </button>

            {/* Password Change Form */}
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="p-4 bg-[var(--color-bg-sunken)] border-t border-[var(--color-border)] space-y-3">
                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent outline-none text-sm"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent outline-none text-sm"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent outline-none text-sm"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-primary)] text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          Account
        </h3>
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
          <button
            onClick={onLogout}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-4 text-red-500 hover:bg-red-500/5 transition-colors rounded-xl disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{user?.email}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-sm text-[var(--color-text-muted)] pt-4">
        <p>SerendibTrip v1.0.0</p>
        <p className="mt-1">Made with ❤️ in Sri Lanka</p>
      </div>
    </div>
  );
};

export default SettingsPanel;
