const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Check if user is deactivated
    if (user.deactivated) {
      return res.status(403).json({ 
        success: false, 
        message: 'This account has been deactivated. Please contact support.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token and expiry to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Send response immediately
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent to your email.'
    });

    // Send email asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const userName = `${user.profile.firstName} ${user.profile.lastName}`;
        const emailResult = await emailService.sendPasswordResetEmail(
          user.email, 
          resetToken, 
          userName
        );

        if (emailResult.success) {
          console.log(`✅ Password reset email sent to ${user.email}`);
          if (emailResult.etherealUrl) {
            console.log(`📧 Ethereal preview URL: ${emailResult.etherealUrl}`);
          }
        } else {
          console.error('Failed to send reset email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
      }
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred. Please try again later.' 
    });
  }
};

// Validate reset token
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or missing token' 
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Token is valid
    res.json({ 
      success: true, 
      message: 'Token is valid',
      email: user.email 
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred validating the token' 
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate inputs
    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send confirmation email
    const userName = `${user.profile.firstName} ${user.profile.lastName}`;
    const emailResult = await emailService.sendPasswordChangedEmail(
      user.email, 
      userName
    );

    if (emailResult.success) {
      console.log(`✅ Password changed confirmation sent to ${user.email}`);
      console.log(`📧 Preview URL: ${emailResult.etherealUrl}`);
    }

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully',
      // Include Ethereal preview URL in development
      ...(process.env.NODE_ENV !== 'production' && emailResult.success && { 
        confirmationEmailUrl: emailResult.etherealUrl,
        note: 'Check the preview URL to see the confirmation email.' 
      })
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred resetting the password' 
    });
  }
};

module.exports = {
  requestPasswordReset,
  validateResetToken,
  resetPassword
};
