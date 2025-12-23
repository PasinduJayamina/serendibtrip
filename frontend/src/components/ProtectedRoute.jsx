import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserStore } from '../store/userStore';
import { Loader2 } from 'lucide-react';

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - true if expired
 */
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // JWT payload is the second part (base64 encoded)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;

    if (!exp) return false; // No expiry, assume valid

    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= exp * 1000;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // If we can't parse, assume expired
  }
};

/**
 * Protected Route component
 * Redirects to login if user is not authenticated or token is expired
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, logout } = useUserStore();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem('token');

      if (!isAuthenticated || !token) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        console.log('Token expired, logging out...');
        logout();
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      setIsValid(true);
      setIsValidating(false);
    };

    validateToken();
  }, [isAuthenticated, logout]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#208896] animate-spin" />
          <p className="text-gray-500 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
