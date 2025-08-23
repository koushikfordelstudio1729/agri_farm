import twilio from 'twilio';
import { logger } from '@/utils/logger';

export interface SMSConfig {
  service: 'twilio' | 'aws_sns' | 'firebase';
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    verifyServiceSid?: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  firebase?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  rateLimits: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

const smsConfig: SMSConfig = {
  service: (process.env.SMS_SERVICE as 'twilio' | 'aws_sns' | 'firebase') || 'twilio',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_SNS_REGION || 'us-east-1',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },
  rateLimits: {
    perMinute: parseInt(process.env.SMS_RATE_LIMIT_MINUTE || '5', 10),
    perHour: parseInt(process.env.SMS_RATE_LIMIT_HOUR || '20', 10),
    perDay: parseInt(process.env.SMS_RATE_LIMIT_DAY || '50', 10),
  },
};

// Initialize SMS clients based on service
let twilioClient: twilio.Twilio | null = null;
let awsSNS: any = null;

if (smsConfig.service === 'twilio' && smsConfig.twilio?.accountSid && smsConfig.twilio?.authToken) {
  twilioClient = twilio(smsConfig.twilio.accountSid, smsConfig.twilio.authToken);
}

if (smsConfig.service === 'aws_sns' && smsConfig.aws?.accessKeyId && smsConfig.aws?.secretAccessKey) {
  // AWS SNS would be initialized here
  // const AWS = require('aws-sdk');
  // awsSNS = new AWS.SNS({
  //   accessKeyId: smsConfig.aws.accessKeyId,
  //   secretAccessKey: smsConfig.aws.secretAccessKey,
  //   region: smsConfig.aws.region,
  // });
}

// SMS message templates
export const SMS_TEMPLATES = {
  OTP_VERIFICATION: (otp: string, appName: string = 'Plantix') => 
    `Your ${appName} verification code is: ${otp}. Do not share this code with anyone.`,
  
  PHONE_VERIFICATION: (otp: string, appName: string = 'Plantix') =>
    `${otp} is your ${appName} phone verification code. Valid for 5 minutes.`,
  
  PASSWORD_RESET: (appName: string = 'Plantix') =>
    `A password reset request was made for your ${appName} account. If this wasn't you, please ignore this message.`,
  
  ACCOUNT_SECURITY: (action: string, appName: string = 'Plantix') =>
    `Security alert: ${action} on your ${appName} account. Contact support if this wasn't you.`,
  
  DIAGNOSIS_READY: (cropName: string, diseaseName: string, appName: string = 'Plantix') =>
    `Your ${cropName} diagnosis is ready! Disease detected: ${diseaseName}. Check the ${appName} app for details.`,
  
  WEATHER_ALERT: (location: string, alertType: string, message: string) =>
    `Weather Alert for ${location}: ${alertType}. ${message}`,
  
  PRICE_ALERT: (cropName: string, price: string, change: string) =>
    `Price Alert: ${cropName} is now ${price} (${change}). Check the app for more details.`,
  
  EXPERT_RESPONSE: (expertName: string, appName: string = 'Plantix') =>
    `${expertName} has responded to your query on ${appName}. Check the app to view the response.`,
} as const;

// SMS service interface
interface SMSMessage {
  to: string;
  message: string;
  templateType?: keyof typeof SMS_TEMPLATES;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export class SMSService {
  static async sendSMS({ to, message }: SMSMessage): Promise<SMSResponse> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(to);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitCheck.resetTime}`);
      }

      let response: SMSResponse;

      switch (smsConfig.service) {
        case 'twilio':
          response = await this.sendViaTwilio(to, message);
          break;
        case 'aws_sns':
          response = await this.sendViaAWSSNS(to, message);
          break;
        case 'firebase':
          response = await this.sendViaFirebase(to, message);
          break;
        default:
          throw new Error(`Unsupported SMS service: ${smsConfig.service}`);
      }

      if (response.success) {
        await this.logSMSSent(to, message, response.messageId);
      }

      return response;
    } catch (error) {
      logger.error('SMS sending failed', {
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: smsConfig.service,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async sendOTP(to: string, otp: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.OTP_VERIFICATION(otp);
    return this.sendSMS({ to, message, templateType: 'OTP_VERIFICATION' });
  }

  static async sendPhoneVerification(to: string, otp: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.PHONE_VERIFICATION(otp);
    return this.sendSMS({ to, message, templateType: 'PHONE_VERIFICATION' });
  }

  static async sendPasswordResetAlert(to: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.PASSWORD_RESET();
    return this.sendSMS({ to, message, templateType: 'PASSWORD_RESET' });
  }

  static async sendSecurityAlert(to: string, action: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.ACCOUNT_SECURITY(action);
    return this.sendSMS({ to, message, templateType: 'ACCOUNT_SECURITY' });
  }

  static async sendDiagnosisReady(to: string, cropName: string, diseaseName: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.DIAGNOSIS_READY(cropName, diseaseName);
    return this.sendSMS({ to, message, templateType: 'DIAGNOSIS_READY' });
  }

  static async sendWeatherAlert(to: string, location: string, alertType: string, alertMessage: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.WEATHER_ALERT(location, alertType, alertMessage);
    return this.sendSMS({ to, message, templateType: 'WEATHER_ALERT' });
  }

  static async sendPriceAlert(to: string, cropName: string, price: string, change: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.PRICE_ALERT(cropName, price, change);
    return this.sendSMS({ to, message, templateType: 'PRICE_ALERT' });
  }

  static async sendExpertResponse(to: string, expertName: string): Promise<SMSResponse> {
    const message = SMS_TEMPLATES.EXPERT_RESPONSE(expertName);
    return this.sendSMS({ to, message, templateType: 'EXPERT_RESPONSE' });
  }

  // Twilio verification service methods
  static async startVerification(to: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!twilioClient || !smsConfig.twilio?.verifyServiceSid) {
      return { success: false, error: 'Twilio verification service not configured' };
    }

    try {
      const verification = await twilioClient.verify.v2
        .services(smsConfig.twilio.verifyServiceSid)
        .verifications.create({ to, channel: 'sms' });

      logger.info('Verification started', { to, sid: verification.sid });
      return { success: true, sid: verification.sid };
    } catch (error) {
      logger.error('Failed to start verification', { to, error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async checkVerification(to: string, code: string): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    if (!twilioClient || !smsConfig.twilio?.verifyServiceSid) {
      return { success: false, error: 'Twilio verification service not configured' };
    }

    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(smsConfig.twilio.verifyServiceSid)
        .verificationChecks.create({ to, code });

      const isValid = verificationCheck.status === 'approved';
      logger.info('Verification checked', { to, valid: isValid });
      
      return { success: true, valid: isValid };
    } catch (error) {
      logger.error('Failed to check verification', { to, error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Bulk SMS functionality
  static async sendBulkSMS(
    recipients: Array<{ to: string; message: string }>,
    options: { batchSize?: number; delayBetweenBatches?: number } = {}
  ): Promise<{ sent: number; failed: number; results: SMSResponse[] }> {
    const { batchSize = 10, delayBetweenBatches = 1000 } = options;
    let sent = 0;
    let failed = 0;
    const results: SMSResponse[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ to, message }) => {
        const result = await this.sendSMS({ to, message });
        results.push(result);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
        
        return result;
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    logger.info('Bulk SMS completed', { 
      total: recipients.length, 
      sent, 
      failed,
      successRate: ((sent / recipients.length) * 100).toFixed(2) + '%'
    });

    return { sent, failed, results };
  }

  // Private helper methods
  private static async sendViaTwilio(to: string, message: string): Promise<SMSResponse> {
    if (!twilioClient || !smsConfig.twilio?.phoneNumber) {
      throw new Error('Twilio client not configured');
    }

    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: smsConfig.twilio.phoneNumber,
        to,
      });

      return {
        success: true,
        messageId: result.sid,
        cost: parseFloat(result.price || '0'),
      };
    } catch (error) {
      throw new Error(`Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async sendViaAWSSNS(to: string, message: string): Promise<SMSResponse> {
    if (!awsSNS) {
      throw new Error('AWS SNS client not configured');
    }

    // AWS SNS implementation would go here
    throw new Error('AWS SNS implementation not available');
  }

  private static async sendViaFirebase(to: string, message: string): Promise<SMSResponse> {
    // Firebase SMS implementation would go here
    throw new Error('Firebase SMS implementation not available');
  }

  private static isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  private static async checkRateLimit(phoneNumber: string): Promise<{ 
    allowed: boolean; 
    resetTime?: string; 
    remaining: number 
  }> {
    // This would integrate with Redis or another caching system for rate limiting
    // For now, return a simple implementation
    
    // In a real implementation, you would check:
    // - SMS count per minute/hour/day for this phone number
    // - Global SMS rate limits
    // - Account-specific limits
    
    return {
      allowed: true,
      remaining: 100,
    };
  }

  private static async logSMSSent(to: string, message: string, messageId?: string): Promise<void> {
    logger.info('SMS sent successfully', {
      to: to.replace(/(\+\d{1,3})\d{6,}(\d{4})/, '$1******$2'), // Mask phone number
      messageLength: message.length,
      messageId,
      service: smsConfig.service,
      timestamp: new Date().toISOString(),
    });
  }

  // Service health and statistics
  static async getServiceHealth(): Promise<{
    status: 'up' | 'down';
    service: string;
    details: Record<string, unknown>;
  }> {
    try {
      let healthDetails: Record<string, unknown> = {
        service: smsConfig.service,
        rateLimits: smsConfig.rateLimits,
      };

      switch (smsConfig.service) {
        case 'twilio':
          if (twilioClient) {
            // Test Twilio connection by fetching account info
            const account = await twilioClient.api.accounts.list({ limit: 1 });
            healthDetails.twilioStatus = 'connected';
            healthDetails.accountSid = smsConfig.twilio?.accountSid?.substring(0, 10) + '...';
          }
          break;
        case 'aws_sns':
          healthDetails.awsStatus = awsSNS ? 'configured' : 'not configured';
          break;
        case 'firebase':
          healthDetails.firebaseStatus = 'not implemented';
          break;
      }

      return {
        status: 'up',
        service: smsConfig.service,
        details: healthDetails,
      };
    } catch (error) {
      return {
        status: 'down',
        service: smsConfig.service,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  static async getSMSStats(dateRange?: { start: Date; end: Date }): Promise<{
    totalSent: number;
    totalFailed: number;
    successRate: number;
    costTotal: number;
    byTemplate: Record<string, number>;
  }> {
    // This would integrate with your database to get actual statistics
    // For now, return mock data
    return {
      totalSent: 1250,
      totalFailed: 45,
      successRate: 96.5,
      costTotal: 12.50,
      byTemplate: {
        OTP_VERIFICATION: 800,
        PHONE_VERIFICATION: 200,
        DIAGNOSIS_READY: 150,
        WEATHER_ALERT: 75,
        PRICE_ALERT: 25,
      },
    };
  }
}

// Export health check function
export const checkSMSHealth = async (): Promise<{
  status: 'up' | 'down';
  details: Record<string, unknown>;
}> => {
  const health = await SMSService.getServiceHealth();
  return {
    status: health.status,
    details: health.details,
  };
};

export default {
  config: smsConfig,
  service: SMSService,
  templates: SMS_TEMPLATES,
  checkSMSHealth,
};