import twilio, { Twilio } from 'twilio';
import AWS from 'aws-sdk';
import { parsePhoneNumber, PhoneNumber } from 'libphonenumber-js';
import { logger } from '@/utils/logger';
import {
  SmsServiceConfig,
  SmsOptions,
  SmsResult,
  OtpOptions,
  OtpVerificationResult,
  SmsProvider,
} from './smsService.types';

export class SmsService {
  private config: SmsServiceConfig;
  private twilioClient?: Twilio;
  private snsClient?: AWS.SNS;

  constructor() {
    this.config = {
      provider: (process.env.SMS_SERVICE as SmsProvider) || 'twilio',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID as string,
        authToken: process.env.TWILIO_AUTH_TOKEN as string,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER as string,
        verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID as string,
      },
      aws: {
        accessKeyId: process.env.AWS_SNS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SNS_SECRET_KEY as string,
        region: process.env.AWS_SNS_REGION as string,
      },
    };

    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      if (this.config.provider === 'twilio' && this.config.twilio) {
        // Check if required Twilio credentials are provided
        if (!this.config.twilio.accountSid || !this.config.twilio.authToken) {
          console.warn('Twilio credentials not configured. SMS service will not be available.');
          return;
        }
        
        if (this.config.twilio.accountSid.includes('your_') || this.config.twilio.authToken.includes('your_')) {
          console.warn('Twilio credentials are placeholder values. Please configure real credentials.');
          return;
        }

        this.twilioClient = twilio(
          this.config.twilio.accountSid,
          this.config.twilio.authToken
        );
        console.log('Twilio SMS service initialized');
      } else if (this.config.provider === 'aws_sns' && this.config.aws) {
        // Check if required AWS credentials are provided
        if (!this.config.aws.accessKeyId || !this.config.aws.secretAccessKey || !this.config.aws.region) {
          console.warn('AWS SNS credentials not configured. SMS service will not be available.');
          return;
        }
        
        if (this.config.aws.accessKeyId.includes('your_') || this.config.aws.secretAccessKey.includes('your_')) {
          console.warn('AWS SNS credentials are placeholder values. Please configure real credentials.');
          return;
        }

        AWS.config.update({
          accessKeyId: this.config.aws.accessKeyId,
          secretAccessKey: this.config.aws.secretAccessKey,
          region: this.config.aws.region,
        });
        this.snsClient = new AWS.SNS();
        console.log('AWS SNS SMS service initialized');
      } else {
        console.warn(`SMS provider '${this.config.provider}' not configured or unsupported. SMS service will not be available.`);
      }
    } catch (error) {
      console.error('SMS Service initialization error:', error);
      // Don't throw error in development to allow server to start
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  public async sendSms(options: SmsOptions): Promise<SmsResult> {
    try {
      // Check if service is initialized
      if (!this.twilioClient && !this.snsClient) {
        return {
          success: false,
          error: 'SMS service not configured. Please set up Twilio or AWS SNS credentials.',
        };
      }

      // Validate and format phone number
      const phoneNumber = this.formatPhoneNumber(options.to);
      if (!phoneNumber) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      let result: SmsResult;

      switch (this.config.provider) {
        case 'twilio':
          if (!this.twilioClient) {
            return {
              success: false,
              error: 'Twilio client not initialized',
            };
          }
          result = await this.sendViaTwilio(phoneNumber.number, options.message);
          break;
        case 'aws_sns':
          if (!this.snsClient) {
            return {
              success: false,
              error: 'AWS SNS client not initialized',
            };
          }
          result = await this.sendViaAwsSns(phoneNumber.number, options.message);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }

      if (result.success) {
        logger.info('SMS sent successfully', {
          to: phoneNumber.number,
          provider: this.config.provider,
          messageId: result.messageId,
        });
      } else {
        logger.error('Failed to send SMS', {
          to: phoneNumber.number,
          provider: this.config.provider,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error('SMS service error', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async sendOtp(options: OtpOptions): Promise<SmsResult> {
    const otp = this.generateOtp(options.length || 6);
    const message = options.template
      ? options.template.replace('{{otp}}', otp)
      : `Your verification code is: ${otp}. Valid for ${options.expiryMinutes || 5} minutes.`;

    const result = await this.sendSms({
      to: options.phoneNumber,
      message,
    });

    if (result.success) {
      // Store OTP for verification (this would typically be stored in database or cache)
      logger.info('OTP sent successfully', {
        phoneNumber: options.phoneNumber,
        otp: otp.substring(0, 2) + '****', // Log partial OTP for debugging
      });

      return {
        ...result,
        otp, // Return OTP for storage by caller
      };
    }

    return result;
  }

  public async verifyOtpViaTwilio(
    phoneNumber: string,
    code: string
  ): Promise<OtpVerificationResult> {
    try {
      if (!this.twilioClient || !this.config.twilio?.verifyServiceSid) {
        throw new Error('Twilio Verify service not configured');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      const verificationCheck = await this.twilioClient.verify
        .services(this.config.twilio.verifyServiceSid)
        .verificationChecks.create({
          to: formattedNumber.number,
          code,
        });

      logger.info('OTP verification result', {
        phoneNumber: formattedNumber.number,
        status: verificationCheck.status,
        valid: verificationCheck.valid,
      });

      return {
        success: verificationCheck.valid || verificationCheck.status === 'approved',
        status: verificationCheck.status,
        valid: verificationCheck.valid,
      };
    } catch (error) {
      logger.error('OTP verification failed', {
        error: error.message,
        phoneNumber,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async sendBulkSms(
    phoneNumbers: string[],
    message: string,
    batchSize: number = 100
  ): Promise<SmsResult[]> {
    const results: SmsResult[] = [];
    
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      const batchPromises = batch.map(phoneNumber =>
        this.sendSms({ to: phoneNumber, message })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason.message || 'Unknown error',
          });
        }
      });

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < phoneNumbers.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  private async sendViaTwilio(phoneNumber: string, message: string): Promise<SmsResult> {
    try {
      if (!this.twilioClient || !this.config.twilio?.phoneNumber) {
        throw new Error('Twilio client not configured');
      }

      const twilioMessage = await this.twilioClient.messages.create({
        body: message,
        from: this.config.twilio.phoneNumber,
        to: phoneNumber,
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        provider: 'twilio',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'twilio',
      };
    }
  }

  private async sendViaAwsSns(phoneNumber: string, message: string): Promise<SmsResult> {
    try {
      if (!this.snsClient) {
        throw new Error('AWS SNS client not configured');
      }

      const params = {
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'Plantix',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      };

      const result = await this.snsClient.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
        provider: 'aws_sns',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'aws_sns',
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): PhoneNumber | null {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      return parsed?.isValid() ? parsed : null;
    } catch (error) {
      logger.error('Phone number parsing failed', { error, phoneNumber });
      return null;
    }
  }

  private generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
  }> {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      
      if (!parsed || !parsed.isValid()) {
        return { isValid: false };
      }

      return {
        isValid: true,
        formatted: parsed.format('E.164'),
        country: parsed.country,
        type: parsed.getType(),
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  public async checkMessageStatus(messageId: string, provider?: SmsProvider): Promise<{
    status: string;
    delivered: boolean;
    errorCode?: string;
    errorMessage?: string;
  }> {
    const useProvider = provider || this.config.provider;

    try {
      if (useProvider === 'twilio' && this.twilioClient) {
        const message = await this.twilioClient.messages(messageId).fetch();
        return {
          status: message.status,
          delivered: message.status === 'delivered',
          errorCode: message.errorCode?.toString(),
          errorMessage: message.errorMessage || undefined,
        };
      }

      // AWS SNS doesn't provide detailed status tracking for SMS
      return {
        status: 'unknown',
        delivered: false,
      };
    } catch (error) {
      logger.error('Failed to check message status', { error, messageId });
      return {
        status: 'error',
        delivered: false,
        errorMessage: error.message,
      };
    }
  }

  public formatInternationalNumber(phoneNumber: string, defaultCountry?: string): string | null {
    try {
      const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any);
      return parsed?.isValid() ? parsed.format('E.164') : null;
    } catch (error) {
      return null;
    }
  }
}

export const smsService = new SmsService();