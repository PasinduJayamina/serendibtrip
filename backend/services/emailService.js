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

// ============ SHARED STYLES ============

const BRAND_COLORS = {
  primary: '#208896',
  primaryDark: '#1a6d78',
  gold: '#D4A853',
  goldDark: '#B8893A',
  dark: '#0F1B2D',
  darkCard: '#162236',
  darkBorder: '#1E3A5F',
  textPrimary: '#F0F4F8',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

/**
 * Generate the shared email wrapper (dark-themed, premium design)
 */
const emailWrapper = (content, footerExtra = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SerendibTrip</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_COLORS.dark};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <span style="font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.textPrimary}; letter-spacing: -0.5px;">
                🌴 <span style="color: ${BRAND_COLORS.gold};">Serendib</span><span style="color: ${BRAND_COLORS.textPrimary};">Trip</span>
              </span>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_COLORS.darkCard}; border-radius: 16px; border: 1px solid ${BRAND_COLORS.darkBorder}; overflow: hidden;">
                ${content}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              ${footerExtra}
              <p style="margin: 8px 0; font-size: 12px; color: ${BRAND_COLORS.textMuted};">
                © ${new Date().getFullYear()} SerendibTrip · Your Sri Lanka Travel Planner
              </p>
              <p style="margin: 4px 0; font-size: 11px; color: ${BRAND_COLORS.textMuted};">
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Generate a styled button
 */
const styledButton = (text, url, color = BRAND_COLORS.primary) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
    <tr>
      <td style="border-radius: 10px; background: linear-gradient(135deg, ${color}, ${color}CC);" align="center">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 40px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

// ============ EMAIL TEMPLATES ============

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 [DEV MODE] Password reset email would be sent to:', email);
    console.log('📧 [DEV MODE] Reset link:', `${process.env.FRONTEND_URL}/reset-password/${resetToken}`);
    return true;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const fromEmail = process.env.EMAIL_FROM || `SerendibTrip <${process.env.EMAIL_USER}>`;

  const content = `
    <!-- Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryDark}); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 8px;">🔐</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
          Reset Your Password
        </h1>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND_COLORS.textPrimary}; line-height: 1.6;">
          Hi${userName ? ` <strong>${userName}</strong>` : ''},
        </p>
        
        <p style="margin: 0 0 28px; font-size: 15px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.7;">
          We received a request to reset your password for your SerendibTrip account. 
          Click the button below to create a new password:
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          ${styledButton('Reset Password', resetUrl)}
        </div>
        
        <!-- Warning Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td style="background: ${BRAND_COLORS.warning}15; border: 1px solid ${BRAND_COLORS.warning}40; border-radius: 10px; padding: 16px 20px;">
              <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.warning}; line-height: 1.6;">
                ⏰ This link expires in <strong>1 hour</strong>. If you didn't request a reset, 
                please ignore this email or contact support.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Fallback Link -->
        <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.textMuted}; line-height: 1.6;">
          If the button doesn't work, copy this link:<br>
          <a href="${resetUrl}" style="color: ${BRAND_COLORS.primary}; word-break: break-all;">${resetUrl}</a>
        </p>
      </td>
    </tr>
  `;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: '🔐 Reset Your SerendibTrip Password',
    html: emailWrapper(content),
    text: `Hi${userName ? ` ${userName}` : ''},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\n- SerendibTrip Team`,
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
 */
const verifyEmailConfig = async () => {
  const transporter = createTransporter();
  if (!transporter) return false;

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

  const content = `
    <!-- Countdown Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, #1a8a5e); padding: 45px 30px; text-align: center;">
        <div style="font-size: 64px; font-weight: 800; color: #ffffff; line-height: 1; margin-bottom: 4px;">
          ${daysUntil}
        </div>
        <div style="font-size: 16px; color: rgba(255,255,255,0.85); font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
          day${daysUntil !== 1 ? 's' : ''} to go
        </div>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 35px 30px;">
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: ${BRAND_COLORS.textPrimary};">
          Hi ${userName || 'Traveler'} 👋
        </h2>
        
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.7;">
          Your adventure to <strong style="color: ${BRAND_COLORS.gold};">${trip.destination}</strong> is almost here! 
          Here's a quick checklist to make sure you're ready:
        </p>
        
        <!-- Checklist -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_COLORS.primary}10; border: 1px solid ${BRAND_COLORS.primary}25; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 20px 24px;">
              ${['Check your passport & travel documents', 'Review your packing list', `Download offline maps of ${trip.destination}`, 'Exchange some Sri Lankan Rupees', 'Confirm your accommodations'].map(item => `
                <div style="display: flex; align-items: center; padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
                  <span style="color: ${BRAND_COLORS.primary}; margin-right: 10px; font-size: 16px;">☐</span>
                  ${item}
                </div>
              `).join('')}
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          ${styledButton('View Your Itinerary', tripUrl, BRAND_COLORS.gold)}
        </div>
        
        <!-- Trip Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_COLORS.dark}; border-radius: 10px; border: 1px solid ${BRAND_COLORS.darkBorder};">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_COLORS.textMuted}; font-weight: 600;">
                Trip Details
              </p>
              <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
                📍 ${trip.destination} · ${trip.duration || '?'} days · ${trip.groupSize || 1} traveler${(trip.groupSize || 1) !== 1 ? 's' : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: `🌴 ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until your ${trip.destination} adventure!`,
    html: emailWrapper(content),
    text: `Hi ${userName || 'Traveler'},\n\nOnly ${daysUntil} day(s) until your ${trip.destination} adventure!\n\nChecklist:\n- Check passport\n- Review packing list\n- Download offline maps\n- Exchange currency\n- Confirm accommodations\n\nView: ${tripUrl}\n\n- SerendibTrip Team`,
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
  const weatherEmoji = isRainy ? '🌧️' : (weather.condition?.toLowerCase().includes('cloud') ? '⛅' : '☀️');
  const gradientColors = isRainy 
    ? `${BRAND_COLORS.primary}, #2563EB` 
    : '#F59E0B, #EF4444';

  const content = `
    <!-- Weather Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${gradientColors}); padding: 45px 30px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 8px;">${weatherEmoji}</div>
        <div style="font-size: 42px; font-weight: 800; color: #ffffff; line-height: 1;">
          ${weather.temperature || weather.temp || '?'}°C
        </div>
        <div style="font-size: 15px; color: rgba(255,255,255,0.85); margin-top: 6px; font-weight: 500;">
          ${weather.condition || 'Current conditions'}
        </div>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 35px 30px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: ${BRAND_COLORS.textPrimary};">
          Weather Update for ${trip.destination}
        </h2>
        
        <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.7;">
          Hi ${userName || 'Traveler'}, here's what to expect weather-wise for your upcoming trip:
        </p>
        
        <!-- Alert Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background: ${isRainy ? BRAND_COLORS.primary : BRAND_COLORS.warning}15; border-left: 4px solid ${isRainy ? BRAND_COLORS.primary : BRAND_COLORS.warning}; border-radius: 0 10px 10px 0; padding: 16px 20px;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: ${isRainy ? BRAND_COLORS.primary : BRAND_COLORS.warning};">
                ${isRainy ? '☔ Rainy weather expected!' : '☀️ Clear skies ahead!'}
              </p>
              <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.5;">
                ${isRainy 
                  ? "Don't forget to pack an umbrella and waterproof bag for your electronics." 
                  : "Remember sunscreen, sunglasses, and stay hydrated during outdoor activities!"}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Packing Tips -->
        <p style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_COLORS.textMuted}; font-weight: 600;">
          Packing Tips
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_COLORS.dark}; border-radius: 10px; border: 1px solid ${BRAND_COLORS.darkBorder};">
          <tr>
            <td style="padding: 16px 20px;">
              ${(isRainy 
                ? ['🧥 Waterproof jacket or poncho', '👕 Quick-dry clothing', '📱 Waterproof phone case', '☂️ Compact umbrella']
                : ['🧴 SPF 50+ sunscreen', '👒 Wide-brimmed hat', '🕶️ UV-protection sunglasses', '💧 Reusable water bottle']
              ).map(item => `
                <div style="padding: 6px 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
                  ${item}
                </div>
              `).join('')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: `${weatherEmoji} Weather Update for your ${trip.destination} trip`,
    html: emailWrapper(content),
    text: `Weather Update for ${trip.destination}\n\nConditions: ${weather.condition || 'N/A'}\nTemp: ${weather.temperature || weather.temp || '?'}°C\n\n${isRainy ? 'Pack an umbrella!' : 'Remember sunscreen!'}\n\n- SerendibTrip Team`,
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
