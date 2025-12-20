import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#208896]/5 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#208896]">SerendibTrip</h1>
            <p className="text-gray-500 text-sm mt-1">
              Your Sri Lanka Travel Planner
            </p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
            <p className="text-gray-500 mt-1">Start planning your dream trip</p>
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
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  {...register('fullName', {
                    required: 'Full name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#208896] focus:border-transparent outline-none transition-all ${
                    errors.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
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
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email',
                    },
                  })}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#208896] focus:border-transparent outline-none transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="you@example.com"
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
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[A-Z])(?=.*[0-9])/,
                      message:
                        'Password must contain uppercase letter and number',
                    },
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#208896] focus:border-transparent outline-none transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Create a password"
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
                      At least 8 characters
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
                      One uppercase letter
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
                      One number
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#208896] focus:border-transparent outline-none transition-all ${
                    errors.confirmPassword
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
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
              className="w-full py-3 bg-[#208896] text-white rounded-xl font-medium hover:bg-[#1a6d78] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
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
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#208896] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
