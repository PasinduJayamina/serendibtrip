const User = require('../models/User');

/**
 * Get user profile
 * GET /api/users/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePicture: user.profilePicture,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences,
        savedTrips: user.savedTrips,
        favoriteAttractions: user.favoriteAttractions,
        reviews: user.reviews,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, profilePicture, bio, phoneNumber } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture;
    if (bio !== undefined) updateData.bio = bio;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePicture: user.profilePicture,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

/**
 * Update user preferences
 * PUT /api/users/preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const {
      favoriteDestinations,
      travelStyle,
      dietaryRestrictions,
      mobilityNeeds,
      currency,
      language,
    } = req.body;

    // Build preferences update object
    const preferencesUpdate = {};
    if (favoriteDestinations !== undefined)
      preferencesUpdate['preferences.favoriteDestinations'] =
        favoriteDestinations;
    if (travelStyle !== undefined)
      preferencesUpdate['preferences.travelStyle'] = travelStyle;
    if (dietaryRestrictions !== undefined)
      preferencesUpdate['preferences.dietaryRestrictions'] =
        dietaryRestrictions;
    if (mobilityNeeds !== undefined)
      preferencesUpdate['preferences.mobilityNeeds'] = mobilityNeeds;
    if (currency !== undefined)
      preferencesUpdate['preferences.currency'] = currency;
    if (language !== undefined)
      preferencesUpdate['preferences.language'] = language;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: preferencesUpdate },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message,
    });
  }
};

/**
 * Get user's favorite attractions
 * GET /api/users/favorites
 */
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('favoriteAttractions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.favoriteAttractions,
      count: user.favoriteAttractions.length,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      error: error.message,
    });
  }
};

/**
 * Add attraction to favorites
 * POST /api/users/favorites/:attractionId
 */
const addFavorite = async (req, res) => {
  try {
    const { attractionId } = req.params;
    const { name, category, location, image, rating } = req.body;

    // Check if already favorited
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const existingFavorite = user.favoriteAttractions.find(
      (fav) => fav.attractionId === attractionId
    );

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Attraction already in favorites',
      });
    }

    // Add to favorites
    user.favoriteAttractions.push({
      attractionId,
      name,
      category,
      location,
      image,
      rating,
      addedAt: new Date(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data: user.favoriteAttractions,
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite',
      error: error.message,
    });
  }
};

/**
 * Remove attraction from favorites
 * DELETE /api/users/favorites/:attractionId
 */
const removeFavorite = async (req, res) => {
  try {
    const { attractionId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const favoriteIndex = user.favoriteAttractions.findIndex(
      (fav) => fav.attractionId === attractionId
    );

    if (favoriteIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Attraction not found in favorites',
      });
    }

    user.favoriteAttractions.splice(favoriteIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Removed from favorites',
      data: user.favoriteAttractions,
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite',
      error: error.message,
    });
  }
};

/**
 * Save a trip
 * POST /api/users/trips
 */
const saveTrip = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, groupSize, itinerary } =
      req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const tripId = `trip_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    user.savedTrips.push({
      tripId,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget,
      groupSize,
      itinerary,
      status: 'planned',
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Trip saved successfully',
      data: user.savedTrips[user.savedTrips.length - 1],
    });
  } catch (error) {
    console.error('Save trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save trip',
      error: error.message,
    });
  }
};

/**
 * Get user's saved trips
 * GET /api/users/trips
 */
const getTrips = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('savedTrips');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.savedTrips,
      count: user.savedTrips.length,
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trips',
      error: error.message,
    });
  }
};

/**
 * Update trip status
 * PUT /api/users/trips/:tripId
 */
const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status, itinerary } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const tripIndex = user.savedTrips.findIndex(
      (trip) => trip.tripId === tripId
    );

    if (tripIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (status) user.savedTrips[tripIndex].status = status;
    if (itinerary) user.savedTrips[tripIndex].itinerary = itinerary;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: user.savedTrips[tripIndex],
    });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trip',
      error: error.message,
    });
  }
};

/**
 * Delete a saved trip
 * DELETE /api/users/trips/:tripId
 */
const deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const tripIndex = user.savedTrips.findIndex(
      (trip) => trip.tripId === tripId
    );

    if (tripIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    user.savedTrips.splice(tripIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trip',
      error: error.message,
    });
  }
};

/**
 * Add a review
 * POST /api/users/reviews
 */
const addReview = async (req, res) => {
  try {
    const { attractionId, attractionName, rating, comment, visitDate, photos } =
      req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already reviewed this attraction
    const existingReview = user.reviews.find(
      (review) => review.attractionId === attractionId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this attraction',
      });
    }

    user.reviews.push({
      attractionId,
      attractionName,
      rating,
      comment,
      visitDate: visitDate ? new Date(visitDate) : undefined,
      photos: photos || [],
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: user.reviews[user.reviews.length - 1],
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: error.message,
    });
  }
};

/**
 * Get user's reviews
 * GET /api/users/reviews
 */
const getReviews = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('reviews');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.reviews,
      count: user.reviews.length,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

module.exports = {
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
};
