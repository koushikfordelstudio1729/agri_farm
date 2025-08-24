# Agri Farm API - Postman Collection

This folder contains comprehensive Postman collection and environment files for testing the Agri Farm (Plantix Clone) Backend API.

## Files Included

1. **Agri_Farm_API.postman_collection.json** - Complete collection with 434+ endpoints
2. **Agri_Farm_API.postman_environment.json** - Environment variables for testing
3. **README.md** - This documentation file

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Import both files:
   - `Agri_Farm_API.postman_collection.json`
   - `Agri_Farm_API.postman_environment.json`

### 2. Set Environment

1. Select "Agri Farm API Environment" from the environment dropdown
2. Ensure `base_url` is set to `http://localhost:3000` (or your server URL)

### 3. Start the API Server

```bash
# Navigate to project directory
cd D:\product\agri_farm

# Install dependencies (if not done already)
npm install

# Start development server
npm run dev
```

### 4. Authentication Setup

Before testing protected endpoints, you need to authenticate:

1. Go to **🔐 Authentication** folder
2. Run **Register User** to create a test account
3. Run **Login User** to get authentication tokens
4. Tokens will be automatically saved to environment variables

## Collection Structure

### 🔐 Authentication (35 endpoints)
- User registration and login
- Phone authentication with OTP
- Password reset and change
- Email/phone verification
- Social authentication (Google, Facebook)
- Token refresh and session management

### 👤 User Management (25 endpoints)
- Profile management
- Account settings
- Subscription management
- Activity tracking
- Privacy settings

### 🔬 Disease Diagnosis (30 endpoints)
- AI-powered plant disease detection
- Image upload and analysis
- Diagnosis history
- Expert consultations
- Accuracy feedback

### 🌾 Crops Database (20 endpoints)
- Comprehensive crop information
- Search and filtering
- Seasonal recommendations
- Growth tracking
- Category management

### 🦠 Diseases Database (25 endpoints)
- Disease information and symptoms
- Treatment recommendations
- Prevention guidelines
- Severity assessment
- Regional disease tracking

### 🌤️ Weather Integration (15 endpoints)
- Current weather conditions
- Weather forecasts
- Agricultural advisories
- Climate data
- Location-based weather

### 👥 Community Features (40 endpoints)
- Discussion forums
- Post creation and management
- Comments and reactions
- Content moderation
- User interactions

### 💰 Market Prices (25 endpoints)
- Real-time crop prices
- Market trends
- Price alerts
- Regional market data
- Historical pricing

### 👨‍🌾 Expert Consultations (35 endpoints)
- Expert profiles and ratings
- Consultation booking
- Real-time messaging
- Expert recommendations
- Payment processing

### 🔔 Notifications (45 endpoints)
- Push notifications
- Email notifications
- SMS notifications
- In-app notifications
- Notification preferences

### 🌍 Internationalization (50 endpoints)
- Multi-language support (EN, ES, FR, PT, HI, BN, ID, VI)
- Translation management
- Localization preferences
- Content localization
- Translator tools

### ⚙️ Admin Panel (120+ endpoints)
- User management
- Content moderation
- System analytics
- Configuration management
- Security monitoring

## Authentication Levels

### Public Endpoints
- No authentication required
- Available to all users

### User Endpoints
- Require user authentication
- Use `Authorization: Bearer {{access_token}}`

### Expert Endpoints
- Require expert role
- Additional role-based permissions

### Admin Endpoints
- Require admin/super_admin roles
- Full system access

## Sample Data

The collection includes realistic sample data for:
- User profiles (farmers, experts, buyers)
- Crop information (rice, wheat, tomato, etc.)
- Disease data (bacterial blight, leaf spot, etc.)
- Weather data (temperature, humidity, rainfall)
- Market prices (regional variations)
- Consultation requests
- Community posts and comments

## Testing Workflows

### Basic User Journey
1. **Register** → **Login** → **Get Profile**
2. **Upload Plant Image** → **Get Diagnosis** → **View Results**
3. **Search Crops** → **Get Weather** → **View Recommendations**

### Expert Workflow
1. **Login as Expert** → **Get Consultations** → **Respond to Users**
2. **Update Expertise** → **Manage Availability** → **Process Payments**

### Admin Workflow
1. **Login as Admin** → **View Dashboard** → **Manage Users**
2. **Monitor System** → **Generate Reports** → **Configure Settings**

## Environment Variables

Key variables automatically managed:
- `access_token` - JWT access token
- `refresh_token` - JWT refresh token
- `user_id` - Current user ID
- `expert_id` - Expert user ID
- `device_token` - Push notification token

## Rate Limiting

Be aware of rate limits:
- Authentication: 5-10 requests per 15 minutes
- General API: 100-1000 requests per 15 minutes
- Admin operations: Higher limits

## Error Handling

All endpoints return standardized error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## Support

For issues or questions:
1. Check API server logs
2. Verify environment variables
3. Confirm authentication tokens
4. Review rate limiting

## Version Information

- Collection Version: 1.0.0
- API Version: Compatible with Node.js 18.x
- Last Updated: 2024-01-15

Happy Testing! 🚀