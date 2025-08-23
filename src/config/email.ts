import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '@/utils/logger';

export interface EmailConfig {
  service: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  from: {
    name: string;
    address: string;
  };
  replyTo?: string;
  templates: {
    baseUrl: string;
    welcomeEmail: string;
    emailVerification: string;
    passwordReset: string;
    otpVerification: string;
    diagnosisComplete: string;
    communityNotification: string;
    expertConsultation: string;
    weatherAlert: string;
    priceAlert: string;
    newsletter: string;
  };
}

const emailConfig: EmailConfig = {
  service: (process.env.EMAIL_SERVICE as 'smtp' | 'sendgrid' | 'mailgun' | 'ses') || 'smtp',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
  },
  ses: {
    region: process.env.AWS_SES_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Plantix',
    address: process.env.EMAIL_FROM || 'noreply@plantix.com',
  },
  replyTo: process.env.EMAIL_REPLY_TO,
  templates: {
    baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || 'https://app.plantix.com/templates',
    welcomeEmail: 'welcome',
    emailVerification: 'email-verification',
    passwordReset: 'password-reset',
    otpVerification: 'otp-verification',
    diagnosisComplete: 'diagnosis-complete',
    communityNotification: 'community-notification',
    expertConsultation: 'expert-consultation',
    weatherAlert: 'weather-alert',
    priceAlert: 'price-alert',
    newsletter: 'newsletter',
  },
};

// Create transporter based on service
let transporter: Transporter;

switch (emailConfig.service) {
  case 'sendgrid':
    transporter = nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: emailConfig.sendgrid?.apiKey,
      },
    });
    break;

  case 'mailgun':
    transporter = nodemailer.createTransporter({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: emailConfig.mailgun?.domain,
        pass: emailConfig.mailgun?.apiKey,
      },
    });
    break;

  case 'ses':
    transporter = nodemailer.createTransporter({
      SES: {
        region: emailConfig.ses?.region,
        accessKeyId: emailConfig.ses?.accessKeyId,
        secretAccessKey: emailConfig.ses?.secretAccessKey,
      },
    });
    break;

  default: // SMTP
    if (emailConfig.smtp) {
      transporter = nodemailer.createTransporter({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });
    } else {
      throw new Error('SMTP configuration is required when service is smtp');
    }
}

// Email template interfaces
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  verificationUrl?: string;
}

export interface EmailVerificationData {
  firstName: string;
  verificationUrl: string;
  expiresIn: string;
}

export interface PasswordResetData {
  firstName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface OTPVerificationData {
  firstName: string;
  otp: string;
  expiresIn: string;
}

export interface DiagnosisCompleteData {
  firstName: string;
  diagnosisId: string;
  cropName: string;
  diseaseName: string;
  confidence: number;
  resultsUrl: string;
}

export interface WeatherAlertData {
  firstName: string;
  location: string;
  alertType: 'rain' | 'drought' | 'frost' | 'heatwave';
  message: string;
  recommendations: string[];
}

export interface PriceAlertData {
  firstName: string;
  cropName: string;
  currentPrice: number;
  previousPrice: number;
  percentageChange: number;
  market: string;
}

// Email sending service
export class EmailService {
  static async sendEmail(options: SendMailOptions): Promise<boolean> {
    try {
      const mailOptions: SendMailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
        replyTo: emailConfig.replyTo,
        ...options,
      };

      const info = await transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  static async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    const subject = `Welcome to Plantix, ${data.firstName}!`;
    const html = await this.renderTemplate('welcome', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Welcome to Plantix, ${data.firstName}! We're excited to help you with your farming journey.`,
    });
  }

  static async sendEmailVerification(to: string, data: EmailVerificationData): Promise<boolean> {
    const subject = 'Verify your Plantix account';
    const html = await this.renderTemplate('email-verification', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Please verify your email by clicking this link: ${data.verificationUrl}`,
    });
  }

  static async sendPasswordReset(to: string, data: PasswordResetData): Promise<boolean> {
    const subject = 'Reset your Plantix password';
    const html = await this.renderTemplate('password-reset', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Reset your password by clicking this link: ${data.resetUrl}`,
    });
  }

  static async sendOTPVerification(to: string, data: OTPVerificationData): Promise<boolean> {
    const subject = 'Your Plantix verification code';
    const html = await this.renderTemplate('otp-verification', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Your verification code is: ${data.otp}`,
    });
  }

  static async sendDiagnosisComplete(to: string, data: DiagnosisCompleteData): Promise<boolean> {
    const subject = `Your plant diagnosis is ready - ${data.diseaseName}`;
    const html = await this.renderTemplate('diagnosis-complete', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Your ${data.cropName} diagnosis is complete. Disease detected: ${data.diseaseName}`,
    });
  }

  static async sendWeatherAlert(to: string, data: WeatherAlertData): Promise<boolean> {
    const subject = `Weather Alert for ${data.location}`;
    const html = await this.renderTemplate('weather-alert', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `Weather alert for ${data.location}: ${data.message}`,
    });
  }

  static async sendPriceAlert(to: string, data: PriceAlertData): Promise<boolean> {
    const direction = data.percentageChange > 0 ? 'increased' : 'decreased';
    const subject = `Price Alert: ${data.cropName} price ${direction}`;
    const html = await this.renderTemplate('price-alert', data);
    
    return this.sendEmail({
      to,
      subject,
      html,
      text: `${data.cropName} price ${direction} by ${Math.abs(data.percentageChange)}%`,
    });
  }

  static async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    data: Record<string, unknown>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    const html = await this.renderTemplate(template, data);

    // Send emails in batches to avoid overwhelming the server
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          await this.sendEmail({
            to: email,
            subject,
            html,
          });
          sent++;
        } catch (error) {
          logger.error('Bulk email failed for recipient', { email, error });
          failed++;
        }
      });

      await Promise.allSettled(promises);
    }

    logger.info('Bulk email completed', { sent, failed, total: recipients.length });
    return { sent, failed };
  }

  private static async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    // In a real implementation, you would load and render the template
    // For now, we'll return a simple HTML template
    
    const templates: Record<string, (data: any) => string> = {
      'welcome': (data: WelcomeEmailData) => `
        <h1>Welcome to Plantix, ${data.firstName}!</h1>
        <p>We're excited to help you with your farming journey.</p>
        ${data.verificationUrl ? `<p><a href="${data.verificationUrl}">Verify your email</a></p>` : ''}
      `,
      'email-verification': (data: EmailVerificationData) => `
        <h1>Verify your email, ${data.firstName}</h1>
        <p>Click the link below to verify your account:</p>
        <p><a href="${data.verificationUrl}">Verify Email</a></p>
        <p>This link expires in ${data.expiresIn}.</p>
      `,
      'password-reset': (data: PasswordResetData) => `
        <h1>Reset your password, ${data.firstName}</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${data.resetUrl}">Reset Password</a></p>
        <p>This link expires in ${data.expiresIn}.</p>
      `,
      'otp-verification': (data: OTPVerificationData) => `
        <h1>Your verification code, ${data.firstName}</h1>
        <p>Your verification code is: <strong>${data.otp}</strong></p>
        <p>This code expires in ${data.expiresIn}.</p>
      `,
      'diagnosis-complete': (data: DiagnosisCompleteData) => `
        <h1>Your plant diagnosis is ready, ${data.firstName}!</h1>
        <p>We've analyzed your ${data.cropName} and detected: <strong>${data.diseaseName}</strong></p>
        <p>Confidence: ${(data.confidence * 100).toFixed(1)}%</p>
        <p><a href="${data.resultsUrl}">View full results</a></p>
      `,
      'weather-alert': (data: WeatherAlertData) => `
        <h1>Weather Alert for ${data.location}</h1>
        <p>${data.message}</p>
        <h3>Recommendations:</h3>
        <ul>${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
      `,
      'price-alert': (data: PriceAlertData) => `
        <h1>Price Alert for ${data.cropName}</h1>
        <p>Current price: $${data.currentPrice} (${data.percentageChange > 0 ? '+' : ''}${data.percentageChange.toFixed(2)}%)</p>
        <p>Previous price: $${data.previousPrice}</p>
        <p>Market: ${data.market}</p>
      `,
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    return template(data);
  }

  static async verifyConnection(): Promise<boolean> {
    try {
      await transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }

  static async getQueue(): Promise<{ active: number; waiting: number }> {
    // This would integrate with a queue system like Bull or Agenda
    // For now, return mock data
    return { active: 0, waiting: 0 };
  }
}

// Health check function
export const checkEmailHealth = async (): Promise<{
  status: 'up' | 'down';
  details: Record<string, unknown>;
}> => {
  try {
    const isVerified = await EmailService.verifyConnection();
    const queue = await EmailService.getQueue();

    return {
      status: isVerified ? 'up' : 'down',
      details: {
        service: emailConfig.service,
        fromAddress: emailConfig.from.address,
        queue,
        transporter: isVerified ? 'connected' : 'disconnected',
      },
    };
  } catch (error) {
    return {
      status: 'down',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        service: emailConfig.service,
      },
    };
  }
};

export default {
  config: emailConfig,
  service: EmailService,
  transporter,
  checkEmailHealth,
};