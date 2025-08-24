import { logger } from '@/utils/logger';
import { PhoneVerificationError } from '@/utils/errors';
import { redisClient } from '@/config/redis';
import { smsService } from './smsService';
import { otpService } from './otpService';
import type {
  PhoneVerificationRequest,
  PhoneVerificationResponse,
  PhoneValidationResult,
  CountryCodeInfo,
  PhoneVerificationStatus,
  VerificationAttempt,
  PhoneVerificationConfig,
} from '@/types/phone.types';

class PhoneVerificationService {
  private config: PhoneVerificationConfig = {
    otpLength: 6,
    otpExpiry: 10 * 60, // 10 minutes
    maxAttempts: 3,
    maxRequestsPerHour: 5,
    cooldownPeriod: 60, // 1 minute between requests
    requireCountryCode: true,
  };

  private countryCodes: Map<string, CountryCodeInfo> = new Map();

  constructor() {
    this.initializeCountryCodes();
  }

  /**
   * Initialize country codes and formats
   */
  private initializeCountryCodes(): void {
    const codes: CountryCodeInfo[] = [
      { country: 'US', code: '+1', name: 'United States', format: '+1 XXX XXX XXXX' },
      { country: 'GB', code: '+44', name: 'United Kingdom', format: '+44 XXXX XXXXXX' },
      { country: 'IN', code: '+91', name: 'India', format: '+91 XXXXX XXXXX' },
      { country: 'CN', code: '+86', name: 'China', format: '+86 XXX XXXX XXXX' },
      { country: 'BR', code: '+55', name: 'Brazil', format: '+55 XX XXXXX XXXX' },
      { country: 'DE', code: '+49', name: 'Germany', format: '+49 XXX XXXXXXXX' },
      { country: 'FR', code: '+33', name: 'France', format: '+33 X XX XX XX XX' },
      { country: 'JP', code: '+81', name: 'Japan', format: '+81 XX XXXX XXXX' },
      { country: 'AU', code: '+61', name: 'Australia', format: '+61 XXX XXX XXX' },
      { country: 'CA', code: '+1', name: 'Canada', format: '+1 XXX XXX XXXX' },
      { country: 'MX', code: '+52', name: 'Mexico', format: '+52 XXX XXX XXXX' },
      { country: 'AR', code: '+54', name: 'Argentina', format: '+54 XX XXXX XXXX' },
      { country: 'ZA', code: '+27', name: 'South Africa', format: '+27 XX XXX XXXX' },
      { country: 'NG', code: '+234', name: 'Nigeria', format: '+234 XXX XXX XXXX' },
      { country: 'KE', code: '+254', name: 'Kenya', format: '+254 XXX XXXXXX' },
      { country: 'ET', code: '+251', name: 'Ethiopia', format: '+251 XX XXX XXXX' },
      { country: 'EG', code: '+20', name: 'Egypt', format: '+20 XX XXX XXXX' },
      { country: 'ID', code: '+62', name: 'Indonesia', format: '+62 XXX XXXX XXXX' },
      { country: 'TH', code: '+66', name: 'Thailand', format: '+66 XX XXX XXXX' },
      { country: 'VN', code: '+84', name: 'Vietnam', format: '+84 XX XXXX XXXX' },
      { country: 'BD', code: '+880', name: 'Bangladesh', format: '+880 XXXX XXXXXX' },
      { country: 'PK', code: '+92', name: 'Pakistan', format: '+92 XXX XXXXXXX' },
      { country: 'PH', code: '+63', name: 'Philippines', format: '+63 XXX XXX XXXX' },
    ];

    codes.forEach(info => {
      this.countryCodes.set(info.country, info);
    });

    logger.info('Phone verification service initialized', {
      supportedCountries: codes.length,
    });
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string, countryCode?: string): PhoneValidationResult {
    try {
      // Remove all non-digit characters except +
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Check if number starts with +
      if (!cleanNumber.startsWith('+')) {
        return {
          isValid: false,
          error: 'Phone number must include country code (e.g., +1234567890)',
          formatted: null,
          countryInfo: null,
        };
      }

      // Find matching country code
      let matchedCountry: CountryCodeInfo | null = null;
      
      for (const [, info] of this.countryCodes) {
        if (cleanNumber.startsWith(info.code)) {
          matchedCountry = info;
          break;
        }
      }

      if (!matchedCountry) {
        return {
          isValid: false,
          error: 'Unsupported country code',
          formatted: null,
          countryInfo: null,
        };
      }

      // Validate length (basic validation)
      const numberWithoutCode = cleanNumber.substring(matchedCountry.code.length);
      
      if (numberWithoutCode.length < 7 || numberWithoutCode.length > 15) {
        return {
          isValid: false,
          error: 'Invalid phone number length',
          formatted: null,
          countryInfo: matchedCountry,
        };
      }

      // Format the number
      const formatted = this.formatPhoneNumber(cleanNumber, matchedCountry);

      return {
        isValid: true,
        error: null,
        formatted: cleanNumber,
        displayFormatted: formatted,
        countryInfo: matchedCountry,
      };
    } catch (error) {
      logger.error('Phone number validation error', { error, phoneNumber });
      
      return {
        isValid: false,
        error: 'Phone number validation failed',
        formatted: null,
        countryInfo: null,
      };
    }
  }

  /**
   * Format phone number for display
   */
  private formatPhoneNumber(phoneNumber: string, countryInfo: CountryCodeInfo): string {
    // Basic formatting - can be enhanced with more sophisticated formatting rules
    const numberPart = phoneNumber.substring(countryInfo.code.length);
    
    switch (countryInfo.country) {
      case 'US':
      case 'CA':
        if (numberPart.length === 10) {
          return `${countryInfo.code} (${numberPart.substring(0, 3)}) ${numberPart.substring(3, 6)}-${numberPart.substring(6)}`;
        }
        break;
      case 'IN':
        if (numberPart.length === 10) {
          return `${countryInfo.code} ${numberPart.substring(0, 5)} ${numberPart.substring(5)}`;
        }
        break;
      default:
        // Generic formatting
        if (numberPart.length >= 7) {
          const groups = numberPart.match(/.{1,3}/g) || [];
          return `${countryInfo.code} ${groups.join(' ')}`;
        }
    }

    return `${countryInfo.code} ${numberPart}`;
  }

  /**
   * Start phone verification process
   */
  async startVerification(request: PhoneVerificationRequest): Promise<PhoneVerificationResponse> {
    try {
      // Validate phone number
      const validation = this.validatePhoneNumber(request.phoneNumber);
      if (!validation.isValid) {
        throw new PhoneVerificationError(validation.error || 'Invalid phone number');
      }

      const phoneNumber = validation.formatted!;

      // Check rate limiting
      await this.checkRateLimit(phoneNumber, request.userId);

      // Generate verification code
      const verificationCode = await otpService.generateOTP({
        identifier: phoneNumber,
        purpose: 'phone_verification',
        length: this.config.otpLength,
        expiryMinutes: this.config.otpExpiry / 60,
        userId: request.userId,
      });

      // Send SMS
      const smsResult = await smsService.sendSMS({
        phoneNumber,
        message: this.createVerificationMessage(verificationCode.code, request.language || 'en'),
        templateId: 'phone_verification',
        variables: {
          code: verificationCode.code,
          appName: process.env.APP_NAME || 'Agri Farm',
        },
      });

      // Store verification attempt
      await this.storeVerificationAttempt({
        phoneNumber,
        userId: request.userId,
        otpId: verificationCode.id,
        smsId: smsResult.messageId,
        status: 'sent',
        createdAt: new Date(),
      });

      logger.info('Phone verification started', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        userId: request.userId,
        country: validation.countryInfo?.country,
      });

      return {
        success: true,
        verificationId: verificationCode.id,
        phoneNumber: validation.displayFormatted || phoneNumber,
        expiresAt: verificationCode.expiresAt,
        attemptsRemaining: this.config.maxAttempts,
        nextRetryAt: new Date(Date.now() + this.config.cooldownPeriod * 1000),
      };
    } catch (error) {
      logger.error('Phone verification start failed', { error, request });
      
      if (error instanceof PhoneVerificationError) {
        throw error;
      }
      
      throw new PhoneVerificationError('Failed to start phone verification', { originalError: error });
    }
  }

  /**
   * Verify phone number with code
   */
  async verifyPhone(
    verificationId: string,
    code: string,
    userId?: string
  ): Promise<{ success: boolean; phoneNumber?: string; message: string }> {
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP({
        otpId: verificationId,
        code,
        purpose: 'phone_verification',
        userId,
      });

      if (!otpResult.isValid) {
        // Update verification attempt
        await this.updateVerificationStatus(verificationId, 'failed');
        
        return {
          success: false,
          message: otpResult.error || 'Invalid verification code',
        };
      }

      // Get verification details
      const verification = await this.getVerificationAttempt(verificationId);
      
      if (verification) {
        // Update verification status
        await this.updateVerificationStatus(verificationId, 'verified');
        
        logger.info('Phone verification successful', {
          phoneNumber: this.maskPhoneNumber(verification.phoneNumber),
          userId: verification.userId,
        });

        return {
          success: true,
          phoneNumber: verification.phoneNumber,
          message: 'Phone number verified successfully',
        };
      }

      throw new PhoneVerificationError('Verification record not found');
    } catch (error) {
      logger.error('Phone verification failed', { error, verificationId });
      
      if (error instanceof PhoneVerificationError) {
        throw error;
      }
      
      throw new PhoneVerificationError('Phone verification failed', { originalError: error });
    }
  }

  /**
   * Resend verification code
   */
  async resendVerification(
    verificationId: string,
    userId?: string
  ): Promise<PhoneVerificationResponse> {
    try {
      const verification = await this.getVerificationAttempt(verificationId);
      
      if (!verification) {
        throw new PhoneVerificationError('Verification not found');
      }

      if (verification.status === 'verified') {
        throw new PhoneVerificationError('Phone number already verified');
      }

      // Check cooldown period
      const timeSinceLastAttempt = Date.now() - verification.createdAt.getTime();
      if (timeSinceLastAttempt < this.config.cooldownPeriod * 1000) {
        const waitTime = Math.ceil((this.config.cooldownPeriod * 1000 - timeSinceLastAttempt) / 1000);
        throw new PhoneVerificationError(`Please wait ${waitTime} seconds before requesting a new code`);
      }

      // Check rate limiting
      await this.checkRateLimit(verification.phoneNumber, userId);

      // Generate new verification code
      const verificationCode = await otpService.generateOTP({
        identifier: verification.phoneNumber,
        purpose: 'phone_verification',
        length: this.config.otpLength,
        expiryMinutes: this.config.otpExpiry / 60,
        userId,
      });

      // Send SMS
      const smsResult = await smsService.sendSMS({
        phoneNumber: verification.phoneNumber,
        message: this.createVerificationMessage(verificationCode.code, 'en'),
        templateId: 'phone_verification',
        variables: {
          code: verificationCode.code,
          appName: process.env.APP_NAME || 'Agri Farm',
        },
      });

      // Update verification attempt
      await this.storeVerificationAttempt({
        phoneNumber: verification.phoneNumber,
        userId: userId || verification.userId,
        otpId: verificationCode.id,
        smsId: smsResult.messageId,
        status: 'sent',
        createdAt: new Date(),
      });

      logger.info('Phone verification code resent', {
        phoneNumber: this.maskPhoneNumber(verification.phoneNumber),
        userId: userId || verification.userId,
      });

      return {
        success: true,
        verificationId: verificationCode.id,
        phoneNumber: verification.phoneNumber,
        expiresAt: verificationCode.expiresAt,
        attemptsRemaining: this.config.maxAttempts,
        nextRetryAt: new Date(Date.now() + this.config.cooldownPeriod * 1000),
      };
    } catch (error) {
      logger.error('Failed to resend verification code', { error, verificationId });
      
      if (error instanceof PhoneVerificationError) {
        throw error;
      }
      
      throw new PhoneVerificationError('Failed to resend verification code', { originalError: error });
    }
  }

  /**
   * Check rate limiting for phone number
   */
  private async checkRateLimit(phoneNumber: string, userId?: string): Promise<void> {
    try {
      if (!redisClient) return; // Skip if Redis not available

      const key = `phone_verify_limit:${phoneNumber}`;
      const userKey = userId ? `phone_verify_user_limit:${userId}` : null;
      
      // Check phone number rate limit
      const phoneAttempts = await redisClient.incr(key);
      if (phoneAttempts === 1) {
        await redisClient.expire(key, 60 * 60); // 1 hour
      }
      
      if (phoneAttempts > this.config.maxRequestsPerHour) {
        throw new PhoneVerificationError(
          'Too many verification requests for this phone number. Please try again later.'
        );
      }

      // Check user rate limit if userId provided
      if (userKey) {
        const userAttempts = await redisClient.incr(userKey);
        if (userAttempts === 1) {
          await redisClient.expire(userKey, 60 * 60); // 1 hour
        }
        
        if (userAttempts > this.config.maxRequestsPerHour) {
          throw new PhoneVerificationError(
            'Too many verification requests from this account. Please try again later.'
          );
        }
      }
    } catch (error) {
      if (error instanceof PhoneVerificationError) {
        throw error;
      }
      
      logger.warn('Rate limit check failed', { error, phoneNumber: this.maskPhoneNumber(phoneNumber) });
      // Continue without rate limiting if Redis fails
    }
  }

  /**
   * Store verification attempt in cache
   */
  private async storeVerificationAttempt(attempt: VerificationAttempt): Promise<void> {
    try {
      if (!redisClient) return;

      const key = `phone_verification:${attempt.otpId}`;
      await redisClient.setex(key, this.config.otpExpiry, JSON.stringify(attempt));
    } catch (error) {
      logger.warn('Failed to store verification attempt', { error });
    }
  }

  /**
   * Get verification attempt from cache
   */
  private async getVerificationAttempt(verificationId: string): Promise<VerificationAttempt | null> {
    try {
      if (!redisClient) return null;

      const key = `phone_verification:${verificationId}`;
      const data = await redisClient.get(key);
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Failed to get verification attempt', { error });
      return null;
    }
  }

  /**
   * Update verification status
   */
  private async updateVerificationStatus(
    verificationId: string,
    status: PhoneVerificationStatus
  ): Promise<void> {
    try {
      if (!redisClient) return;

      const attempt = await this.getVerificationAttempt(verificationId);
      if (attempt) {
        attempt.status = status;
        const key = `phone_verification:${verificationId}`;
        await redisClient.setex(key, this.config.otpExpiry, JSON.stringify(attempt));
      }
    } catch (error) {
      logger.warn('Failed to update verification status', { error });
    }
  }

  /**
   * Create verification SMS message
   */
  private createVerificationMessage(code: string, language: string = 'en'): string {
    const messages = {
      en: `Your ${process.env.APP_NAME || 'Agri Farm'} verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`,
      es: `Tu código de verificación de ${process.env.APP_NAME || 'Agri Farm'} es: ${code}. Este código expira en 10 minutos. No compartas este código con nadie.`,
      fr: `Votre code de vérification ${process.env.APP_NAME || 'Agri Farm'} est: ${code}. Ce code expire dans 10 minutes. Ne partagez pas ce code.`,
      pt: `Seu código de verificação do ${process.env.APP_NAME || 'Agri Farm'} é: ${code}. Este código expira em 10 minutos. Não compartilhe este código.`,
      hi: `आपका ${process.env.APP_NAME || 'Agri Farm'} सत्यापन कोड है: ${code}. यह कोड 10 मिनट में समाप्त हो जाएगा। इस कोड को किसी के साथ साझा न करें।`,
      bn: `আপনার ${process.env.APP_NAME || 'Agri Farm'} যাচাইকরণ কোড: ${code}। এই কোডটি ১০ মিনিটে মেয়াদ শেষ হবে। এই কোডটি কারো সাথে শেয়ার করবেন না।`,
    };

    return messages[language as keyof typeof messages] || messages.en;
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    
    const visibleStart = phoneNumber.substring(0, 4);
    const visibleEnd = phoneNumber.substring(phoneNumber.length - 2);
    const maskedMiddle = '*'.repeat(phoneNumber.length - 6);
    
    return `${visibleStart}${maskedMiddle}${visibleEnd}`;
  }

  /**
   * Get supported country codes
   */
  getSupportedCountryCodes(): CountryCodeInfo[] {
    return Array.from(this.countryCodes.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<PhoneVerificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Phone verification service configuration updated', { config: this.config });
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(): Promise<{
    supportedCountries: number;
    configuraiton: PhoneVerificationConfig;
  }> {
    return {
      supportedCountries: this.countryCodes.size,
      configuraiton: this.config,
    };
  }
}

export const phoneVerificationService = new PhoneVerificationService();
export { PhoneVerificationService };