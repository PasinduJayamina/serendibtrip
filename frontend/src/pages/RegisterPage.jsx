import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ui/Toast';

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register: registerUser, isLoading, error } = useUserStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Password strength indicators
  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ''),
    number: /[0-9]/.test(password || ''),
  };

  const onSubmit = async (data) => {
    try {
      await registerUser(data.email, data.password, data.fullName);
      toast.success(t('auth.accountCreated'));
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.registrationFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-sand-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-secondary-600 to-accent-500 bg-clip-text text-transparent">SerendibTrip</h1>
            <p className="text-gray-500 text-sm mt-1">
              {t('common.tagline')}
            </p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth.createAccountTitle')}</h2>
            <p className="text-gray-500 mt-1">{t('auth.startPlanning')}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  {...register('fullName', {
                    required: t('auth.validation.fullNameRequired'),
                    minLength: {
                      value: 2,
                      message: t('auth.validation.fullNameMinLength'),
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                    errors.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.fullNamePlaceholder')}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', {
                    required: t('auth.validation.emailRequired'),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t('auth.validation.emailInvalid'),
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: t('auth.validation.passwordRequired'),
                    minLength: {
                      value: 8,
                      message: t('auth.validation.passwordMinLength'),
                    },
                    pattern: {
                      value: /^(?=.*[A-Z])(?=.*[0-9])/,
                      message: t('auth.validation.passwordPattern'),
                    },
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.createPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Check
                      className={`w-3 h-3 ${
                        passwordChecks.length
                          ? 'text-green-500'
                          : 'text-gray-300'
                      }`}
                    />
                    <span
                      className={
                        passwordChecks.length
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }
                    >
                      {t('auth.passwordRequirements.minLength')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check
                      className={`w-3 h-3 ${
                        passwordChecks.uppercase
                          ? 'text-green-500'
                          : 'text-gray-300'
                      }`}
                    />
                    <span
                      className={
                        passwordChecks.uppercase
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }
                    >
                      {t('auth.passwordRequirements.uppercase')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check
                      className={`w-3 h-3 ${
                        passwordChecks.number
                          ? 'text-green-500'
                          : 'text-gray-300'
                      }`}
                    />
                    <span
                      className={
                        passwordChecks.number
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }
                    >
                      {t('auth.passwordRequirements.number')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: t('auth.validation.confirmPasswordRequired'),
                    validate: (value) =>
                      value === password || t('auth.validation.passwordsDoNotMatch'),
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                    errors.confirmPassword
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl font-medium hover:from-secondary-600 hover:to-secondary-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('auth.creatingAccount')}
                </>
              ) : (
                <>
                  {t('auth.createAccount')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t('auth.or')}</span>
            </div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-gray-600">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              className="text-secondary-600 font-medium hover:text-secondary-700 hover:underline"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {t('auth.registerTermsAgreement')}
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
