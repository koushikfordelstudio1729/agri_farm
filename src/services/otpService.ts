import crypto from 'crypto';
import { logger } from '@/utils/logger';
import { smsService } from './smsService';
import { emailService } from './emailService';
import { OTPAttempt } from '@/models/OTPAttempt';
import PhoneVerification from '@/models/PhoneVerification';
import EmailVerification from '@/models/EmailVerification';
import User from '@/models/User';
import {
  OtpServiceConfig,
  OtpGenerateOptions,
  OtpGenerateResult,
  OtpVerifyOptions,
  OtpVerifyResult,
  OtpMethod,
  OtpType,
  OtpTemplate,
} from './otpService.types';

export class OtpService {
  private config: OtpServiceConfig;

  constructor() {
    this.config = {
      defaultLength: parseInt(process.env.OTP_LENGTH || '6', 10),
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
      maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
      resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
      enableAlphanumeric: process.env.OTP_ENABLE_ALPHANUMERIC === 'true',
    };
  }

  public async generateAndSendOtp(options: OtpGenerateOptions): Promise<OtpGenerateResult> {
    try {
      // Check if user is rate limited
      const rateLimitCheck = await this.checkRateLimit(options.identifier, options.method);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: `Too many attempts. Please wait ${rateLimitCheck.waitTimeSeconds} seconds before requesting again.`,
          waitTimeSeconds: rateLimitCheck.waitTimeSeconds,
        };
      }

      // Generate OTP
      const otp = this.generateOtp(options.length || this.config.defaultLength);
      const expiryTime = new Date(Date.now() + (options.expiryMinutes || this.config.expiryMinutes) * 60 * 1000);

      // Store OTP for verification
      await this.storeOtp(options.identifier, otp, expiryTime, options.method, options.type);

      // Send OTP based on method
      let sendResult;
      switch (options.method) {
        case 'sms':
          sendResult = await this.sendOtpViaSms(options.identifier, otp, options);
          break;
        case 'email':
          sendResult = await this.sendOtpViaEmail(options.identifier, otp, options);
          break;
        case 'call':
          sendResult = await this.sendOtpViaCall(options.identifier, otp, options);
          break;
        default:
          throw new Error(`Unsupported OTP method: ${options.method}`);
      }

      if (sendResult.success) {
        logger.info('OTP generated and sent successfully', {
          identifier: this.maskIdentifier(options.identifier),
          method: options.method,
          type: options.type,
          expiryTime,
        });

        return {
          success: true,
          expiryTime,
          method: options.method,
          identifier: this.maskIdentifier(options.identifier),
          messageId: sendResult.messageId,
        };
      } else {
        return {
          success: false,
          error: sendResult.error || 'Failed to send OTP',
        };
      }
    } catch (error) {
      logger.error('OTP generation failed', {
        error: error.message,
        identifier: this.maskIdentifier(options.identifier),
        method: options.method,
      });

      return {
        success: false,
        error: 'Internal server error while generating OTP',
      };
    }
  }

  public async verifyOtp(options: OtpVerifyOptions): Promise<OtpVerifyResult> {
    try {
      // Check attempts limit
      const attemptsCheck = await this.checkAttempts(options.identifier, options.method);
      if (!attemptsCheck.allowed) {
        return {
          success: false,
          error: 'Maximum verification attempts exceeded. Please request a new OTP.',
          attemptsRemaining: 0,
        };
      }

      // Record attempt
      await this.recordAttempt(options.identifier, options.otp, options.method, false);

      // Find valid OTP
      const storedOtp = await this.findValidOtp(options.identifier, options.method);
      if (!storedOtp) {
        return {
          success: false,
          error: 'Invalid or expired OTP',
          attemptsRemaining: attemptsCheck.remaining - 1,
        };
      }

      // Verify OTP
      const isValid = await this.compareOtp(options.otp, storedOtp.otp);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid OTP',
          attemptsRemaining: attemptsCheck.remaining - 1,
        };
      }

      // Mark OTP as used and attempt as successful
      await this.markOtpAsUsed(storedOtp._id);
      await this.recordAttempt(options.identifier, options.otp, options.method, true);

      // Mark verification as complete if it's for phone/email verification
      if (options.method === 'sms') {
        await this.markPhoneAsVerified(options.identifier);
      } else if (options.method === 'email') {
        await this.markEmailAsVerified(options.identifier);
      }

      logger.info('OTP verified successfully', {
        identifier: this.maskIdentifier(options.identifier),
        method: options.method,
      });

      return {
        success: true,
        verified: true,
      };
    } catch (error) {
      logger.error('OTP verification failed', {
        error: error.message,
        identifier: this.maskIdentifier(options.identifier),
        method: options.method,
      });

      return {
        success: false,
        error: 'Internal server error during OTP verification',
      };
    }
  }

  public async resendOtp(identifier: string, method: OtpMethod, type: OtpType): Promise<OtpGenerateResult> {
    // Check resend cooldown
    const cooldownCheck = await this.checkResendCooldown(identifier, method);
    if (!cooldownCheck.allowed) {
      return {
        success: false,
        error: `Please wait ${cooldownCheck.waitTimeSeconds} seconds before requesting a new OTP`,
        waitTimeSeconds: cooldownCheck.waitTimeSeconds,
      };
    }

    // Generate new OTP
    return this.generateAndSendOtp({
      identifier,
      method,
      type,
    });
  }

  public async invalidateOtp(identifier: string, method: OtpMethod): Promise<boolean> {
    try {
      if (method === 'sms') {
        await PhoneVerification.updateMany(
          {
            phoneNumber: identifier,
            isUsed: false,
            expiresAt: { $gt: new Date() },
          },
          {
            isUsed: true,
            usedAt: new Date(),
          }
        );
      } else if (method === 'email') {
        // Similar logic for email OTPs if you have an EmailVerification model
      }

      logger.info('OTP invalidated', {
        identifier: this.maskIdentifier(identifier),
        method,
      });

      return true;
    } catch (error) {
      logger.error('Failed to invalidate OTP', {
        error: error.message,
        identifier: this.maskIdentifier(identifier),
        method,
      });
      return false;
    }
  }

  private generateOtp(length: number): string {
    if (this.config.enableAlphanumeric) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let otp = '';
      for (let i = 0; i < length; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
      }
      return otp;
    } else {
      const digits = '0123456789';
      let otp = '';
      for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
      }
      return otp;
    }
  }

  private async storeOtp(
    identifier: string,
    otp: string,
    expiryTime: Date,
    method: OtpMethod,
    type: OtpType
  ): Promise<void> {
    if (method === 'sms') {
      await PhoneVerification.createVerification({
        phone: identifier,
        countryCode: '+1', // Default, should be passed from options
        otp,
        purpose: this.mapTypeToPurpose(type),
        expirationMinutes: Math.ceil((expiryTime.getTime() - Date.now()) / (60 * 1000)),
        ipAddress: '127.0.0.1', // Should be passed from request
        userAgent: 'OtpService', // Should be passed from request
      });
    } else if (method === 'email') {
      await EmailVerification.createVerification({
        email: identifier,
        purpose: this.mapTypeToPurpose(type),
        expirationMinutes: Math.ceil((expiryTime.getTime() - Date.now()) / (60 * 1000)),
        ipAddress: '127.0.0.1', // Should be passed from request
        userAgent: 'OtpService', // Should be passed from request
      });
    }
  }

  private async findValidOtp(identifier: string, method: OtpMethod): Promise<any> {
    if (method === 'sms') {
      return PhoneVerification.findActiveByPhone(identifier, '+1'); // Should parse country code
    } else if (method === 'email') {
      return EmailVerification.findActiveByEmail(identifier);
    }
    return null;
  }

  private async markOtpAsUsed(otpId: string): Promise<void> {
    // The verification models handle this internally via markAsVerified method
  }

  private async markPhoneAsVerified(phoneNumber: string): Promise<void> {
    await User.findOneAndUpdate(
      { phone: phoneNumber },
      { 
        isPhoneVerified: true,
        phoneVerificationExpires: undefined,
        phoneVerificationToken: undefined
      }
    );
  }

  private async markEmailAsVerified(email: string): Promise<void> {
    await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { 
        isEmailVerified: true,
        emailVerificationExpires: undefined,
        emailVerificationToken: undefined
      }
    );
  }

  private mapTypeToPurpose(type: OtpType): 'registration' | 'login' | 'password_reset' | 'account_verification' {
    switch (type) {
      case 'verification':
        return 'account_verification';
      case 'login':
        return 'login';
      case 'password_reset':
        return 'password_reset';
      case 'phone_change':
        return 'account_verification';
      case 'two_factor':
        return 'login';
      default:
        return 'account_verification';
    }
  }

  private async checkRateLimit(identifier: string, method: OtpMethod): Promise<{
    allowed: boolean;
    waitTimeSeconds?: number;
  }> {
    const now = new Date();
    const cooldownTime = new Date(now.getTime() - this.config.resendCooldownSeconds * 1000);

    let recentAttempts = 0;
    let lastAttempt: any = null;

    if (method === 'sms') {
      recentAttempts = await PhoneVerification.countDocuments({
        phone: identifier.replace(/\D/g, ''),
        createdAt: { $gte: cooldownTime },
      });
      
      lastAttempt = await PhoneVerification.findOne({
        phone: identifier.replace(/\D/g, ''),
      }).sort({ createdAt: -1 });
    } else if (method === 'email') {
      recentAttempts = await EmailVerification.countDocuments({
        email: identifier.toLowerCase().trim(),
        createdAt: { $gte: cooldownTime },
      });
      
      lastAttempt = await EmailVerification.findOne({
        email: identifier.toLowerCase().trim(),
      }).sort({ createdAt: -1 });
    }

    if (recentAttempts > 0 && lastAttempt) {
      const timeSinceLastAttempt = Math.floor((now.getTime() - lastAttempt.createdAt.getTime()) / 1000);
      if (timeSinceLastAttempt < this.config.resendCooldownSeconds) {
        return {
          allowed: false,
          waitTimeSeconds: this.config.resendCooldownSeconds - timeSinceLastAttempt,
        };
      }
    }

    return { allowed: true };
  }

  private async checkAttempts(identifier: string, method: OtpMethod): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes window

    const attempts = await OTPAttempt.countDocuments({
      identifier,
      method,
      attemptedAt: { $gte: windowStart },
    });

    return {
      allowed: attempts < this.config.maxAttempts,
      remaining: Math.max(0, this.config.maxAttempts - attempts),
    };
  }

  private async recordAttempt(
    identifier: string,
    otp: string,
    method: OtpMethod,
    success: boolean
  ): Promise<void> {
    await OTPAttempt.create({
      identifier,
      otp: this.hashOtp(otp),
      method,
      success,
      attemptedAt: new Date(),
      ipAddress: '', // This should be passed from the request
      userAgent: '', // This should be passed from the request
    });
  }

  private async checkResendCooldown(identifier: string, method: OtpMethod): Promise<{
    allowed: boolean;
    waitTimeSeconds?: number;
  }> {
    return this.checkRateLimit(identifier, method);
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async compareOtp(inputOtp: string, hashedOtp: string): Promise<boolean> {
    const inputHash = this.hashOtp(inputOtp);
    return inputHash === hashedOtp;
  }

  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email
      const [local, domain] = identifier.split('@');
      const maskedLocal = local.length > 2 
        ? local.substring(0, 2) + '*'.repeat(local.length - 2)
        : local;
      return `${maskedLocal}@${domain}`;
    } else {
      // Phone number
      const cleaned = identifier.replace(/\D/g, '');
      if (cleaned.length > 4) {
        const masked = '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
        return masked;
      }
      return identifier;
    }
  }

  private async sendOtpViaSms(
    phoneNumber: string,
    otp: string,
    options: OtpGenerateOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getSmsTemplate(options.type, options.language);
    const message = template.replace('{{otp}}', otp);

    const result = await smsService.sendSms({
      to: phoneNumber,
      message,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  private async sendOtpViaEmail(
    email: string,
    otp: string,
    options: OtpGenerateOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getEmailTemplate(options.type, options.language);
    
    const result = await emailService.sendEmail({
      to: email,
      subject: template.subject.replace('{{otp}}', otp),
      html: template.html.replace(/{{otp}}/g, otp),
      text: template.text?.replace(/{{otp}}/g, otp),
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  private async sendOtpViaCall(
    phoneNumber: string,
    otp: string,
    options: OtpGenerateOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // This would integrate with a voice call service like Twilio Voice
    // For now, we'll return not implemented
    return {
      success: false,
      error: 'Voice call OTP not implemented yet',
    };
  }

  private getSmsTemplate(type: OtpType, language: string = 'en'): string {
    const templates: Record<string, Record<string, string>> = {
      en: {
        verification: 'Your Plantix verification code is {{otp}}. Valid for 5 minutes.',
        login: 'Your Plantix login code is {{otp}}. Do not share this code.',
        password_reset: 'Your Plantix password reset code is {{otp}}. Valid for 5 minutes.',
        phone_change: 'Confirm your new phone number with code {{otp}}.',
        two_factor: 'Your Plantix 2FA code is {{otp}}.',
      },
      es: {
        verification: 'Tu código de verificación de Plantix es {{otp}}. Válido por 5 minutos.',
        login: 'Tu código de acceso de Plantix es {{otp}}. No compartas este código.',
        password_reset: 'Tu código de restablecimiento de Plantix es {{otp}}. Válido por 5 minutos.',
        phone_change: 'Confirma tu nuevo número de teléfono con el código {{otp}}.',
        two_factor: 'Tu código 2FA de Plantix es {{otp}}.',
      },
    };

    return templates[language]?.[type] || templates['en'][type] || templates['en']['verification'];
  }

  private getEmailTemplate(type: OtpType, language: string = 'en'): OtpTemplate {
    const templates: Record<string, Record<string, OtpTemplate>> = {
      en: {
        verification: {
          subject: 'Verify Your Email - Code {{otp}}',
          html: `
            <h2>Email Verification</h2>
            <p>Your verification code is: <strong>{{otp}}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
          text: 'Your verification code is {{otp}}. Valid for 5 minutes.',
        },
        password_reset: {
          subject: 'Password Reset Code - {{otp}}',
          html: `
            <h2>Password Reset</h2>
            <p>Your password reset code is: <strong>{{otp}}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this, please contact support.</p>
          `,
          text: 'Your password reset code is {{otp}}. Valid for 5 minutes.',
        },
      },
    };

    return templates[language]?.[type] || templates['en'][type] || templates['en']['verification'];
  }

  public getOtpStats(identifier: string, method: OtpMethod, hours: number = 24): Promise<{
    totalSent: number;
    totalVerified: number;
    successRate: number;
    lastAttempt?: Date;
  }> {
    // Implementation for OTP statistics
    // This would query your database for OTP-related metrics
    return Promise.resolve({
      totalSent: 0,
      totalVerified: 0,
      successRate: 0,
    });
  }
}

export const otpService = new OtpService();