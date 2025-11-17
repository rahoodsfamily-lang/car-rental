const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadProfilePicture, deleteFile } = require('../config/uploadConfig');

const router = express.Router();

// Validation rules
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register a new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate email verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const user = new User({
      email,
      password,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      profile: {
        firstName,
        lastName,
        phone,
      },
    });

    await user.save();

    // Send response immediately, then send email asynchronously
    res.status(201).json({
      message: 'Verification email sent! Please check your inbox to verify your account.',
      requiresVerification: true,
      email: user.email,
    });

    // Send verification email asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const { sendEmailNotification } = require('../controllers/notificationController');
        const fs = require('fs').promises;
        const path = require('path');
        
        // Read email template
        const templatePath = path.join(__dirname, '../utils/emailTemplates/emailVerification.html');
        let emailContent = await fs.readFile(templatePath, 'utf8');
        
        // Create verification link
        const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        const userName = `${firstName} ${lastName}`;
        
        // Replace placeholders
        emailContent = emailContent.replace('{{userName}}', userName);
        emailContent = emailContent.replace(/{{verificationLink}}/g, verificationLink);
        
        // Use the smart email notification system (auto-detects SendGrid/Ethereal)
        const emailResult = await sendEmailNotification(
          user._id,
          'Verify Your Email - Car Rental System',
          emailContent,
          null // No template name needed, we already processed it
        );
        
        if (emailResult.success) {
          console.log(`✅ Verification email sent to ${email}`);
        } else {
          console.warn(`⚠️  Failed to send verification email: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user account is deactivated
    if (user.deactivated === true) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    // The user is authenticated by the 'authenticate' middleware and attached to req.user
    res.json({
      message: 'User profile retrieved successfully',
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        profile: req.user.profile,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, latitude, longitude } = req.body;

    // Fetch the authenticated user (set in authenticate middleware)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update editable profile fields
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (phone !== undefined) user.profile.phone = phone;
    if (address !== undefined) user.profile.address = address;
    if (latitude !== undefined) user.profile.latitude = latitude;
    if (longitude !== undefined) user.profile.longitude = longitude;
    user.updatedAt = Date.now();

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role, // Preserve current role (admin/customer)
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', authenticate, uploadProfilePicture.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      // Delete uploaded file if user not found
      if (req.file.path) {
        await deleteFile(req.file.path);
      }
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profile.profilePicture) {
      await deleteFile(user.profile.profilePicture);
    }

    // Update user profile with new file path (Cloudinary URL or local path)
    const profilePictureUrl = req.file.path;
    user.profile.profilePicture = profilePictureUrl;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await deleteFile(req.file.path);
    }
    res.status(500).json({ message: 'Server error uploading profile picture' });
  }
});

// Remove profile picture
router.delete('/remove-profile-picture', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete profile picture if exists
    if (user.profile.profilePicture) {
      await deleteFile(user.profile.profilePicture);
    }

    // Remove profile picture from user profile
    user.profile.profilePicture = null;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      message: 'Profile picture removed successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error('Remove picture error:', err);
    res.status(500).json({ message: 'Server error removing profile picture' });
  }
});

// Password Reset Routes
const {
  requestPasswordReset,
  validateResetToken,
  resetPassword
} = require('../controllers/passwordResetController');

// Verify email with token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log(`📧 Email verification attempt with token: ${token.substring(0, 10)}...`);

    // First, check if token was already used (user verified but token cleared)
    const alreadyVerifiedUser = await User.findOne({
      emailVerificationToken: null,
      emailVerified: true
    });
    
    // Try to find user with active token
    let user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    // If no active token found, check if it was already used
    if (!user) {
      console.log(`❌ Verification failed: Invalid or expired token`);
      
      // Check if token exists but is expired
      const expiredUser = await User.findOne({ 
        emailVerificationToken: token,
        emailVerificationExpires: { $lte: Date.now() }
      });
      
      if (expiredUser) {
        console.log(`⏰ Token expired for user: ${expiredUser.email}`);
        return res.status(400).json({ 
          message: 'Verification link has expired. Please request a new verification email.',
          expired: true,
          email: expiredUser.email
        });
      }
      
      // Token doesn't exist - might have been used already
      // This is actually a success case (already verified)
      console.log(`✅ Token already used - user likely already verified`);
      return res.json({ 
        message: 'Email already verified! You can now log in.',
        success: true,
        alreadyVerified: true
      });
    }

    // Check if already verified (duplicate click protection)
    if (user.emailVerified) {
      console.log(`✅ User ${user.email} already verified`);
      return res.json({ 
        message: 'Email already verified! You can now log in.',
        success: true,
        alreadyVerified: true
      });
    }

    console.log(`✅ Verifying email for user: ${user.email}`);

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    
    // Save with validation disabled to avoid password re-hashing issues
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Email verified successfully for: ${user.email}`);

    res.json({ 
      message: 'Email verified successfully! You can now log in.',
      success: true
    });
  } catch (err) {
    console.error('❌ Email verification error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      message: 'Server error during email verification. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email using smart email service
    try {
      const { sendEmailNotification } = require('../controllers/notificationController');
      const fs = require('fs').promises;
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../utils/emailTemplates/emailVerification.html');
      let emailContent = await fs.readFile(templatePath, 'utf8');
      
      const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      const userName = `${user.profile.firstName} ${user.profile.lastName}`;
      
      emailContent = emailContent.replace('{{userName}}', userName);
      emailContent = emailContent.replace(/{{verificationLink}}/g, verificationLink);
      
      const emailResult = await sendEmailNotification(
        user._id,
        'Verify Your Email - Car Rental System',
        emailContent,
        null
      );
      
      if (!emailResult.success) {
        console.error('Error resending verification email:', emailResult.error);
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
      
      console.log(`✅ Verification email resent to ${email}`);
    } catch (emailError) {
      console.error('Error resending verification email:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ 
      message: 'Verification email sent! Please check your inbox.',
      success: true
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset (send email with reset link)
router.post('/forgot-password', requestPasswordReset);

// Validate reset token
router.get('/reset-password/:token', validateResetToken);

// Reset password with token
router.post('/reset-password/:token', resetPassword);

module.exports = router;
