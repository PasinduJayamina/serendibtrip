import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - could trigger logout here
      console.error('Authentication error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// ============ PROFILE ============

/**
 * Get current user's profile
 */
export const getProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (preferences) => {
  const response = await api.put('/users/preferences', preferences);
  return response.data;
};

// ============ FAVORITES ============

/**
 * Get user's favorite attractions
 */
export const getFavorites = async () => {
  const response = await api.get('/users/favorites');
  return response.data;
};

/**
 * Add attraction to favorites
 */
export const addFavorite = async (attractionId, attractionData) => {
  const response = await api.post(
    `/users/favorites/${attractionId}`,
    attractionData
  );
  return response.data;
};

/**
 * Remove attraction from favorites
 */
export const removeFavorite = async (attractionId) => {
  const response = await api.delete(`/users/favorites/${attractionId}`);
  return response.data;
};

// ============ TRIPS ============

/**
 * Get user's saved trips
 */
export const getTrips = async () => {
  const response = await api.get('/users/trips');
  return response.data;
};

/**
 * Save a new trip
 */
export const saveTrip = async (tripData) => {
  const response = await api.post('/users/trips', tripData);
  return response.data;
};

/**
 * Update a trip
 */
export const updateTrip = async (tripId, tripData) => {
  const response = await api.put(`/users/trips/${tripId}`, tripData);
  return response.data;
};

/**
 * Delete a trip
 */
export const deleteTrip = async (tripId) => {
  const response = await api.delete(`/users/trips/${tripId}`);
  return response.data;
};

/**
 * Update just the savedItems for a specific trip
 * Used to sync itinerary items to backend
 */
export const updateTripSavedItems = async (tripId, savedItems) => {
  const response = await api.put(`/users/trips/${tripId}`, { savedItems });
  return response.data;
};

// ============ REVIEWS ============

/**
 * Get user's reviews
 */
export const getReviews = async () => {
  const response = await api.get('/users/reviews');
  return response.data;
};

/**
 * Add a new review
 */
export const addReview = async (reviewData) => {
  const response = await api.post('/users/reviews', reviewData);
  return response.data;
};

// ============ IMAGE UPLOAD ============

/**
 * Upload profile picture (using base64 or external URL)
 * For production, consider using cloud storage like Cloudinary or AWS S3
 */
export const uploadProfilePicture = async (imageFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result); // Returns base64 string
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};

export default api;
