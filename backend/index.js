const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

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

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/users', usersRoutes);

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
