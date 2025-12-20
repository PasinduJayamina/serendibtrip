import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Register a new user
 */
export const register = async ({ email, password, fullName }) => {
  const response = await api.post('/auth/register', {
    email,
    password,
    fullName,
  });
  // Backend returns { success, message, data: { user, accessToken, refreshToken } }
  return response.data;
};

/**
 * Login user
 */
export const login = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password });
  // Backend returns { success, message, data: { user, accessToken, refreshToken } }
  return response.data;
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const response = await api.post('/auth/refresh-token', { refreshToken });
  return response.data;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Store tokens in localStorage
 */
export const storeTokens = (accessToken, refreshToken) => {
  localStorage.setItem('token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

/**
 * Clear tokens from localStorage
 */
export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export default api;
