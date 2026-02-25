const express = require('express');
const router = express.Router();
const { sendTripReminderEmail, sendWeatherAlertEmail } = require('../services/emailService');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/notifications/trip-reminder
 * @desc    Send a trip reminder email (for testing or manual trigger)
 * @access  Private
 */
router.post('/trip-reminder', auth, async (req, res) => {
  try {
    const { tripId } = req.body;
    
    // Get user info
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Find the trip
    const trip = user.savedTrips?.find(t => t._id.toString() === tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    await sendTripReminderEmail({
      email: user.email,
      userName: user.fullName,
      trip: {
        destination: trip.destination,
        startDate: trip.startDate,
        duration: trip.itinerary?.duration,
        groupSize: trip.groupSize,
      },
    });

    res.json({ success: true, message: 'Trip reminder sent' });
  } catch (error) {
    console.error('Trip reminder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/notifications/weather-alert
 * @desc    Send a weather alert email
 * @access  Private
 */
router.post('/weather-alert', auth, async (req, res) => {
  try {
    const { tripId, weather } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const trip = user.savedTrips?.find(t => t._id.toString() === tripId);
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    await sendWeatherAlertEmail({
      email: user.email,
      userName: user.fullName,
      trip: {
        destination: trip.destination,
      },
      weather: weather || { condition: 'Sunny', temperature: 28 },
    });

    res.json({ success: true, message: 'Weather alert sent' });
  } catch (error) {
    console.error('Weather alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to logged-in user
 * @access  Private
 */
router.post('/test', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'reminder' or 'weather'
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Use user's first saved trip if available, otherwise use sample trip
    let tripToUse;
    if (user.savedTrips && user.savedTrips.length > 0) {
      const savedTrip = user.savedTrips[0];
      tripToUse = {
        destination: savedTrip.destination || 'Sri Lanka',
        startDate: savedTrip.startDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        duration: savedTrip.duration || 5,
        groupSize: savedTrip.groupSize || 2,
      };
    } else {
      // Sample trip if no saved trips
      tripToUse = {
        destination: 'Sri Lanka',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: 5,
        groupSize: 2,
      };
    }

    if (type === 'weather') {
      await sendWeatherAlertEmail({
        email: user.email,
        userName: user.fullName,
        trip: tripToUse,
        weather: { condition: 'Light Rain', temperature: 24 },
      });
      res.json({ success: true, message: `Test weather alert for ${tripToUse.destination} sent to ${user.email}` });
    } else {
      await sendTripReminderEmail({
        email: user.email,
        userName: user.fullName,
        trip: tripToUse,
      });
      res.json({ success: true, message: `Test trip reminder for ${tripToUse.destination} sent to ${user.email}` });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/notifications/settings
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      settings: user.notificationSettings || {
        tripReminders: true,
        weatherAlerts: true,
        reminderDays: [7, 3, 1], // Days before trip to send reminders
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put('/settings', auth, async (req, res) => {
  try {
    const { tripReminders, weatherAlerts, reminderDays } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.notificationSettings = {
      tripReminders: tripReminders !== undefined ? tripReminders : true,
      weatherAlerts: weatherAlerts !== undefined ? weatherAlerts : true,
      reminderDays: reminderDays || [7, 3, 1],
    };

    await user.save();

    res.json({
      success: true,
      message: 'Notification settings updated',
      settings: user.notificationSettings,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/notifications/trigger-reminders
 * @desc    Manually trigger the reminder scheduler (for testing)
 * @access  Private (admin only in production)
 */
router.post('/trigger-reminders', auth, async (req, res) => {
  try {
    const { triggerReminderCheck } = require('../services/tripReminderScheduler');
    await triggerReminderCheck();
    res.json({ 
      success: true, 
      message: 'Reminder check triggered. Check server logs for details.' 
    });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
