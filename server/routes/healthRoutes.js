const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');

// Health check endpoint - available to admins only
router.get('/status', protect, authorizeAdmin, async (req, res) => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {
        system: {
          status: 'operational',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        },
        database: {
          status: 'unknown',
          responseTime: null
        },
        email: {
          status: 'unknown',
          lastCheck: null
        },
        api: {
          status: 'running',
          version: process.env.API_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    };

    // Check MongoDB connection
    const dbStartTime = Date.now();
    try {
      if (mongoose.connection.readyState === 1) {
        // Ping the database to check actual connectivity
        await mongoose.connection.db.admin().ping();
        healthStatus.services.database.status = 'connected';
        healthStatus.services.database.responseTime = Date.now() - dbStartTime;
      } else {
        healthStatus.services.database.status = 'disconnected';
      }
    } catch (dbError) {
      healthStatus.services.database.status = 'error';
      healthStatus.services.database.error = dbError.message;
    }

    // Check Email Service (if configured)
    try {
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        // Verify email configuration
        await transporter.verify();
        healthStatus.services.email.status = 'active';
        healthStatus.services.email.lastCheck = new Date().toISOString();
      } else {
        healthStatus.services.email.status = 'not_configured';
      }
    } catch (emailError) {
      healthStatus.services.email.status = 'error';
      healthStatus.services.email.error = emailError.message;
    }

    // Calculate overall health
    const criticalServices = [
      healthStatus.services.database.status,
      healthStatus.services.api.status
    ];

    const hasErrors = criticalServices.some(status => 
      status === 'error' || status === 'disconnected'
    );

    healthStatus.overall = hasErrors ? 'degraded' : 'healthy';

    res.status(200).json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Simple ping endpoint (no auth required)
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
