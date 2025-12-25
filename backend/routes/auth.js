const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// ============ CONSTANTS ============
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

// ============ VALIDATION HELPERS ============

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
const isValidPassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }
  return { valid: true };
};

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// ============ ROUTES ============

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and full name',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Validate full name
    if (fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters long',
      });
    }

    // Check if user already exists (without revealing if email exists)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Generic message to prevent email enumeration
      return res.status(400).json({
        success: false,
        message:
          'Unable to create account. Please try again or use a different email.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token hash in database
    user.refreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await user.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'Unable to create account. Please try again or use a different email.',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    // Generic error message for invalid credentials (security best practice)
    const invalidCredentialsMessage = 'Invalid email or password';

    if (!user) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMessage,
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMessage,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update user's refresh token and last login
    user.refreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    user.lastLogin = new Date();
    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({
          success: false,
          message: 'Refresh token has expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Find user and verify refresh token
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify stored refresh token matches
    if (!user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No active session found. Please login again.',
      });
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );
    if (!isRefreshTokenValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. Please login again.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while refreshing token.',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user data (protected route)
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Remove refresh token from database
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { refreshToken: 1 },
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout.',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .trim()
      .toLowerCase(),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });

      // Always return success to prevent email enumeration attacks
      // But only send email if user exists
      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash the token before storing (like a password)
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');


        // Store hashed token and expiry
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
        await user.save();


        // Send email with unhashed token (user receives this)
        try {
          await sendPasswordResetEmail(email, resetToken, user.fullName);
        } catch (emailError) {
          // If email fails, clear the token
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          await user.save();
          
          console.error('Failed to send password reset email:', emailError);
          return res.status(500).json({
            success: false,
            message: 'Failed to send password reset email. Please try again later.',
          });
        }
      }

      // Always return success (security: don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again later.',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 64, max: 64 })
      .withMessage('Invalid reset token'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { token, password } = req.body;

      // Hash the received token to compare with stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select('+passwordResetToken +passwordResetExpires');

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Password reset token is invalid or has expired.',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.log('Password reset successful for:', user.email);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again later.',
      });
    }
  }
);

module.exports = router;
