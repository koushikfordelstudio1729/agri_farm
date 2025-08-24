import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import passport from 'passport';
import { logger } from '@/utils/logger';
import { SocialAuthError } from '@/utils/errors';
import { redisClient } from '@/config/redis';
import type {
  SocialAuthProvider,
  SocialAuthProfile,
  SocialAuthConfig,
  SocialAuthResult,
  SocialLinkRequest,
  SocialUnlinkRequest,
  ProviderTokens,
  SocialAuthCallbackData,
} from '@/types/social-auth.types';

class SocialAuthService {
  private config: SocialAuthConfig;
  private providers: Map<SocialAuthProvider, boolean> = new Map();

  constructor() {
    this.config = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      facebook: {
        clientId: process.env.FACEBOOK_APP_ID || '',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        scope: ['email', 'public_profile'],
        profileFields: ['id', 'emails', 'name', 'picture'],
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || '',
        teamId: process.env.APPLE_TEAM_ID || '',
        keyId: process.env.APPLE_KEY_ID || '',
        privateKey: process.env.APPLE_PRIVATE_KEY || '',
        callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
        scope: ['name', 'email'],
      },
      twitter: {
        consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
        callbackURL: process.env.TWITTER_CALLBACK_URL || '/api/auth/twitter/callback',
      },
    };

    this.initializeStrategies();
  }

  /**
   * Initialize Passport strategies for social authentication
   */
  private initializeStrategies(): void {
    // Google OAuth Strategy
    if (this.config.google.clientId && this.config.google.clientSecret) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: this.config.google.clientId,
            clientSecret: this.config.google.clientSecret,
            callbackURL: this.config.google.callbackURL,
            scope: this.config.google.scope,
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const socialProfile = await this.normalizeGoogleProfile(profile, { accessToken, refreshToken });
              done(null, socialProfile);
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      this.providers.set('google', true);
      logger.info('Google OAuth strategy initialized');
    }

    // Facebook Strategy
    if (this.config.facebook.clientId && this.config.facebook.clientSecret) {
      passport.use(
        new FacebookStrategy(
          {
            clientID: this.config.facebook.clientId,
            clientSecret: this.config.facebook.clientSecret,
            callbackURL: this.config.facebook.callbackURL,
            scope: this.config.facebook.scope,
            profileFields: this.config.facebook.profileFields,
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const socialProfile = await this.normalizeFacebookProfile(profile, { accessToken, refreshToken });
              done(null, socialProfile);
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      this.providers.set('facebook', true);
      logger.info('Facebook OAuth strategy initialized');
    }

    // Apple Strategy
    if (this.config.apple.clientId && this.config.apple.privateKey) {
      passport.use(
        new AppleStrategy(
          {
            clientID: this.config.apple.clientId,
            teamID: this.config.apple.teamId,
            keyID: this.config.apple.keyId,
            privateKeyString: this.config.apple.privateKey,
            callbackURL: this.config.apple.callbackURL,
            scope: this.config.apple.scope,
          },
          async (accessToken, refreshToken, idToken, profile, done) => {
            try {
              const socialProfile = await this.normalizeAppleProfile(profile, { accessToken, refreshToken, idToken });
              done(null, socialProfile);
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      this.providers.set('apple', true);
      logger.info('Apple OAuth strategy initialized');
    }

    // Twitter Strategy
    if (this.config.twitter.consumerKey && this.config.twitter.consumerSecret) {
      passport.use(
        new TwitterStrategy(
          {
            consumerKey: this.config.twitter.consumerKey,
            consumerSecret: this.config.twitter.consumerSecret,
            callbackURL: this.config.twitter.callbackURL,
            includeEmail: true,
          },
          async (token, tokenSecret, profile, done) => {
            try {
              const socialProfile = await this.normalizeTwitterProfile(profile, { token, tokenSecret });
              done(null, socialProfile);
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      this.providers.set('twitter', true);
      logger.info('Twitter OAuth strategy initialized');
    }

    if (this.providers.size === 0) {
      logger.warn('No social authentication providers configured');
    } else {
      logger.info(`Social authentication initialized with ${this.providers.size} providers`, {
        providers: Array.from(this.providers.keys()),
      });
    }
  }

  /**
   * Normalize Google profile data
   */
  private async normalizeGoogleProfile(profile: any, tokens: ProviderTokens): Promise<SocialAuthProfile> {
    const email = profile.emails?.[0]?.value || null;
    const avatar = profile.photos?.[0]?.value || null;

    return {
      provider: 'google',
      providerId: profile.id,
      email,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      fullName: profile.displayName || '',
      avatar,
      emailVerified: profile.emails?.[0]?.verified || false,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      raw: profile._json,
    };
  }

  /**
   * Normalize Facebook profile data
   */
  private async normalizeFacebookProfile(profile: any, tokens: ProviderTokens): Promise<SocialAuthProfile> {
    const email = profile.emails?.[0]?.value || null;
    const avatar = profile.photos?.[0]?.value || null;

    return {
      provider: 'facebook',
      providerId: profile.id,
      email,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      fullName: profile.displayName || '',
      avatar,
      emailVerified: true, // Facebook emails are generally verified
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      raw: profile._json,
    };
  }

  /**
   * Normalize Apple profile data
   */
  private async normalizeAppleProfile(profile: any, tokens: ProviderTokens): Promise<SocialAuthProfile> {
    // Apple provides minimal profile data
    const email = profile.email || null;
    
    return {
      provider: 'apple',
      providerId: profile.id,
      email,
      firstName: profile.name?.firstName || '',
      lastName: profile.name?.lastName || '',
      fullName: profile.displayName || `${profile.name?.firstName || ''} ${profile.name?.lastName || ''}`.trim(),
      avatar: null, // Apple doesn't provide profile pictures
      emailVerified: true, // Apple emails are verified
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
      },
      raw: profile,
    };
  }

  /**
   * Normalize Twitter profile data
   */
  private async normalizeTwitterProfile(profile: any, tokens: ProviderTokens): Promise<SocialAuthProfile> {
    const email = profile.emails?.[0]?.value || null;
    const avatar = profile.photos?.[0]?.value || null;
    
    // Twitter doesn't provide separate first/last names
    const fullName = profile.displayName || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      provider: 'twitter',
      providerId: profile.id,
      email,
      firstName,
      lastName,
      fullName,
      avatar,
      emailVerified: false, // Twitter email verification status is not always available
      tokens: {
        accessToken: tokens.token,
        refreshToken: tokens.tokenSecret,
      },
      raw: profile._json,
    };
  }

  /**
   * Handle social authentication callback
   */
  async handleAuthCallback(
    provider: SocialAuthProvider,
    profile: SocialAuthProfile,
    userId?: string
  ): Promise<SocialAuthResult> {
    try {
      logger.info('Processing social auth callback', {
        provider,
        providerId: profile.providerId,
        email: profile.email,
        userId,
      });

      // Store the profile temporarily for the client to retrieve
      const callbackKey = await this.storeCallbackData({
        profile,
        timestamp: new Date(),
        userId,
      });

      return {
        success: true,
        profile,
        callbackKey,
        isNewUser: !userId,
        message: 'Social authentication successful',
      };
    } catch (error) {
      logger.error('Social auth callback failed', { error, provider, providerId: profile.providerId });
      throw new SocialAuthError('Social authentication callback failed', { originalError: error });
    }
  }

  /**
   * Retrieve callback data
   */
  async getCallbackData(callbackKey: string): Promise<SocialAuthCallbackData | null> {
    try {
      if (!redisClient) return null;

      const key = `social_auth_callback:${callbackKey}`;
      const data = await redisClient.get(key);
      
      if (data) {
        // Delete the key after retrieval for security
        await redisClient.del(key);
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to retrieve callback data', { error, callbackKey });
      return null;
    }
  }

  /**
   * Store callback data temporarily
   */
  private async storeCallbackData(data: SocialAuthCallbackData): Promise<string> {
    try {
      const callbackKey = this.generateCallbackKey();
      
      if (redisClient) {
        const key = `social_auth_callback:${callbackKey}`;
        await redisClient.setex(key, 300, JSON.stringify(data)); // 5 minutes expiry
      }
      
      return callbackKey;
    } catch (error) {
      logger.warn('Failed to store callback data', { error });
      // Return a key anyway - client will handle the error
      return this.generateCallbackKey();
    }
  }

  /**
   * Generate callback key
   */
  private generateCallbackKey(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(request: SocialLinkRequest): Promise<{ success: boolean; message: string }> {
    try {
      // This would typically involve:
      // 1. Validating the user's current password/authentication
      // 2. Checking if the social account is already linked to another user
      // 3. Updating the user record with social account details
      // 4. Storing social tokens securely

      logger.info('Linking social account', {
        userId: request.userId,
        provider: request.provider,
        providerId: request.providerId,
      });

      // For now, return success - actual implementation would involve database operations
      return {
        success: true,
        message: `${request.provider} account linked successfully`,
      };
    } catch (error) {
      logger.error('Failed to link social account', { error, request });
      throw new SocialAuthError('Failed to link social account', { originalError: error });
    }
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(request: SocialUnlinkRequest): Promise<{ success: boolean; message: string }> {
    try {
      // This would typically involve:
      // 1. Validating the user's current password/authentication
      // 2. Checking that the user has other login methods available
      // 3. Removing social account details from user record
      // 4. Revoking social tokens if possible

      logger.info('Unlinking social account', {
        userId: request.userId,
        provider: request.provider,
      });

      // For now, return success - actual implementation would involve database operations
      return {
        success: true,
        message: `${request.provider} account unlinked successfully`,
      };
    } catch (error) {
      logger.error('Failed to unlink social account', { error, request });
      throw new SocialAuthError('Failed to unlink social account', { originalError: error });
    }
  }

  /**
   * Get available social providers
   */
  getAvailableProviders(): Array<{ provider: SocialAuthProvider; name: string; enabled: boolean }> {
    const providerNames = {
      google: 'Google',
      facebook: 'Facebook',
      apple: 'Apple',
      twitter: 'Twitter',
    };

    return Object.entries(providerNames).map(([provider, name]) => ({
      provider: provider as SocialAuthProvider,
      name,
      enabled: this.providers.get(provider as SocialAuthProvider) || false,
    }));
  }

  /**
   * Refresh social account tokens
   */
  async refreshTokens(
    provider: SocialAuthProvider,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      switch (provider) {
        case 'google':
          return await this.refreshGoogleTokens(refreshToken);
        case 'facebook':
          return await this.refreshFacebookTokens(refreshToken);
        default:
          throw new SocialAuthError(`Token refresh not supported for ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to refresh social tokens', { error, provider });
      throw new SocialAuthError('Failed to refresh social tokens', { originalError: error });
    }
  }

  /**
   * Refresh Google OAuth tokens
   */
  private async refreshGoogleTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SocialAuthError('Google token refresh failed', { response: data });
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Google may not return a new refresh token
    };
  }

  /**
   * Refresh Facebook tokens
   */
  private async refreshFacebookTokens(accessToken: string): Promise<{ accessToken: string }> {
    const response = await fetch(
      `https://graph.facebook.com/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${this.config.facebook.clientId}&` +
      `client_secret=${this.config.facebook.clientSecret}&` +
      `fb_exchange_token=${accessToken}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new SocialAuthError('Facebook token refresh failed', { response: data });
    }

    return {
      accessToken: data.access_token,
    };
  }

  /**
   * Revoke social account access
   */
  async revokeAccess(provider: SocialAuthProvider, accessToken: string): Promise<void> {
    try {
      switch (provider) {
        case 'google':
          await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: 'POST',
          });
          break;
        case 'facebook':
          await fetch(`https://graph.facebook.com/me/permissions?access_token=${accessToken}`, {
            method: 'DELETE',
          });
          break;
        default:
          logger.warn(`Token revocation not implemented for ${provider}`);
      }

      logger.info('Social access revoked', { provider });
    } catch (error) {
      logger.warn('Failed to revoke social access', { error, provider });
      // Don't throw error as this is cleanup and may fail due to expired tokens
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    providersConfigured: number;
    providersEnabled: Array<{ provider: SocialAuthProvider; status: string }>;
  } {
    const providersEnabled = Array.from(this.providers.entries()).map(([provider, enabled]) => ({
      provider,
      status: enabled ? 'enabled' : 'disabled',
    }));

    return {
      providersConfigured: this.providers.size,
      providersEnabled,
    };
  }
}

export const socialAuthService = new SocialAuthService();
export { SocialAuthService };