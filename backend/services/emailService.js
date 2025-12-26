const nodemailer = require('nodemailer');

// ============ EMAIL CONFIGURATION ============

/**
 * Create nodemailer transporter with Gmail SMTP
 */
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('⚠️  Email credentials not configured. Password reset emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name for personalization
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    // Dev mode fallback - log the reset link to console
    console.log('📧 [DEV MODE] Password reset email would be sent to:', email);
    console.log('📧 [DEV MODE] Reset link:', `${process.env.FRONTEND_URL}/reset-password/${resetToken}`);
    return true;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const fromEmail = process.env.EMAIL_FROM || `SerendibTrip <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Reset Your SerendibTrip Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #208896; }
          .title { color: #333; font-size: 24px; margin: 20px 0 10px; }
          .text { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #208896, #1a6d78); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .button-container { text-align: center; margin: 30px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; font-size: 14px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .link { color: #208896; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">🌴 SerendibTrip</div>
              <h1 class="title">Reset Your Password</h1>
            </div>
            
            <p class="text">Hi${userName ? ` ${userName}` : ''},</p>
            
            <p class="text">
              We received a request to reset your password for your SerendibTrip account. 
              Click the button below to create a new password:
            </p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              ⏰ This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, 
              please ignore this email or contact support if you have concerns.
            </div>
            
            <p class="text" style="font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" class="link">${resetUrl}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SerendibTrip. Your Sri Lanka Travel Planner.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi${userName ? ` ${userName}` : ''},
      
      We received a request to reset your password for your SerendibTrip account.
      
      Click this link to reset your password: ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      - SerendibTrip Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Verify email configuration is working
 * @returns {Promise<boolean>}
 */
const verifyEmailConfig = async () => {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Email service is configured and ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error.message);
    return false;
  }
};

/**
 * Send pre-trip reminder email
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.userName - User's name
 * @param {Object} params.trip - Trip details
 * @returns {Promise<boolean>}
 */
const sendTripReminderEmail = async ({ email, userName, trip }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 [DEV MODE] Trip reminder would be sent to:', email);
    console.log('📧 [DEV MODE] Trip:', trip.destination, '-', trip.startDate);
    return true;
  }

  const fromEmail = process.env.EMAIL_FROM || `SerendibTrip <${process.env.EMAIL_USER}>`;
  const daysUntil = Math.ceil((new Date(trip.startDate) - new Date()) / (1000 * 60 * 60 * 24));
  const tripUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/itinerary`;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: `🌴 ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until your ${trip.destination} adventure!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2D6A4F, #1E88A8); color: white; padding: 30px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .countdown { font-size: 48px; font-weight: bold; margin: 10px 0; }
          .content { padding: 30px; }
          .checklist { background: #E8F3EE; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .checklist-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; color: #2D6A4F; }
          .button { display: inline-block; background: linear-gradient(135deg, #D4A853, #B8893A); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .button-container { text-align: center; margin: 25px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">🌴 SerendibTrip</div>
              <div class="countdown">${daysUntil}</div>
              <div>day${daysUntil !== 1 ? 's' : ''} to go!</div>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Hi ${userName || 'Traveler'} 👋</h2>
              
              <p style="color: #666; line-height: 1.6;">
                Your adventure to <strong>${trip.destination}</strong> is almost here! 
                Here's a quick checklist to make sure you're ready:
              </p>
              
              <div class="checklist">
                <div class="checklist-item">☐ Check your passport and travel documents</div>
                <div class="checklist-item">☐ Review your packing list</div>
                <div class="checklist-item">☐ Download offline maps of ${trip.destination}</div>
                <div class="checklist-item">☐ Exchange some Sri Lankan Rupees</div>
                <div class="checklist-item">☐ Confirm your accommodations</div>
              </div>
              
              <div class="button-container">
                <a href="${tripUrl}" class="button">View Your Itinerary</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                📍 <strong>Trip Details:</strong><br>
                ${trip.destination} • ${trip.duration || '?'} days • ${trip.groupSize || 1} traveler${(trip.groupSize || 1) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SerendibTrip. Your Sri Lanka Travel Planner.</p>
            <p>Happy travels! 🌴</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${userName || 'Traveler'},
      
      Only ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until your ${trip.destination} adventure!
      
      Quick Checklist:
      - Check your passport and travel documents
      - Review your packing list
      - Download offline maps
      - Exchange some Sri Lankan Rupees
      - Confirm your accommodations
      
      View your itinerary: ${tripUrl}
      
      Happy travels!
      - SerendibTrip Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Trip reminder sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send trip reminder:', error.message);
    throw error;
  }
};

/**
 * Send weather alert email
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.userName - User's name
 * @param {Object} params.trip - Trip details
 * @param {Object} params.weather - Weather data
 * @returns {Promise<boolean>}
 */
const sendWeatherAlertEmail = async ({ email, userName, trip, weather }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 [DEV MODE] Weather alert would be sent to:', email);
    console.log('📧 [DEV MODE] Weather:', weather);
    return true;
  }

  const fromEmail = process.env.EMAIL_FROM || `SerendibTrip <${process.env.EMAIL_USER}>`;
  const isRainy = weather.condition?.toLowerCase().includes('rain');
  const alertIcon = isRainy ? '🌧️' : '☀️';

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: `${alertIcon} Weather Update for your ${trip.destination} trip`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: ${isRainy ? 'linear-gradient(135deg, #4A90A4, #2ecc71)' : 'linear-gradient(135deg, #F39C12, #E74C3C)'}; color: white; padding: 30px; text-align: center; }
          .weather-icon { font-size: 64px; }
          .temp { font-size: 36px; font-weight: bold; }
          .content { padding: 30px; }
          .tip-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; color: #999; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="weather-icon">${alertIcon}</div>
              <div class="temp">${weather.temperature || weather.temp || '?'}°C</div>
              <div>${weather.condition || 'Current conditions'}</div>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Weather Update for ${trip.destination}</h2>
              
              <p style="color: #666; line-height: 1.6;">
                Hi ${userName || 'Traveler'}, here's what to expect weather-wise for your upcoming trip:
              </p>
              
              ${isRainy ? `
              <div class="tip-box">
                <strong>☔ Rainy weather expected!</strong><br>
                Don't forget to pack an umbrella and waterproof bag for your electronics.
              </div>
              ` : `
              <div class="tip-box">
                <strong>☀️ Nice weather ahead!</strong><br>
                Remember sunscreen, sunglasses, and stay hydrated!
              </div>
              `}
              
              <p style="color: #666;">
                <strong>Packing Tips:</strong>
              </p>
              <ul style="color: #666;">
                ${isRainy ? `
                <li>Waterproof jacket or poncho</li>
                <li>Quick-dry clothing</li>
                <li>Waterproof phone case</li>
                ` : `
                <li>Light, breathable clothing</li>
                <li>Wide-brimmed hat</li>
                <li>Reusable water bottle</li>
                `}
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SerendibTrip</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Weather Update for ${trip.destination}
      
      Hi ${userName || 'Traveler'},
      
      Current conditions: ${weather.condition || 'N/A'}
      Temperature: ${weather.temperature || weather.temp || '?'}°C
      
      ${isRainy ? 'Rainy weather expected! Pack an umbrella.' : 'Nice weather ahead! Remember sunscreen!'}
      
      - SerendibTrip Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Weather alert sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send weather alert:', error.message);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  verifyEmailConfig,
  sendTripReminderEmail,
  sendWeatherAlertEmail,
};
