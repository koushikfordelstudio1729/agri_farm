import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
}

class SocialAuthService {
  private config: GoogleConfig;
  private isGoogleEnabled: boolean = false;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
      scope: ['profile', 'email'],
    };

    this.initializeGoogleStrategy();
  }

  /**
   * Initialize Google OAuth strategy
   */
  private initializeGoogleStrategy(): void {
    if (this.config.clientId && 
        this.config.clientSecret && 
        !this.config.clientId.includes('your_') &&
        !this.config.clientSecret.includes('your_')) {
      
      passport.use(
        new GoogleStrategy(
          {
            clientID: this.config.clientId,
            clientSecret: this.config.clientSecret,
            callbackURL: this.config.callbackURL,
            scope: this.config.scope,
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              // Return user profile data directly
              done(null, { 
                user: {
                  id: profile.id,
                  email: profile.emails?.[0]?.value,
                  displayName: profile.displayName,
                  name: profile.name,
                  photos: profile.photos
                },
                accessToken, 
                refreshToken 
              });
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      this.isGoogleEnabled = true;
      console.log('Google OAuth strategy initialized');
    } else {
      console.warn('Google OAuth credentials not configured. Google Sign-In will not be available.');
      this.isGoogleEnabled = false;
    }
  }

  /**
   * Check if Google is enabled
   */
  public isEnabled(): boolean {
    return this.isGoogleEnabled;
  }

  /**
   * Get health status
   */
  public getHealthStatus() {
    return {
      google: {
        enabled: this.isGoogleEnabled,
        configured: !!(this.config.clientId && this.config.clientSecret)
      }
    };
  }
}

export const socialAuthService = new SocialAuthService();
export { SocialAuthService };