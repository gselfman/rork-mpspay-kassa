const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());

// SMTP Configuration
const transporter = nodemailer.createTransporter({
  host: 'mail.mpspay.ru',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'app@mpspay.ru',
    pass: '9icdo4pUVC',
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SMTP API server is running',
    timestamp: new Date().toISOString()
  });
});

// Send email endpoint
app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  // Validate required fields
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to, subject, and either text or html' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid email address format' 
    });
  }

  try {
    console.log(`Sending email to: ${to}`);
    console.log(`Subject: ${subject}`);
    
    const mailOptions = {
      from: '"MPS Pay" <app@mpspay.ru>',
      to: to,
      subject: subject,
      text: text,
      html: html || `<p>${text ? text.replace(/\n/g, '<br>') : ''}</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SMTP API server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Send email: POST http://localhost:${PORT}/send-email`);
});

module.exports = app;