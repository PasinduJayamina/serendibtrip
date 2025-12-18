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

/**
 * Generate AI-powered travel itinerary
 */
export const generateItinerary = async (tripDetails) => {
  const response = await api.post('/recommendations/itinerary', tripDetails);
  return response.data;
};

/**
 * Generate activity recommendations
 */
export const generateActivityRecommendations = async (params) => {
  const response = await api.post('/recommendations/activities', params);
  return response.data;
};

/**
 * Generate food/restaurant recommendations
 */
export const generateFoodRecommendations = async (params) => {
  const response = await api.post('/recommendations/food', params);
  return response.data;
};

/**
 * Health check for recommendations API
 */
export const checkRecommendationsHealth = async () => {
  const response = await api.get('/recommendations/health');
  return response.data;
};

/**
 * Save user feedback on recommendation
 */
export const saveRecommendationFeedback = async (
  recommendationId,
  feedback
) => {
  const response = await api.post('/recommendations/feedback', {
    recommendationId,
    feedback, // 'thumbsUp' | 'thumbsDown'
  });
  return response.data;
};

/**
 * Get user's saved/favorite recommendations
 */
export const getSavedRecommendations = async () => {
  const response = await api.get('/recommendations/saved');
  return response.data;
};

/**
 * Save a recommendation as favorite
 */
export const saveRecommendation = async (recommendation) => {
  const response = await api.post('/recommendations/save', recommendation);
  return response.data;
};

/**
 * Remove a saved recommendation
 */
export const removeSavedRecommendation = async (recommendationId) => {
  const response = await api.delete(
    `/recommendations/saved/${recommendationId}`
  );
  return response.data;
};

export default {
  generateItinerary,
  generateActivityRecommendations,
  generateFoodRecommendations,
  checkRecommendationsHealth,
  saveRecommendationFeedback,
  getSavedRecommendations,
  saveRecommendation,
  removeSavedRecommendation,
};
