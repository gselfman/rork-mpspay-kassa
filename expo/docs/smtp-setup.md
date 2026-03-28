# SMTP Email Backend Setup

This document explains how to set up and use the SMTP email backend for the MPS Pay mobile app.

## Overview

The SMTP backend is a Node.js Express server that handles email sending using the MPS Pay SMTP server (poste.io). It provides a simple REST API for sending emails from the React Native frontend.

## Server Configuration

### SMTP Settings
- **Host**: mail.mpspay.ru
- **Port**: 587
- **Encryption**: STARTTLS
- **Authentication**: Required
- **Username**: app@mpspay.ru
- **Password**: 9icdo4pUVC
- **TLS**: `rejectUnauthorized: false` (for self-signed certificates)

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install express nodemailer cors
```

3. Start the server:
```bash
node smtp-backend.js
```

The server will start on port 3001 by default.

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and timestamp.

### Send Email
```
POST /send-email
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>"
}
```

**Response (Success):**
```json
{
  "success": true,
  "messageId": "unique-message-id",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## React Native Integration

Update the `SMTP_BACKEND_URL` in `utils/api.ts` to point to your deployed backend:

```typescript
const SMTP_BACKEND_URL = 'http://your-server-ip:3001';
```

## Usage Examples

### Basic Email
```javascript
const response = await fetch('http://localhost:3001/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Payment Receipt',
    text: 'Thank you for your payment!',
    html: '<h1>Thank you for your payment!</h1>'
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Email sent successfully!');
} else {
  console.error('Failed to send email:', result.error);
}
```

### Payment Receipt Email
```javascript
const receiptData = {
  to: 'customer@example.com',
  subject: 'Payment Receipt from MPS Pay',
  text: `
    Dear Customer,
    
    Your payment has been processed successfully.
    
    Payment ID: 12345
    Amount: 1000 RUB
    Date: ${new Date().toLocaleString()}
    
    Thank you for your business!
  `,
  html: `
    <h1>Payment Receipt</h1>
    <p>Dear Customer,</p>
    <p>Your payment has been processed successfully.</p>
    <ul>
      <li><strong>Payment ID:</strong> 12345</li>
      <li><strong>Amount:</strong> 1000 RUB</li>
      <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
    </ul>
    <p>Thank you for your business!</p>
  `
};

const response = await fetch('http://localhost:3001/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(receiptData),
});
```

## Deployment

### Local Development
```bash
node smtp-backend.js
```

### Production Deployment
1. Deploy to your preferred hosting service (Heroku, DigitalOcean, AWS, etc.)
2. Set environment variables:
   - `PORT`: Server port (default: 3001)
3. Update the `SMTP_BACKEND_URL` in your React Native app
4. Ensure CORS is properly configured for your domain

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "smtp-backend.js"]
```

## Security Considerations

1. **CORS**: Configure CORS for production to only allow requests from your app's domain
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Input Validation**: The server validates email format and required fields
4. **Environment Variables**: Store sensitive configuration in environment variables
5. **HTTPS**: Use HTTPS in production
6. **Authentication**: Consider adding API key authentication for production use

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if the server is running and accessible
2. **SMTP Authentication Failed**: Verify SMTP credentials
3. **Self-signed Certificate Error**: Ensure `rejectUnauthorized: false` is set
4. **CORS Error**: Configure CORS properly for your frontend domain

### Debugging

Enable debug logging by setting the DEBUG environment variable:
```bash
DEBUG=nodemailer node smtp-backend.js
```

### Testing

Test the server with curl:
```bash
curl -X POST http://localhost:3001/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

## Features

- ✅ HTML and plain text email support
- ✅ Email format validation
- ✅ Error handling and logging
- ✅ CORS support
- ✅ Health check endpoint
- ✅ Self-signed certificate support
- ✅ Detailed error messages
- ✅ Request validation

## Future Enhancements

- [ ] Email templates
- [ ] Attachment support
- [ ] Queue system for bulk emails
- [ ] Email tracking and analytics
- [ ] API key authentication
- [ ] Rate limiting
- [ ] Email delivery status webhooks