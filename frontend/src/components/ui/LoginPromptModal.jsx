import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Lock, Sparkles, LogIn } from 'lucide-react';

/**
 * Login Prompt Modal
 * Displayed when guest users try to access restricted features
 */
const LoginPromptModal = ({ 
  isOpen, 
  onClose, 
  featureName,
  featureIcon: FeatureIcon = Sparkles,
  reason 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-secondary-500 to-accent-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sign In Required</h3>
              <p className="text-white/80 text-sm">Unlock this feature</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-secondary-100 rounded-xl">
              <FeatureIcon className="w-8 h-8 text-secondary-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{featureName}</h4>
              <p className="text-gray-600 text-sm">{reason}</p>
            </div>
          </div>

          {/* Benefits list */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Create a free account to:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Use AI-powered recommendations
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Save and manage your trips
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Get personalized packing lists
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                Receive weather alerts
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleLogin}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
            <button
              onClick={handleRegister}
              className="flex-1 px-4 py-3 border-2 border-secondary-500 text-secondary-600 rounded-xl font-medium hover:bg-secondary-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
