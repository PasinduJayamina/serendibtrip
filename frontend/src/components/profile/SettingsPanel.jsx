import {
  Bell,
  Shield,
  Globe,
  Moon,
  LogOut,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const SettingsPanel = ({ user, onLogout, isLoading }) => {
  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Receive trip updates and recommendations',
          type: 'toggle',
          value: true,
        },
        {
          icon: Bell,
          label: 'Email Notifications',
          description: 'Get travel deals and tips via email',
          type: 'toggle',
          value: false,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          description: 'Use dark theme',
          type: 'toggle',
          value: false,
        },
        {
          icon: Globe,
          label: 'Language',
          description: user?.preferences?.language || 'English',
          type: 'link',
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: Shield,
          label: 'Change Password',
          description: 'Update your password',
          type: 'link',
        },
        {
          icon: Shield,
          label: 'Two-Factor Authentication',
          description: 'Add extra security to your account',
          type: 'link',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {settingsGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            {group.title}
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                {item.type === 'toggle' ? (
                  <button
                    className={`w-12 h-6 rounded-full transition-colors ${
                      item.value ? 'bg-[#208896]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        item.value ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Account Actions */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Account
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={onLogout}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-4 text-red-600 hover:bg-red-50 transition-colors rounded-lg disabled:opacity-50"
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
