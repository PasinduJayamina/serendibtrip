const cron = require("node-cron");
const User = require("../models/User");
const {
  sendTripReminderEmail,
  sendWeatherAlertEmail,
} = require("./emailService");

/**
 * Trip Reminder Scheduler
 * Runs daily to check for upcoming trips and send reminder emails
 */

// Track sent reminders to avoid duplicates (in-memory, resets on restart)
const sentReminders = new Map();

/**
 * Generate a unique key for tracking sent reminders
 */
const getReminderKey = (userId, tripId, daysBeforeTrip) => {
  const today = new Date().toISOString().split("T")[0];
  return `${userId}-${tripId}-${daysBeforeTrip}-${today}`;
};

/**
 * Check if reminder was already sent today
 */
const wasReminderSent = (userId, tripId, daysBeforeTrip) => {
  const key = getReminderKey(userId, tripId, daysBeforeTrip);
  return sentReminders.has(key);
};

/**
 * Mark reminder as sent
 */
const markReminderSent = (userId, tripId, daysBeforeTrip) => {
  const key = getReminderKey(userId, tripId, daysBeforeTrip);
  sentReminders.set(key, Date.now());
};

/**
 * Clean up old reminder tracking entries (older than 7 days)
 */
const cleanupOldReminders = () => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [key, timestamp] of sentReminders.entries()) {
    if (timestamp < sevenDaysAgo) {
      sentReminders.delete(key);
    }
  }
};

/**
 * Calculate days until trip
 */
const getDaysUntilTrip = (startDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripDate = new Date(startDate);
  tripDate.setHours(0, 0, 0, 0);
  const diffTime = tripDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Process trip reminders for all users
 */
const processReminders = async () => {
  console.log("📅 [Scheduler] Starting trip reminder check...");

  try {
    // Get all users with notification settings enabled
    const users = await User.find({
      "notificationSettings.tripReminders": { $ne: false },
    }).select("_id email fullName savedTrips notificationSettings");

    let remindersSent = 0;
    let usersChecked = 0;

    for (const user of users) {
      usersChecked++;

      if (!user.savedTrips || user.savedTrips.length === 0) continue;
      if (!user.email) continue;

      const reminderDays = user.notificationSettings?.reminderDays || [7, 3, 1];

      for (const trip of user.savedTrips) {
        if (!trip.startDate) continue;

        // Skip completed/past trips
        if (trip.status === "completed") continue;

        const daysUntil = getDaysUntilTrip(trip.startDate);

        // Skip past trips
        if (daysUntil < 0) continue;

        // Check if we should send a reminder for this day
        if (reminderDays.includes(daysUntil)) {
          // Check if already sent today
          if (
            wasReminderSent(user._id.toString(), trip._id.toString(), daysUntil)
          ) {
            continue;
          }

          try {
            await sendTripReminderEmail({
              email: user.email,
              userName: user.fullName,
              trip: {
                destination: trip.destination,
                startDate: trip.startDate,
                duration: trip.duration,
                groupSize: trip.groupSize,
              },
            });

            markReminderSent(
              user._id.toString(),
              trip._id.toString(),
              daysUntil
            );
            remindersSent++;

            console.log(
              `📧 [Scheduler] Sent ${daysUntil}-day reminder to ${user.email} for ${trip.destination}`
            );
          } catch (emailError) {
            console.error(
              `❌ [Scheduler] Failed to send reminder to ${user.email}:`,
              emailError.message
            );
          }
        }
      }
    }

    console.log(
      `✅ [Scheduler] Reminder check complete. Checked ${usersChecked} users, sent ${remindersSent} reminders.`
    );

    // Clean up old tracking entries
    cleanupOldReminders();
  } catch (error) {
    console.error("❌ [Scheduler] Error processing reminders:", error);
  }
};

/**
 * Start the reminder scheduler
 * Runs every day at 8:00 AM local time
 */
const startReminderScheduler = () => {
  // Run at 8:00 AM every day
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "⏰ [Scheduler] Daily reminder job triggered at",
        new Date().toISOString()
      );
      await processReminders();
    },
    {
      scheduled: true,
      timezone: "Asia/Colombo", // Sri Lanka timezone
    }
  );

  console.log(
    "📅 Trip reminder scheduler started (runs daily at 8:00 AM Sri Lanka time)"
  );

  // Also run a check 1 minute after server start (for testing/demo purposes)
  setTimeout(async () => {
    console.log("📅 [Scheduler] Running initial reminder check...");
    await processReminders();
  }, 60 * 1000); // 1 minute after start
};

/**
 * Manually trigger reminder check (for testing)
 */
const triggerReminderCheck = async () => {
  console.log("🔄 [Scheduler] Manual reminder check triggered");
  await processReminders();
};

module.exports = {
  startReminderScheduler,
  triggerReminderCheck,
  processReminders,
};
