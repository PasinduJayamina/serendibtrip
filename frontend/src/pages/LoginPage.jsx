import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ui/Toast';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login, isLoading, error } = useUserStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Get redirect path from location state or default to home
  const from = location.state?.from?.pathname || location.state?.from || '/';
  const redirectMessage = location.state?.message;

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success(t('auth.welcomeBack'));
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.loginFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-sunken)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-ocean)] bg-clip-text text-transparent">
              {t('common.appName')}
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {t('common.tagline')}
            </p>
          </Link>
        </div>

        {/* Card */}
        <div className="card p-8 border border-[var(--color-border)] shadow-xl bg-[var(--color-bg-primary)]">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('auth.welcomeBack')}</h2>
            <p className="text-[var(--color-text-muted)] mt-1">
              {t('auth.signInToContinue')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {t('auth.loginFailed')}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                {t('auth.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  {...register('email', {
                    required: t('auth.emailAddress'),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t('auth.emailAddress'),
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent outline-none transition-all ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[var(--color-border)]'
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
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: t('auth.password'),
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent outline-none transition-all ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : 'border-[var(--color-border)]'
                  }`}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-ocean)] hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[var(--color-brand-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-brand-ocean)] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                <>
                  {t('auth.signIn')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-[var(--color-text-secondary)]">
            {t('auth.noAccount')}{' '}
            <Link
              to="/register"
              className="text-[var(--color-brand-primary)] font-medium hover:text-[var(--color-brand-ocean)] hover:underline"
            >
              {t('auth.createAccount')}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          {t('auth.termsAgreement')}
        </p>
    </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default LoginPage;

