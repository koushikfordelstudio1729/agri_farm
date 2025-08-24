# OTP Service Setup Guide

This guide will help you configure Twilio (SMS) and SendGrid (Email) for your OTP verification system.

## 🚀 Quick Setup

### 1. Twilio SMS Setup

1. **Sign up for Twilio**: Go to [twilio.com](https://www.twilio.com/try-twilio)
2. **Get your credentials**:
   - Account SID: Found in your Twilio Console Dashboard
   - Auth Token: Found in your Twilio Console Dashboard  
   - Phone Number: Purchase a phone number from Twilio Console
   - Verify Service SID: Create a Verify Service in Twilio Console

3. **Update your `.env` file**:
   ```env
   SMS_SERVICE=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 2. SendGrid Email Setup

1. **Sign up for SendGrid**: Go to [sendgrid.com](https://sendgrid.com/)
2. **Create an API Key**:
   - Go to Settings → API Keys
   - Create API Key with "Full Access" or "Mail Send" permissions
   - Copy the API key (you won't see it again!)

3. **Update your `.env` file**:
   ```env
   EMAIL_SERVICE=sendgrid
   EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your App Name
   ```

## 📋 Complete Environment Variables

Add these to your `.env` file:

### OTP Configuration
```env
# OTP Settings
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_ENABLE_ALPHANUMERIC=false
```

### SMS Service (Choose One)

#### Option A: Twilio (Recommended)
```env
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Option B: AWS SNS
```env
SMS_SERVICE=aws_sns
AWS_SNS_ACCESS_KEY=your_aws_access_key
AWS_SNS_SECRET_KEY=your_aws_secret_key
AWS_SNS_REGION=us-east-1
```

### Email Service (Choose One)

#### Option A: SendGrid (Recommended)
```env
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

#### Option B: Mailgun
```env
EMAIL_SERVICE=mailgun
MAILGUN_USERNAME=postmaster@mg.yourdomain.com
MAILGUN_PASSWORD=your_mailgun_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
```

#### Option C: Custom SMTP (Gmail, Outlook, etc.)
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Your App Name
```

## 🔗 API Endpoints

Once configured, these OTP endpoints will be available:

### Email OTP
- **Send Email OTP**: `POST /api/v1/auth/otp/email/send`
  ```json
  { "email": "user@example.com" }
  ```

- **Verify Email OTP**: `POST /api/v1/auth/otp/email/verify`
  ```json
  { "email": "user@example.com", "otp": "123456" }
  ```

### Phone OTP
- **Send Phone OTP**: `POST /api/v1/auth/otp/phone/send`
  ```json
  { "phone": "+1234567890", "countryCode": "+1" }
  ```

- **Verify Phone OTP**: `POST /api/v1/auth/otp/phone/verify`
  ```json
  { "phone": "+1234567890", "countryCode": "+1", "otp": "123456" }
  ```

### Phone Login
- **Request Phone Login OTP**: `POST /api/v1/auth/login/phone/request`
  ```json
  { "phone": "+1234567890", "countryCode": "+1" }
  ```

- **Login with Phone OTP**: `POST /api/v1/auth/login/phone/verify`
  ```json
  { "phone": "+1234567890", "countryCode": "+1", "otp": "123456", "rememberMe": false }
  ```

## 🧪 Testing

### 1. Test SMS Service
```bash
curl -X POST http://localhost:3002/api/v1/auth/otp/phone/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "countryCode": "+1"}'
```

### 2. Test Email Service
```bash
curl -X POST http://localhost:3002/api/v1/auth/otp/email/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 🛡️ Security Features

- **Rate Limiting**: 3 OTP requests per 5 minutes, 5 verification attempts per 10 minutes
- **OTP Expiry**: Configurable (default 5 minutes)
- **Attempt Limits**: Max 3 verification attempts per OTP
- **Phone/Email Blocking**: Automatic blocking for abuse prevention
- **Secure Storage**: OTPs are hashed before storage
- **Request Tracking**: IP address and user agent logging

## 🌍 Multi-Language Support

The system includes templates for:
- English (en)
- Spanish (es)
- More languages can be added in the OtpService

## 🔧 Troubleshooting

### Common Issues:

1. **"Cannot find module 'aws-sdk'"**
   - Run: `npm install aws-sdk`

2. **"Twilio authentication failed"**
   - Verify your Account SID and Auth Token
   - Check if your Twilio account is active

3. **"SendGrid API key invalid"**
   - Regenerate API key with proper permissions
   - Ensure no extra spaces in the API key

4. **"Phone number format invalid"**
   - Use international format: +1234567890
   - Include country code

5. **"Email delivery failed"**
   - Verify sender email is authenticated in SendGrid
   - Check sender reputation

## 📞 Support

For service-specific support:
- **Twilio**: [Twilio Support](https://support.twilio.com/)
- **SendGrid**: [SendGrid Support](https://support.sendgrid.com/)

## 🎯 Production Recommendations

1. **Use separate credentials** for development/production
2. **Set up domain authentication** for better email delivery
3. **Monitor usage** to avoid exceeding service limits
4. **Set up webhooks** for delivery status tracking
5. **Use environment-specific** phone numbers and sender emails