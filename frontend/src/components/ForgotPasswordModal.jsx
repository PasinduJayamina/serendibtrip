import { useState } from 'react';
import { Mail, Loader2, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';

/**
 * Forgot Password Modal Component
 * Allows users to request a password reset email
 */
const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    // Simulate API call - replace with actual API when backend is ready
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Password reset requested for:', data.email);
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    reset();
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          // Success State
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-500 mb-6">
              If an account exists with that email, we've sent instructions to
              reset your password.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-[#208896] text-white rounded-xl font-medium hover:bg-[#1a6d78] transition-colors"
            >
              Back to login
            </button>
          </div>
        ) : (
          // Form State
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#208896]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[#208896]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Forgot password?
              </h2>
              <p className="text-gray-500 mt-1">
                No worries, we'll send you reset instructions
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#208896] text-white rounded-xl font-medium hover:bg-[#1a6d78] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>

            <button
              onClick={handleClose}
              className="w-full mt-4 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ForgotPasswordModal;
