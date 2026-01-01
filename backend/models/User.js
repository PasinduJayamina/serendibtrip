const mongoose = require('mongoose');

// Preferences sub-schema
const preferencesSchema = new mongoose.Schema(
  {
    favoriteDestinations: {
      type: [String],
      default: [],
    },
    travelStyle: {
      type: String,
      enum: [
        'luxury',
        'budget',
        'adventure',
        'cultural',
        'relaxation',
        'family',
        'backpacker',
        'eco-friendly',
      ],
      default: 'budget',
    },
    dietaryRestrictions: {
      type: [String],
      default: [],
    },
    mobilityNeeds: {
      type: [String],
      default: [],
    },
    currency: {
      type: String,
      default: 'LKR',
    },
    language: {
      type: String,
      default: 'English',
    },
  },
  { _id: false }
);

// Review sub-schema
const reviewSchema = new mongoose.Schema(
  {
    attractionId: {
      type: String,
      required: true,
    },
    attractionName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      maxlength: 1000,
    },
    visitDate: {
      type: Date,
    },
    photos: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Saved trip sub-schema
const savedTripSchema = new mongoose.Schema(
  {
    tripId: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    budget: {
      type: Number,
    },
    groupSize: {
      type: Number,
      default: 1,
    },
    interests: {
      type: [String],
      default: [],
    },
    itinerary: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Saved itinerary items for this trip
    savedItems: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: ['planned', 'ongoing', 'completed', 'cancelled'],
      default: 'planned',
    },
  },
  { timestamps: true }
);

// Favorite attraction sub-schema
const favoriteAttractionSchema = new mongoose.Schema(
  {
    attractionId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    location: {
      type: String,
    },
    image: {
      type: String,
    },
    rating: {
      type: Number,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    profilePicture: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    savedTrips: {
      type: [savedTripSchema],
      default: [],
    },
    favoriteAttractions: {
      type: [favoriteAttractionSchema],
      default: [],
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    notificationSettings: {
      tripReminders: {
        type: Boolean,
        default: true,
      },
      weatherAlerts: {
        type: Boolean,
        default: true,
      },
      reminderDays: {
        type: [Number],
        default: [7, 3, 1], // Send reminders 7, 3, and 1 day before trip
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Note: Index on email is automatically created by 'unique: true'

const User = mongoose.model('User', userSchema);

module.exports = User;
