const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.testAccount = null;
    this.sendgridEnabled = false;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Option to disable emails completely
      if (process.env.EMAIL_DISABLED === 'true') {
        console.log('📧 Email service DISABLED for thesis/development');
        this.transporter = null;
        return;
      }
      
      // Check for SendGrid configuration
      if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.EMAIL_PASS) {
        // Use SendGrid API (production)
        try {
          sgMail.setApiKey(process.env.EMAIL_PASS);
          this.sendgridEnabled = true;
          console.log('📧 SendGrid API initialized successfully');
          console.log('   ✅ Production email service ready');
          return; // Skip SMTP setup, use API instead
        } catch (error) {
          console.error('SendGrid API initialization failed:', error);
          console.log('   Falling back to Ethereal...');
        }
      }
      
      // Fallback to Ethereal for development/testing
      if (!this.sendgridEnabled) {
        // Fall back to Ethereal for development/testing
        this.testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: this.testAccount.user,
            pass: this.testAccount.pass,
          },
        });

        console.log('📧 Email service initialized with Ethereal (Test Mode)');
        console.log(`   Test account: ${this.testAccount.user}`);
        console.log('   ⚠️  Emails will not be delivered to real addresses');
        console.log('   ℹ️  To use SendGrid, set EMAIL_SERVICE=sendgrid and provide API key');
      }

      // Test the connection
      await this.transporter.verify();
      console.log('   ✅ Email server connection verified');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      console.error('Email notifications will be disabled');
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      // Use SendGrid API if available (more reliable)
      if (this.sendgridEnabled) {
        return await this.sendViaSendGridAPI(email, resetToken, userName);
      }
      
      // Fallback to SMTP
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      // Create reset URL using configured frontend base URL
      const frontendBaseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`;
      
      // Email content
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"Car Rental System" <noreply@carrental.com>',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-bottom: 3px solid #ffc107;
              }
              .content {
                padding: 20px 0;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #666;
              }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                background-color: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 10px;
                margin: 20px 0;
              }
              .link-box {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                word-break: break-all;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Car Rental System</h1>
              <h2>Password Reset Request</h2>
            </div>
            
            <div class="content">
              <p>Dear ${userName || 'User'},</p>
              
              <p>We received a request to reset your password for your Car Rental System account.</p>
              
              <p>To reset your password, please click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="link-box">
                ${resetUrl}
              </div>
              
              <div class="warning">
                <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
              </div>
              
              <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account will stay secure.</p>
              
              <p>Best regards,<br>
              The Car Rental Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
              <p>&copy; 2025 Car Rental System. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Reset Request
          
          Hello ${userName || 'User'},
          
          We received a request to reset your password. Visit the following link to create a new password:
          
          ${resetUrl}
          
          This link will expire in 1 hour for security reasons.
          
          If you didn't request a password reset, please ignore this email.
          
          Best regards,
          The Car Rental Team
        `,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Get preview URL for Ethereal (test emails)
      const testUrl = nodemailer.getTestMessageUrl(info);
      
      console.log('Password reset email sent:', info.messageId);
      if (testUrl) {
        console.log('Preview URL (Ethereal):', testUrl);
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: testUrl,
        etherealUrl: testUrl,
        service: process.env.EMAIL_SERVICE || 'ethereal',
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // SendGrid API method (more reliable than SMTP)
  async sendViaSendGridAPI(email, resetToken, userName) {
    try {
      const frontendBaseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendBaseUrl}/reset-password/${resetToken}`;
      
      const msg = {
        to: email,
        from: process.env.EMAIL_FROM || 'Car Rental System <noreply@carrental.com>',
        subject: 'Password Reset Request - Car Rental System',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #007bff; }
              .content { padding: 30px 20px; }
              .btn { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .btn:hover { background-color: #0056b3; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Car Rental System</h1>
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Dear ${userName || 'User'},</p>
              <p>We received a request to reset your password for your Car Rental System account.</p>
              <p>To reset your password, please click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="btn">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">${resetUrl}</p>
              <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br>The Car Rental Team</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Reset Request - Car Rental System
          
          Dear ${userName || 'User'},
          
          We received a request to reset your password for your Car Rental System account.
          
          To reset your password, please visit this link:
          ${resetUrl}
          
          This link will expire in 1 hour for security reasons.
          
          If you didn't request a password reset, please ignore this email.
          
          Best regards,
          The Car Rental Team
        `
      };

      const result = await sgMail.send(msg);
      console.log('✅ Password reset email sent via SendGrid API');
      console.log(`   To: ${email}`);
      console.log(`   Message ID: ${result[0].headers['x-message-id']}`);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        service: 'sendgrid-api',
        method: 'API (not SMTP)'
      };
    } catch (error) {
      console.error('SendGrid API error:', error);
      return {
        success: false,
        error: error.message,
        service: 'sendgrid-api'
      };
    }
  }

  async sendPasswordChangedEmail(email, userName) {
    try {
      // Ensure transporter is initialized
      if (!this.transporter) {
        await this.initializeTransporter();
      }
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"Car Rental System" <noreply@carrental.com>',
        to: email,
        subject: 'Password Changed Successfully',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed Successfully</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-bottom: 3px solid #28a745;
              }
              .content {
                padding: 20px 0;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #666;
              }
              .success {
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 10px;
                margin: 20px 0;
              }
              .warning {
                color: #dc3545;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Car Rental System</h1>
              <h2>Password Changed Successfully</h2>
            </div>
            
            <div class="content">
              <p>Dear ${userName || 'User'},</p>
              
              <div class="success">
                <strong>Success!</strong> Your password has been changed successfully.
              </div>
              
              <p>You can now log in to your account using your new password.</p>
              
              <p class="warning">Security Notice:</p>
              <p>If you did not make this change, please contact our support team immediately as your account may have been compromised.</p>
              
              <p>Best regards,<br>
              The Car Rental Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
              <p>&copy; 2025 Car Rental System. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Changed Successfully
          
          Hello ${userName || 'User'},
          
          Your password has been changed successfully. You can now log in with your new password.
          
          If you did not make this change, please contact our support team immediately.
          
          Best regards,
          The Car Rental Team
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Get test URL for Ethereal
      const testUrl = nodemailer.getTestMessageUrl(info);
      
      console.log('Password changed email sent:', info.messageId);
      if (testUrl) {
        console.log('Preview URL (Ethereal):', testUrl);
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: testUrl,
        etherealUrl: testUrl,
        service: process.env.EMAIL_SERVICE || 'ethereal',
      };
    } catch (error) {
      console.error('Error sending password changed email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
