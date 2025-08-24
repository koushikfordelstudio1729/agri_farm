# Google Sign-In Setup Guide

This guide will help you configure Google OAuth for your authentication system.

## 🚀 Quick Setup

### 1. Google Cloud Console Setup

1. **Go to Google Cloud Console**: Visit [console.cloud.google.com](https://console.cloud.google.com/)
2. **Create/Select Project**: Create a new project or select an existing one
3. **Enable Google+ API**: Go to APIs & Services → Library → Search for "Google+ API" → Enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized origins: `http://localhost:3002` (for development)
   - Add authorized redirect URIs: `http://localhost:3002/api/v1/auth/google/callback`

### 2. Get Your Credentials

After creating OAuth credentials, you'll get:
- **Client ID**: Something like `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdefghijklmnop`

### 3. Update Environment Variables

Replace these values in your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3002/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

## 📋 Available Google Sign-In Endpoints

### 1. **Web OAuth Flow (Redirect-based)**
- **Initiate Google Sign-In**: `GET /api/v1/auth/google`
  - Redirects user to Google consent screen
  - User grants permission and gets redirected back

- **Google Callback**: `GET /api/v1/auth/google/callback` 
  - Handled automatically by Passport
  - Redirects to your frontend with success/error

### 2. **Mobile Sign-In (Token-based)**
- **Mobile Google Sign-In**: `POST /api/v1/auth/google/mobile`
  ```json
  {
    "idToken": "google_id_token_from_mobile_app",
    "rememberMe": false
  }
  ```

## 🧪 Testing Google Sign-In

### Web Flow Test:
1. Navigate to: `http://localhost:3002/api/v1/auth/google`
2. You'll be redirected to Google's consent screen
3. Grant permissions
4. You'll be redirected back to your frontend with authentication tokens

### Mobile Flow Test:
```bash
curl -X POST http://localhost:3002/api/v1/auth/google/mobile \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "your_google_id_token_here",
    "rememberMe": false
  }'
```

## 🔧 Frontend Integration

### Web Integration (HTML/JavaScript):
```html
<a href="/api/v1/auth/google" class="btn btn-google">
  Sign in with Google
</a>
```

### React Integration:
```jsx
const handleGoogleSignIn = () => {
  window.location.href = '/api/v1/auth/google';
};

return (
  <button onClick={handleGoogleSignIn}>
    Sign in with Google
  </button>
);
```

### Mobile Integration (React Native):
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const signInWithGoogle = async () => {
  try {
    const { idToken } = await GoogleSignin.signIn();
    
    const response = await fetch('/api/v1/auth/google/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, rememberMe: false })
    });
    
    const result = await response.json();
    // Handle authentication result
  } catch (error) {
    console.error(error);
  }
};
```

## 🌐 Authentication Flow

### Web Flow:
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User grants permissions
4. Google redirects back to `/api/v1/auth/google/callback`
5. Server processes the auth and redirects to frontend with result
6. Frontend handles the result (success or error)

### Mobile Flow:
1. Mobile app requests Google Sign-In using native SDK
2. Google returns ID token to mobile app
3. Mobile app sends ID token to `/api/v1/auth/google/mobile`
4. Server verifies token and returns authentication result
5. Mobile app handles the result

## 🛡️ Security Features

- **Email Verification**: Google emails are automatically marked as verified
- **Account Linking**: Links Google account to existing users with same email
- **Secure Tokens**: Uses HTTP-only cookies for web sessions
- **Token Verification**: Mobile ID tokens are cryptographically verified
- **Error Handling**: Graceful fallbacks for authentication errors

## 🔄 User Account Management

### New User Registration:
- Creates new account with Google profile data
- Email automatically verified
- Default role: "farmer"
- Automatic consent tracking

### Existing User Login:
- Links Google account to existing user
- Updates profile with Google data
- Maintains existing user preferences

## ⚙️ Configuration Options

### Environment Variables:
```env
# Required
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Optional (with defaults)
GOOGLE_CALLBACK_URL=http://localhost:3002/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

## 🚨 Production Considerations

### 1. **Update Authorized Origins**:
```
Production origins: https://yourdomain.com
Production callback: https://yourdomain.com/api/v1/auth/google/callback
```

### 2. **Environment Variables**:
- Use separate Google projects for dev/staging/prod
- Store secrets securely (e.g., AWS Secrets Manager, Azure Key Vault)
- Never commit real credentials to version control

### 3. **Domain Verification**:
- Verify your domain in Google Cloud Console
- Add your production domain to authorized origins

### 4. **Security Headers**:
- Enable HTTPS in production
- Configure proper CORS settings
- Use secure cookie settings

## 📊 Response Examples

### Successful Web Authentication:
Redirects to: `http://localhost:3000/auth/callback?success=true&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Successful Mobile Authentication:
```json
{
  "success": true,
  "message": "Google Sign-In successful",
  "data": {
    "user": {
      "id": "64abc123def456789",
      "email": "user@gmail.com",
      "firstName": "John",
      "lastName": "Doe",
      "profileImage": "https://lh3.googleusercontent.com/...",
      "isEmailVerified": true,
      "role": "farmer"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Invalid Google ID token",
  "error": "ValidationError"
}
```

## 🎯 Ready-to-Use Implementation

Your Google Sign-In is now fully implemented with:

✅ **Web OAuth flow** with automatic redirects  
✅ **Mobile token verification** for native apps  
✅ **Account creation** and linking  
✅ **Secure session management**  
✅ **Error handling** and validation  
✅ **Production-ready** configuration  

**Just add your Google OAuth credentials to start using it!** 🚀

## 📞 Support

- **Google OAuth Issues**: [Google OAuth Troubleshooting](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)
- **Implementation Questions**: Check the authentication controller and routes for detailed implementation