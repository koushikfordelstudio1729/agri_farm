# 🌱 Agri Farm - Plant Disease Detection Backend

A comprehensive TypeScript backend API for plant disease detection and agricultural management, similar to Plantix. Features AI-powered plant disease diagnosis, multi-language support, user authentication, community features, weather integration, and expert consultations.

## 🚀 Features

- **🤖 Plant Disease Detection** - AI-powered plant disease identification with multiple ML providers
- **🔐 Authentication System** - JWT + OAuth + OTP verification with social login
- **🌍 Multi-language Support** - 8 languages with i18n support
- **☀️ Weather Integration** - Real-time weather data and agricultural alerts
- **👥 Community Features** - Posts, comments, expert consultations
- **📱 Real-time Notifications** - Push, email, SMS notifications
- **💰 Market Prices** - Real-time crop pricing and trends
- **📊 Analytics & Insights** - User behavior and crop analytics

## 📋 Prerequisites

- **Node.js** >= 18.x LTS
- **TypeScript** >= 5.0.x
- **MongoDB** >= 6.0 (Local or Atlas)
- **Redis** >= 6.0 (Optional - for caching)
- **npm** or **yarn**

## 🔧 Environment Setup Guide

### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd agri_farm
npm install
```

### Step 2: Environment Configuration

Create `.env` file in root directory. Here's how to get each service:

---

## 🔑 Required API Keys & Services

### 1. 🗄️ Database Configuration

#### **MongoDB Atlas** (Recommended - Free Tier Available)
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/agri_farm
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agri_farm
```

**Steps to get MongoDB URI:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create new cluster (FREE M0 tier)
4. Click "Connect" → "Connect your application"
5. Copy connection string and replace `<password>` with your password

#### **Local MongoDB** (Alternative)
```env
DATABASE_URL=mongodb://localhost:27017/agri_farm
MONGODB_URI=mongodb://localhost:27017/agri_farm
```

---

### 2. 🤖 Machine Learning / AI Services

#### **Plant.id API** (Recommended - Best for Plant Disease Detection)
```env
# Primary ML Service
PRIMARY_ML_SERVICE=plant_id
PLANT_ID_API_KEY=your-plant-id-api-key
PLANT_ID_API_URL=https://api.plant.id/v3
PLANT_ID_MODELS=crop_fast,plant_disease_fast,crop_health_assessment
```

**Steps to get Plant.id API:**
1. Go to [Plant.id](https://plant.id/)
2. Sign up for account
3. Go to API dashboard
4. Get your API key
5. **Pricing:** Free 100 requests/month, $19/month for 1000 requests

#### **PlantNet API** (Free Alternative)
```env
PLANTNET_API_KEY=your-plantnet-api-key
PLANTNET_API_URL=https://my-api.plantnet.org/v1
PLANTNET_PROJECT=weurope
```

**Steps to get PlantNet API:**
1. Go to [PlantNet](https://my.plantnet.org/)
2. Create account
3. Go to API section
4. Generate API key
5. **Pricing:** FREE 500 requests/day

#### **Google Cloud Vision API** (Enterprise Grade)
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision-credentials.json
```

**Steps to get Google Vision API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Vision API
4. Create service account
5. Download credentials JSON
6. **Pricing:** $1.50 per 1000 requests

#### **TensorFlow Models** (Open Source - FREE)
```env
TENSORFLOW_MODEL_URL=https://storage.googleapis.com/plantvillage-models/plant-disease-v1.json
TENSORFLOW_BACKUP_URL=https://github.com/spMohanty/PlantVillage-Dataset/releases/download/v1.0/model.json
```

**No API key required** - These are public models

#### **Hugging Face Models** (Free)
```env
HF_API_TOKEN=your-hugging-face-token
HF_PLANT_MODEL=microsoft/plant-disease-classifier
```

**Steps to get Hugging Face token:**
1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up for free account
3. Go to Settings → Access Tokens
4. Create new token
5. **Pricing:** FREE with rate limits

---

### 3. ☀️ Weather Services

#### **OpenWeatherMap** (Recommended)
```env
WEATHER_API_KEY=your-openweather-api-key
WEATHER_API_PROVIDER=openweathermap
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5
```

**Steps to get OpenWeatherMap API:**
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for free account
3. Go to API keys section
4. Copy your default API key
5. **Pricing:** FREE 1000 requests/day, $40/month for 100K requests

---

### 4. 📁 File Storage Services

#### **ImageKit** (Recommended - Already configured)
```env
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_w8o6lv/KnLbsMljYzJGKwm3le5c=
IMAGEKIT_PRIVATE_KEY=private_yN9/u6rpJ6s5Uoh+3nB35CWTu0w=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/qrv7pfblc
```

Your ImageKit is already configured! ✅

#### **Cloudinary** (Alternative)
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Steps to get Cloudinary:**
1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for free account
3. Go to Dashboard
4. Copy Cloud name, API Key, API Secret
5. **Pricing:** FREE 25GB storage, 25GB bandwidth

---

### 5. 🔐 Authentication Services

#### **Google OAuth** (Social Login)
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/v1/auth/google/callback
```

**Steps to get Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Go to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URIs
6. **Pricing:** FREE

#### **JWT Secrets** (Generate Strong Keys)
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

**Generate secure keys:**
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 6. 📱 SMS & Communication Services

#### **Twilio** (SMS & Phone Verification)
```env
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid
```

**Steps to get Twilio:**
1. Go to [Twilio](https://www.twilio.com/)
2. Sign up for free account
3. Go to Console Dashboard
4. Get Account SID and Auth Token
5. Purchase phone number
6. Create Verify Service
7. **Pricing:** FREE trial $15 credit, then pay-as-you-go

#### **SendGrid** (Email Service)
```env
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Agri Farm
```

**Steps to get SendGrid:**
1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for free account
3. Go to Settings → API Keys
4. Create new API key with full access
5. **Pricing:** FREE 100 emails/day, $14.95/month for 40K emails

---

### 7. 🔥 Firebase (Push Notifications)

#### **Firebase Admin** (Already configured)
```env
FIREBASE_PROJECT_ID=interview-app-50ac3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@interview-app-50ac3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[your-key]\n-----END PRIVATE KEY-----\n"
```

Your Firebase is already configured! ✅

#### **Firebase Client** (Already configured)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD9EN4b_iWthIME-miryhSsoocVP9i3NQM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=interview-app-50ac3.firebaseapp.com
# ... other Firebase config
```

---

### 8. 💾 Redis (Caching - Optional)

#### **Upstash Redis** (Already configured)
```env
REDIS_DISABLED=true
UPSTASH_REDIS_REST_URL=https://accurate-bluebird-7950.upstash.io
UPSTASH_REDIS_REST_TOKEN=AR8OAAIjcDE1MjE5MjVjYmU3ZWM0ZDQ2OWQxNTliM2IzYTEyZWJjZXAxMA
```

Your Upstash Redis is already configured! ✅

#### **Local Redis** (Alternative)
```env
REDIS_DISABLED=false
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🎯 Quick Setup Priority

### **Minimum Required for Basic Functionality:**
1. ✅ **Database** - MongoDB Atlas (already configured)
2. 🔧 **ML Service** - Get Plant.id API key
3. 🔧 **Weather** - Get OpenWeatherMap API key
4. ✅ **File Storage** - ImageKit (already configured)
5. 🔧 **JWT Secrets** - Generate secure keys

### **Additional Services for Full Features:**
6. 🔧 **Google OAuth** - For social login
7. 🔧 **Twilio** - For SMS verification
8. 🔧 **SendGrid** - For email notifications
9. ✅ **Firebase** - Push notifications (already configured)
10. ✅ **Redis** - Caching (already configured)

---

## ⚡ Quick Start Guide

### 1. **Essential Setup** (5 minutes)
```bash
# 1. Generate JWT secrets
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env

# 2. Get Plant.id API key (go to plant.id and sign up)
echo "PLANT_ID_API_KEY=your-plant-id-api-key" >> .env

# 3. Get OpenWeatherMap API key (go to openweathermap.org)
echo "WEATHER_API_KEY=your-openweather-api-key" >> .env
```

### 2. **Start Development**
```bash
npm run dev
```

### 3. **Test Basic Endpoints**
```bash
# Health check
curl http://localhost:3002/api/v1/health

# Register user
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Plant diagnosis (upload image)
curl -X POST http://localhost:3002/api/v1/diagnosis/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@plant_image.jpg"
```

---

## 📊 Cost Breakdown (Monthly)

### **Free Tier Setup** (Recommended for Development)
- MongoDB Atlas: **FREE** (512MB)
- PlantNet API: **FREE** (500 requests/day)
- OpenWeatherMap: **FREE** (1000 requests/day)
- ImageKit: **FREE** (20GB storage)
- Firebase: **FREE** (10K messages/month)
- Google OAuth: **FREE**
- **Total: $0/month** ✅

### **Production Tier** (For scaling)
- MongoDB Atlas: **$57/month** (Dedicated)
- Plant.id API: **$19/month** (1K requests)
- OpenWeatherMap: **$40/month** (100K requests)
- ImageKit: **$20/month** (100GB)
- Twilio: **$20/month** (SMS)
- SendGrid: **$15/month** (40K emails)
- **Total: ~$171/month** for production scale

---

## 🔒 Security Configuration

### **Production Environment Variables**
```env
# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-change-this-in-production
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_TIME=300000

# CORS
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

---

## 🚀 Deployment

### **Docker Deployment**
```bash
# Build image
docker build -t agri-farm-backend .

# Run container
docker run -p 3002:3002 --env-file .env agri-farm-backend
```

### **PM2 Deployment**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

---

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:3002/api-docs
- **Health Check**: http://localhost:3002/api/v1/health
- **API Status**: http://localhost:3002/api/v1/status

---

## 🧪 Testing

### **Run Tests**
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### **Test Environment Setup**
```env
# Test Database
TEST_DATABASE_URL=mongodb://localhost:27017/agri_farm_test
TEST_EMAIL=test@example.com
TEST_PHONE=+1234567890
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### 1. MongoDB Connection Failed
```bash
# Check connection string
# Ensure IP whitelist includes your IP
# Check username/password
```

#### 2. ML API Not Working
```bash
# Verify API key is correct
# Check API quotas/limits
# Test with curl:
curl -H "Api-Key: YOUR_KEY" https://api.plant.id/v3/identification
```

#### 3. Image Upload Fails
```bash
# Check ImageKit credentials
# Verify file size limits
# Check supported formats
```

#### 4. SMS/Email Not Sending
```bash
# Verify Twilio/SendGrid credentials
# Check phone number format
# Verify sender email domain
```

---

## 🤝 Development Workflow

### **Code Quality Checks**
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format

# Pre-commit hooks (automatic)
git commit -m "your message"
```

### **Development Commands**
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database seeding
npm run seed

# Generate API documentation
npm run docs:generate
```

---

## 📞 Support & Resources

- **Documentation**: Full API docs at `/api-docs`
- **Issues**: Create GitHub issue for bugs
- **Community**: Join our Discord/Slack
- **Email**: support@agrifarm.com

---

## 🎉 You're Ready!

Your Plantix clone backend is now configured! Start with the **Essential Setup** section and gradually add more services as needed.

**Next Steps:**
1. Get Plant.id and OpenWeatherMap API keys
2. Generate JWT secrets
3. Run `npm run dev`
4. Test with Postman or curl
5. Build your frontend! 🚀

---

**Happy Farming! 🌾**