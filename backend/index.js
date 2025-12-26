const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const recommendationsRoutes = require('./routes/recommendations');
const usersRoutes = require('./routes/users');

// Import utilities
const { startCacheCleanup } = require('./utils/cacheCleanup');

const app = express();

// ============ DATABASE CONNECTION ============
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+, but kept for compatibility
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// ============ SECURITY MIDDLEWARE ============
// Helmet - sets various HTTP headers for security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for development
}));

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes - 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiter - 5 requests per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ MIDDLEWARE ============
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ============ ROUTES ============
// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', require('./routes/notifications'));

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({
    message: 'SerendibTrip Backend is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ============ 404 HANDLING ============
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);

  // Start cache cleanup cron jobs
  startCacheCleanup();
});
