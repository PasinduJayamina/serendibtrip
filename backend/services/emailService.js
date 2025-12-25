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

module.exports = {
  sendPasswordResetEmail,
  verifyEmailConfig,
};
