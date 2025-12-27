import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Reset Password Page
 * Allows users to set a new password using the reset token from email
 */
const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('form'); // 'form', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Password strength checks
  const passwordChecks = {
    length: password?.length >= 8,
    uppercase: /[A-Z]/.test(password || ''),
    number: /[0-9]/.test(password || ''),
  };

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  // Validate token exists
  useEffect(() => {
    if (!token || token.length !== 64) {
      setStatus('error');
      setErrorMessage(t('resetPassword.invalidToken'));
    }
  }, [token, t]);

  const onSubmit = async (data) => {
    if (!allChecksPassed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.message || t('resetPassword.error'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setStatus('error');
      setErrorMessage(t('resetPassword.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-500/10 via-white to-secondary-500/5 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('resetPassword.successTitle')}
          </h1>
          <p className="text-gray-500 mb-6">
            {t('resetPassword.successMessage')}
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors"
          >
            {t('resetPassword.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (status === 'error' && !errorMessage.includes('network')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-500/10 via-white to-secondary-500/5 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('resetPassword.errorTitle')}
          </h1>
          <p className="text-gray-500 mb-6">
            {errorMessage || t('resetPassword.tokenExpired')}
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors mb-3"
          >
            {t('resetPassword.goToLogin')}
          </Link>
          <p className="text-sm text-gray-400">
            {t('resetPassword.tryAgain')}
          </p>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-500/10 via-white to-secondary-500/5 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-secondary-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('resetPassword.title')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('resetPassword.subtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('resetPassword.newPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: t('resetPassword.passwordRequired'),
                })}
                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('resetPassword.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {password && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-2">
                {t('resetPassword.requirements')}
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <RequirementCheck
                  met={passwordChecks.length}
                  text={t('auth.passwordRequirements.minLength')}
                />
                <RequirementCheck
                  met={passwordChecks.uppercase}
                  text={t('auth.passwordRequirements.uppercase')}
                />
                <RequirementCheck
                  met={passwordChecks.number}
                  text={t('auth.passwordRequirements.number')}
                />
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('resetPassword.confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: t('resetPassword.confirmRequired'),
                  validate: (value) =>
                    value === password || t('resetPassword.passwordMismatch'),
                })}
                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('resetPassword.confirmPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !allChecksPassed}
            className="w-full py-3 bg-secondary-500 text-white rounded-xl font-medium hover:bg-secondary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('resetPassword.resetting')}
              </>
            ) : (
              t('resetPassword.resetButton')
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-secondary-500 hover:underline font-medium"
          >
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

// Password requirement check component
const RequirementCheck = ({ met, text }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center ${
        met ? 'bg-green-100' : 'bg-gray-200'
      }`}
    >
      {met && <CheckCircle className="w-3 h-3 text-green-600" />}
    </div>
    <span className={`text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {text}
    </span>
  </div>
);

export default ResetPasswordPage;
