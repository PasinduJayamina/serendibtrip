const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  updatePreferences,
  getFavorites,
  addFavorite,
  removeFavorite,
  saveTrip,
  getTrips,
  updateTrip,
  deleteTrip,
  addReview,
  getReviews,
} = require('../controllers/userController');

// Profile routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// Preferences routes
router.put('/preferences', auth, updatePreferences);

// Favorites routes
router.get('/favorites', auth, getFavorites);
router.post('/favorites/:attractionId', auth, addFavorite);
router.delete('/favorites/:attractionId', auth, removeFavorite);

// Trips routes
router.get('/trips', auth, getTrips);
router.post('/trips', auth, saveTrip);
router.put('/trips/:tripId', auth, updateTrip);
router.delete('/trips/:tripId', auth, deleteTrip);

// Reviews routes
router.get('/reviews', auth, getReviews);
router.post('/reviews', auth, addReview);

module.exports = router;
