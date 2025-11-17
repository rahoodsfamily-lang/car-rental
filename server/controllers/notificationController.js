const Notification = require('../models/Notification');
const User = require('../models/User');
const Rental = require('../models/Rental');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const NotificationSettings = require('../models/NotificationSettings');
const { emitToUser } = require('../socket/socketServer');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');

// Initialize SendGrid API if available
let sendgridEnabled = false;
if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.EMAIL_PASS) {
  try {
    sgMail.setApiKey(process.env.EMAIL_PASS);
    sendgridEnabled = true;
    console.log('📧 SendGrid API initialized in notificationController');
  } catch (error) {
    console.error('SendGrid API initialization failed in notificationController:', error);
  }
}

/**
 * Helper function to emit notification via WebSocket
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification object
 */
const emitNotificationViaWebSocket = (userId, notification) => {
  try {
    emitToUser(userId.toString(), 'newNotification', {
      notification: notification.toObject ? notification.toObject() : notification,
      unreadCount: null // Will be fetched by client
    });
  } catch (socketError) {
    console.error('Error emitting notification via WebSocket:', socketError);
  }
};

/**
 * Broadcast a copy of a notification to admin users who have enabled this notification type.
 * @param {Object} notifData - All properties for Notification except userId.
 */
const broadcastToAdmins = async (notifData) => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    if (!adminUsers.length) {
      return;
    }
    
    const adminNotifications = [];
    
    // Check each admin's notification settings
    for (const admin of adminUsers) {
      const settings = await NotificationSettings.getOrCreate(admin._id);
      
      // Check if admin wants to receive this notification type
      if (settings.shouldSendNotification(notifData.type, 'inApp')) {
        adminNotifications.push({
          ...notifData,
          userId: admin._id,
          isAdminCopy: true, // Mark as admin notification
        });
      } else {
        console.log(`⚙️ In-app notification skipped for admin ${admin._id} (user preference)`);
      }
    }
    
    // Only insert if there are notifications to send
    if (adminNotifications.length > 0) {
      const insertedNotifications = await Notification.insertMany(adminNotifications);
      console.log(`✅ Broadcast notification sent to ${adminNotifications.length} admin(s)`);
      
      // Emit WebSocket event to each admin
      insertedNotifications.forEach(notification => {
        emitNotificationViaWebSocket(notification.userId, notification);
      });
    } else {
      console.log(`⚠️ No admins have enabled this notification type`);
    }
  } catch (err) {
    console.error('Error broadcasting admin notifications:', err);
  }
};

/**
 * Build admin-specific subject and message for rental related events.
 * @param {Object} userDoc MongoDB User document
 * @param {Object} carDoc MongoDB Car document
 * @param {string} status Rental status keyword (e.g., 'checked_out', 'completed', 'overdue')
 * @returns {{subject: string, message: string}}
 */
const buildAdminRentalStatus = (userDoc, carDoc, status) => {
  const renterName = userDoc ? `${userDoc.profile.firstName} ${userDoc.profile.lastName}` : 'Renter';
  const carInfo = carDoc ? `${carDoc.make} ${carDoc.model}` : 'vehicle';
  const formattedStatus = status.replace('_', ' ');
  return {
    subject: `Rental ${formattedStatus} - ${renterName}`,
    message: `Rental ${formattedStatus.toUpperCase()}: ${renterName} has ${formattedStatus} ${carInfo}.`
  };
};

/**
 * Build admin-specific subject and message for booking reminders.
 * @param {Object} userDoc
 * @param {Object} carDoc
 * @param {Object} bookingDoc
 */
const buildAdminBookingReminder = (userDoc, carDoc, bookingDoc) => {
  const name = userDoc ? `${userDoc.profile.firstName} ${userDoc.profile.lastName}` : 'Customer';
  const email = userDoc ? userDoc.email : 'N/A';
  // Check for phone in both profile.phone and direct phone field
  const phone = userDoc ? (userDoc.profile?.phone || userDoc.phone || 'Not provided') : 'N/A';
  const carInfo = carDoc ? `${carDoc.year || ''} ${carDoc.make} ${carDoc.model}`.trim() : 'vehicle';
  const pricePerDay = carDoc ? carDoc.pricePerDay : 0;
  
  if (!bookingDoc) {
    return {
      subject: `Upcoming Booking – ${name}`,
      message: `BOOKING REMINDER: ${name} has an upcoming booking.`
    };
  }
  
  const startDate = new Date(bookingDoc.startDate);
  const endDate = new Date(bookingDoc.endDate);
  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const totalAmount = bookingDoc.totalAmount || (duration * pricePerDay);
  const hoursUntilDelivery = Math.ceil((startDate - new Date()) / (1000 * 60 * 60));
  // Use bookingId if available, otherwise fall back to _id
  const displayBookingId = bookingDoc.bookingId || `BKG-${bookingDoc._id.toString().slice(-5).toUpperCase()}`;
  
  const message = `UPCOMING BOOKING REMINDER: ${name} has a scheduled delivery!

Delivery Schedule:
• Delivery Time: ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}
• Time Until Delivery: ${hoursUntilDelivery} hours
• Return Date: ${endDate.toLocaleDateString()}
• Duration: ${duration} day${duration !== 1 ? 's' : ''}

Customer Details:
• Name: ${name}
• Email: ${email}
• Phone: ${phone}
• Booking ID: ${displayBookingId}

Vehicle Details:
• Vehicle: ${carInfo}
• Daily Rate: ₱${pricePerDay.toFixed(2)}
• Total Amount: ₱${totalAmount.toFixed(2)}
• Delivery Location: ${bookingDoc.location || 'Main Office'}

Preparation Checklist:
• Verify vehicle is clean and fueled
• Check all documents are ready
• Confirm insurance papers
• Prepare rental agreement
• Test vehicle systems
• Take pre-rental photos

Contact customer if needed for:
• Delivery time confirmation
• Documentation requirements
• Special requests`;
  
  return {
    subject: `Upcoming Delivery - ${name} (${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()})`,
    message: message
  };
};

/**
 * Build admin-specific subject and message for maintenance alert.
 */
const buildAdminMaintenanceAlert = (userDoc, text) => {
  const reporter = userDoc ? `${userDoc.profile.firstName} ${userDoc.profile.lastName}` : 'System';
  return {
    subject: `Maintenance Alert from ${reporter}`,
    message: `MAINTENANCE ALERT – ${reporter}: ${text}`
  };
};

/**
 * Send an email to admin users who have enabled email notifications.
 * Respects individual admin settings including quiet hours.
 * @param {string} subject
 * @param {string} message
 * @param {string} templateName - Optional template name (defaults to 'adminNotification')
 * @param {string} notificationType - Type of notification for settings check (e.g., 'newBookingAlert', 'maintenanceAlert')
 */
const sendEmailToAdmins = async (subject, message, templateName = 'adminNotification', notificationType = null) => {
  // Email notifications disabled - only in-app notifications are used
  console.log(`📧 Email to admins skipped (email notifications disabled system-wide)`);
  console.log(`   - Subject: ${subject}`);
  return { success: true, skipped: true, reason: 'Email notifications disabled' };
};

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { userId, type, message, subject, relatedBookingId, relatedRentalId, priority } = req.body;
    
    const notification = new Notification({
      userId,
      type,
      message,
      subject,
      relatedBookingId,
      relatedRentalId,
      priority
    });
    
    await notification.save();
    
    // Emit WebSocket event
    emitNotificationViaWebSocket(userId, notification);
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

// Get all notifications for a user
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1, seen = null } = req.query;
    
    let query = { userId: userId };
    if (seen !== null) {
      query.seen = seen === 'true';
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('relatedBookingId')
      .populate('relatedRentalId');
    
    const count = await Notification.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: notifications,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Mark notification as seen
const markAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { seen: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

// Mark all notifications as seen for a user
const markAllAsSeen = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await Notification.updateMany(
      { userId: userId, seen: false },
      { seen: true, readAt: new Date() }
    );
    
    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as seen`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notifications',
      error: error.message
    });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

// Get notification count for a user
const getNotificationCount = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate the provided userId to avoid a CastError when it is not a valid ObjectId (e.g., "12345")
    if (!require('mongoose').Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.'
      });
    }

    // Count all unread notifications including booking confirmations
    const count = await Notification.countDocuments({
      userId,
      seen: false
    });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notification count',
      error: error.message
    });
  }
};

// Send email via SendGrid API (more reliable than SMTP)
const sendViaSendGridAPI = async (user, subject, message, templateName = null) => {
  try {
    let emailContent = message;
    
    // If template exists, use it
    if (templateName) {
      try {
        const templatePath = path.join(__dirname, '../utils/emailTemplates', `${templateName}.html`);
        emailContent = await fs.readFile(templatePath, 'utf8');
        // Get user name
        const userName = user.profile ? 
          `${user.profile.firstName} ${user.profile.lastName}` : 
          'Valued Customer';
        // Replace placeholders in template
        emailContent = emailContent.replace('{{message}}', message);
        emailContent = emailContent.replace('{{userName}}', userName);
      } catch (err) {
        console.log('Email template not found, using plain message');
        emailContent = message;
      }
    }
    
    const msg = {
      to: user.email,
      from: process.env.EMAIL_FROM || 'Car Rental System <noreply@carrental.com>',
      subject: subject,
      html: emailContent
    };

    const result = await sgMail.send(msg);
    console.log('✅ Email sent via SendGrid API');
    console.log(`   To: ${user.email}`);
    console.log(`   Subject: ${subject}`);
    
    return {
      success: true,
      messageId: result[0].headers['x-message-id'],
      service: 'sendgrid-api'
    };
  } catch (error) {
    console.error('SendGrid API error:', error);
    return {
      success: false,
      error: error.message,
      service: 'sendgrid-api'
    };
  }
};

// Send email notification
const sendEmailNotification = async (userId, subject, message, templateName = null) => {
  try {
    // Skip email for non-authentication notifications (only in-app notifications)
    // Allow emails ONLY for: verification, resend verification, and password reset
    const authEmailTemplates = ['emailVerification', 'passwordReset'];
    const authSubjects = ['verify your email', 'reset your password', 'email verification'];
    
    const isAuthEmail = authEmailTemplates.includes(templateName) || 
                        authSubjects.some(authSubj => subject.toLowerCase().includes(authSubj));
    
    if (!isAuthEmail) {
      return { success: true, skipped: true, reason: 'Non-authentication notification' };
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    console.log(`   - Recipient: ${user.email}`);
    
    // Use SendGrid API if available (production)
    if (sendgridEnabled) {
      console.log('   - Using SendGrid API');
      return await sendViaSendGridAPI(user, subject, message, templateName);
    }
    
    // Fallback to Ethereal for development/testing
    console.log('   - SendGrid not configured, using Ethereal (Test Mode)');
    let transporter;
      
      let testAccount = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !testAccount) {
        attempts++;
        console.log(`   - Attempt ${attempts}/${maxAttempts} to create Ethereal account...`);
        
        try {
          testAccount = await Promise.race([
            nodemailer.createTestAccount(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000)
            )
          ]);
          
          console.log(`   - ✅ Ethereal account created successfully!`);
          console.log(`   - User: ${testAccount.user}`);
          
        } catch (error) {
          console.log(`   - ❌ Attempt ${attempts} failed: ${error.message}`);
          
          if (attempts < maxAttempts) {
            console.log(`   - Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!testAccount) {
        console.log('   - ⚠️ All Ethereal attempts failed. Email will be skipped.');
        console.log('   - 💡 In-app notification will still be created.');
        return { success: false, error: 'Ethereal Email service unavailable after 3 attempts', skipped: true };
      }
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    
    // If template exists, use it
    let emailContent = message;
    if (templateName) {
      try {
        const templatePath = path.join(__dirname, '../utils/emailTemplates', `${templateName}.html`);
        emailContent = await fs.readFile(templatePath, 'utf8');
        // Get user name
        const userName = user.profile ? 
          `${user.profile.firstName} ${user.profile.lastName}` : 
          'Valued Customer';
        // Replace placeholders in template
        emailContent = emailContent.replace('{{message}}', message);
        emailContent = emailContent.replace('{{userName}}', userName);
      } catch (err) {
        // If template not found, use plain message
        console.log('Email template not found, using plain message');
      }
    }
    
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Car Rental System <noreply@carrentalsystem.com>',
      to: user.email,
      subject: subject,
      html: emailContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // For Ethereal test accounts, log the preview URL
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Ethereal email preview:', nodemailer.getTestMessageUrl(info));
      console.log('   - Copy this URL to view the email in your browser');
    } else {
      console.log('✅ Email sent successfully to real SMTP server');
      console.log(`   - Message ID: ${info.messageId}`);
    }
    
    // Return success
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('   - Full error:', error);
    return { success: false, error: error.message };
  }
};

// Send booking confirmation notification
const sendBookingConfirmation = async (userId, bookingId, message, userName = 'Valued Customer') => {
  try {
    // Get user's notification settings
    const settings = await NotificationSettings.getOrCreate(userId);
    
    let notification = null;
    let emailResult = { success: false, skipped: true, reason: 'User preference' };
    
    // Check if in-app notification should be sent
    if (settings.shouldSendNotification('bookingConfirmation', 'inApp')) {
      // Create user notification directly using fast insertion
      notification = await Notification.create({
        userId,
        type: 'booking_confirmation',
        message,
        subject: 'Booking Confirmed',
        relatedBookingId: bookingId,
        priority: 'high',
        seen: false
      });
      
      // Emit WebSocket event
      emitNotificationViaWebSocket(userId, notification);
    } else {
      console.log(`⚙️ In-app notification skipped for user ${userId} (user preference)`);
    }
    
    // Email notifications disabled for booking notifications
    console.log(`📧 Email notification skipped (notifications use in-app only)`);
    emailResult = { success: true, skipped: true, reason: 'Email notifications disabled for notifications' };
    
    return { notification, emailResult };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw error;
  }
};

// Send rental status update notification
const sendRentalStatusUpdate = async (userId, rentalId, message, status = 'updated') => {
  console.log('[DEBUG sendRentalStatusUpdate] Called with:', {
    userId,
    rentalId,
    status,
    messageLength: message?.length,
    messagePreview: message?.substring(0, 100)
  });
  console.trace('[DEBUG] Call stack for sendRentalStatusUpdate');
  
  try {
    // Create in-app notification
    const notification = new Notification({
      userId,
      type: 'rental_status',
      message,
      subject: `Rental ${status}`,
      relatedRentalId: rentalId,
      priority: 'medium'
    });
    
    await notification.save();
    
    // Emit WebSocket event
    emitNotificationViaWebSocket(userId, notification);

    // Skip generic admin notification for statuses that have detailed notifications in rentalController
    const detailedStatuses = ['checked_out', 'completed', 'overdue', 'extended'];
    if (!detailedStatuses.includes(status)) {
      // Build and send admin-specific copy only for other statuses
      const rentalDoc = await Rental.findById(rentalId).populate('car', 'make model year');
      const userDoc = await User.findById(userId).select('profile.firstName profile.lastName');
      const { subject: adminSubject, message: adminMessage } = buildAdminRentalStatus(userDoc, rentalDoc ? rentalDoc.car : null, status);
      await broadcastToAdmins({
        type: 'rental_status',
        message: adminMessage,
        subject: adminSubject,
        relatedRentalId: rentalId,
        priority: 'medium',
        isAdminCopy: true
      });
      await sendEmailToAdmins(adminSubject, adminMessage);
    }
    
    // Email notifications disabled for rental notifications
    console.log(`📧 Email notification skipped (notifications use in-app only)`);
    const emailResult = { success: true, skipped: true, reason: 'Email notifications disabled for notifications' };
    
    return { notification, emailResult };
  } catch (error) {
    console.error('Error sending rental status update:', error);
    throw error;
  }
};

// Send overdue alert notification
const sendOverdueAlert = async (userId, rentalId, message) => {
  try {
    // Create in-app notification
    const notification = new Notification({
      userId,
      type: 'overdue_alert',
      message,
      subject: 'Overdue Rental Alert',
      relatedRentalId: rentalId,
      priority: 'high'
    });
    
    await notification.save();
    
    // Emit WebSocket event
    emitNotificationViaWebSocket(userId, notification);
    
    // Skip admin notification here - handled with detailed message in rentalController and overdueChecker
    
    // Email notifications disabled for overdue alerts
    console.log(`📧 Email notification skipped (notifications use in-app only)`);
    const emailResult = { success: true, skipped: true, reason: 'Email notifications disabled for notifications' };
    
    return { notification, emailResult };
  } catch (error) {
    console.error('Error sending overdue alert:', error);
    throw error;
  }
};

// Send maintenance alert notification (ADMINS ONLY)
const sendMaintenanceAlert = async (userId, message) => {
  try {
    // Only send notification and email to admins
    // No customer notification (neither in-app nor email)
    const userDoc = await User.findById(userId).select('profile.firstName profile.lastName');
    const { subject: adminSubject, message: adminMessage } = buildAdminMaintenanceAlert(userDoc, message);
    
    // Create admin notifications
    await broadcastToAdmins({
      type: 'maintenance_alert',
      message: adminMessage,
      subject: adminSubject,
      priority: 'high',
      isAdminCopy: true
    });
    
    // Send email to admins
    await sendEmailToAdmins(adminSubject, adminMessage);
    
    // Return success - maintenance alerts now only go to admins
    return { 
      notification: null, 
      emailResult: { 
        success: true, 
        message: 'Maintenance alert sent to admins only' 
      } 
    };
  } catch (error) {
    console.error('Error sending maintenance alert to admins:', error);
    throw error;
  }
};

// Send booking reminder notification
const sendBookingReminder = async (userId, bookingId, message) => {
  try {
    // Create user notification directly using fast insertion
    const notification = await Notification.create({
      userId,
      type: 'booking_reminder',
      message,
      subject: 'Booking Reminder',
      relatedBookingId: bookingId,
      priority: 'medium',
      seen: false
    });
    
    // Emit WebSocket event for user
    emitNotificationViaWebSocket(userId, notification);
    
    const bookingDoc = await Booking.findById(bookingId).populate('car', 'make model year pricePerDay');
    const carDoc = bookingDoc ? bookingDoc.car : null;
    const userDoc = await User.findById(userId).select('profile.firstName profile.lastName profile.phone email phone');
    const { subject: adminSubject, message: adminMessage } = buildAdminBookingReminder(userDoc, carDoc, bookingDoc);
    
    // Get all admin users and create notifications using fast insertMany
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    if (adminUsers.length > 0) {
      const adminNotifications = adminUsers.map(admin => ({
        userId: admin._id,
        type: 'booking_reminder',
        message: adminMessage,
        subject: adminSubject,
        relatedBookingId: bookingId,
        priority: 'medium',
        seen: false,
        isAdminCopy: true
      }));
      
      const insertedAdminNotifications = await Notification.insertMany(adminNotifications);
      
      // Emit WebSocket event for each admin
      insertedAdminNotifications.forEach(adminNotif => {
        emitNotificationViaWebSocket(adminNotif.userId, adminNotif);
      });
    }
    
    // Send emails asynchronously (don't wait)
    sendEmailToAdmins(adminSubject, adminMessage).catch(err => 
      console.error('Email send error:', err)
    );
    
    // Email notifications disabled for booking reminders
    console.log(`📧 Email notification skipped (notifications use in-app only)`);
    const emailResult = { success: true, skipped: true, reason: 'Email notifications disabled for notifications' };
    
    return { notification, emailResult };
  } catch (error) {
    console.error('Error sending booking reminder:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsSeen,
  markAllAsSeen,
  deleteNotification,
  getNotificationCount,
  sendEmailNotification,
  sendBookingConfirmation,
  sendRentalStatusUpdate,
  sendOverdueAlert,
  sendMaintenanceAlert,
  sendBookingReminder,
  broadcastToAdmins,
  sendEmailToAdmins
};
