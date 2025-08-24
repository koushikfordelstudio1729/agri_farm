import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '@/utils/logger';
import {
  EmailServiceConfig,
  EmailOptions,
  EmailResult,
  EmailTemplate,
  EmailAttachment,
} from './emailService.types';

export class EmailService {
  private transporter: Transporter;
  private config: EmailServiceConfig;

  constructor() {
    this.config = {
      service: process.env.EMAIL_SERVICE as string,
      apiKey: process.env.EMAIL_API_KEY as string,
      from: process.env.EMAIL_FROM as string,
      fromName: process.env.EMAIL_FROM_NAME as string,
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      if (this.config.service === 'sendgrid') {
        if (!this.config.apiKey || this.config.apiKey.includes('your_')) {
          console.warn('SendGrid API key not configured. Email service will not be available.');
          return;
        }
        
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: this.config.apiKey,
          },
        });
      } else if (this.config.service === 'mailgun') {
        const username = process.env.MAILGUN_USERNAME as string;
        const password = process.env.MAILGUN_PASSWORD as string;
        
        if (!username || !password || username.includes('your_') || password.includes('your_')) {
          console.warn('Mailgun credentials not configured. Email service will not be available.');
          return;
        }
        
        this.transporter = nodemailer.createTransporter({
          service: 'Mailgun',
          auth: { user: username, pass: password },
        });
      } else if (this.config.service === 'smtp') {
        const host = process.env.SMTP_HOST as string;
        const user = process.env.SMTP_USER as string;
        const pass = process.env.SMTP_PASS as string;
        
        if (!host || !user || !pass || host.includes('your_') || user.includes('your_') || pass.includes('your_')) {
          console.warn('SMTP credentials not configured. Email service will not be available.');
          return;
        }
        
        this.transporter = nodemailer.createTransporter({
          host,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user, pass },
        });
      } else {
        console.warn(`Email service '${this.config.service}' not configured or unsupported. Email service will not be available.`);
        return;
      }

      console.log(`Email service initialized successfully with ${this.config.service}`);
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Don't throw error in development to allow server to start
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  public async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        return {
          success: false,
          error: 'Email service not configured. Please set up SendGrid, Mailgun, or SMTP credentials.',
        };
      }

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.from}>`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: this.formatAttachments(options.attachments),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async sendTemplateEmail(
    template: EmailTemplate,
    to: string | string[],
    variables: Record<string, any> = {}
  ): Promise<EmailResult> {
    try {
      const html = this.renderTemplate(template.html, variables);
      const text = template.text ? this.renderTemplate(template.text, variables) : undefined;
      const subject = this.renderTemplate(template.subject, variables);

      return this.sendEmail({
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      logger.error('Failed to send template email', {
        error: error.message,
        template: template.name,
        to,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResult> {
    const template: EmailTemplate = {
      name: 'welcome',
      subject: 'Welcome to Plantix - Your Agricultural Companion!',
      html: this.getWelcomeTemplate(),
      text: 'Welcome to Plantix! Start your journey in smart agriculture with AI-powered plant disease diagnosis.',
    };

    return this.sendTemplateEmail(template, userEmail, {
      userName,
      appName: 'Plantix',
      supportEmail: this.config.from,
    });
  }

  public async sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationToken: string
  ): Promise<EmailResult> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const template: EmailTemplate = {
      name: 'email_verification',
      subject: 'Verify Your Email Address - Plantix',
      html: this.getVerificationTemplate(),
      text: `Please verify your email address by visiting: ${verificationUrl}`,
    };

    return this.sendTemplateEmail(template, userEmail, {
      userName,
      verificationUrl,
      appName: 'Plantix',
    });
  }

  public async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<EmailResult> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const template: EmailTemplate = {
      name: 'password_reset',
      subject: 'Reset Your Password - Plantix',
      html: this.getPasswordResetTemplate(),
      text: `Reset your password by visiting: ${resetUrl}`,
    };

    return this.sendTemplateEmail(template, userEmail, {
      userName,
      resetUrl,
      appName: 'Plantix',
      supportEmail: this.config.from,
    });
  }

  public async sendDiagnosisCompleteEmail(
    userEmail: string,
    userName: string,
    diagnosisId: string,
    results: any[]
  ): Promise<EmailResult> {
    const diagnosisUrl = `${process.env.FRONTEND_URL}/diagnosis/${diagnosisId}`;

    const template: EmailTemplate = {
      name: 'diagnosis_complete',
      subject: 'Your Plant Diagnosis is Ready - Plantix',
      html: this.getDiagnosisCompleteTemplate(),
    };

    return this.sendTemplateEmail(template, userEmail, {
      userName,
      diagnosisUrl,
      resultsCount: results.length,
      topDisease: results[0]?.diseaseName || 'Unknown',
      confidence: results[0]?.confidence || 0,
    });
  }

  public async sendExpertNotificationEmail(
    expertEmail: string,
    expertName: string,
    consultationId: string,
    userProblem: string
  ): Promise<EmailResult> {
    const consultationUrl = `${process.env.FRONTEND_URL}/consultation/${consultationId}`;

    const template: EmailTemplate = {
      name: 'expert_notification',
      subject: 'New Consultation Request - Plantix',
      html: this.getExpertNotificationTemplate(),
    };

    return this.sendTemplateEmail(template, expertEmail, {
      expertName,
      consultationUrl,
      userProblem,
      appName: 'Plantix',
    });
  }

  public async sendBulkEmail(
    recipients: string[],
    template: EmailTemplate,
    variables: Record<string, any> = {}
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendTemplateEmail(template, recipient, variables);
      results.push(result);

      // Add delay between emails to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    return rendered;
  }

  private formatAttachments(attachments?: EmailAttachment[]): any[] {
    if (!attachments) return [];

    return attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content,
      encoding: attachment.encoding || 'base64',
      cid: attachment.cid,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTML Email Templates
  private getWelcomeTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to {{appName}}!</h1>
          </div>
          <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>Welcome to Plantix, your intelligent agricultural companion! We're excited to have you join our community of smart farmers.</p>
            
            <h3>What you can do with Plantix:</h3>
            <ul>
              <li>🌱 Get AI-powered plant disease diagnosis</li>
              <li>👨‍🌾 Consult with agricultural experts</li>
              <li>🌤️ Receive personalized weather advice</li>
              <li>💰 Track market prices for your crops</li>
              <li>🤝 Connect with the farming community</li>
            </ul>
            
            <p>Ready to get started? Download our mobile app or visit our web platform to begin your smart farming journey.</p>
            
            <p>If you have any questions, feel free to reach out to us at {{supportEmail}}.</p>
            
            <p>Happy farming!<br>The Plantix Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Plantix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVerificationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { background-color: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>Thank you for signing up for {{appName}}! To complete your registration, please verify your email address by clicking the button below.</p>
            
            <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <p>Best regards,<br>The Plantix Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { background-color: #FF9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>We received a request to reset your password for your {{appName}} account. Click the button below to create a new password:</p>
            
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
            
            <p>If you didn't request a password reset, please ignore this email or contact our support team at {{supportEmail}} if you have concerns.</p>
            
            <p>Best regards,<br>The Plantix Team</p>
          </div>
          <div class="footer">
            <p>For security reasons, this email was sent to {{userEmail}}.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getDiagnosisCompleteTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .result-box { background-color: #e8f5e8; border: 1px solid #4CAF50; padding: 20px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌱 Your Plant Diagnosis is Ready!</h1>
          </div>
          <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>Great news! Your plant diagnosis has been completed by our AI system. Here's a summary of what we found:</p>
            
            <div class="result-box">
              <h3>Diagnosis Results</h3>
              <p><strong>Primary Condition:</strong> {{topDisease}}</p>
              <p><strong>Confidence Level:</strong> {{confidence}}%</p>
              <p><strong>Total Results:</strong> {{resultsCount}} possible conditions identified</p>
            </div>
            
            <p>Click the button below to view the complete diagnosis report, including treatment recommendations and prevention tips:</p>
            
            <a href="{{diagnosisUrl}}" class="button">View Full Report</a>
            
            <p>💡 <strong>Tip:</strong> For the most accurate treatment plan, consider consulting with one of our verified agricultural experts.</p>
            
            <p>Happy farming!<br>The Plantix Team</p>
          </div>
          <div class="footer">
            <p>Keep your crops healthy with Plantix - Your AI-powered farming assistant</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getExpertNotificationTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #673AB7; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { background-color: #673AB7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .consultation-box { background-color: #f3e5f5; border: 1px solid #673AB7; padding: 20px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👨‍🌾 New Consultation Request</h1>
          </div>
          <div class="content">
            <h2>Hello {{expertName}},</h2>
            <p>You have received a new consultation request on {{appName}}. A farmer needs your expertise!</p>
            
            <div class="consultation-box">
              <h3>Consultation Details</h3>
              <p><strong>Problem Description:</strong></p>
              <p>{{userProblem}}</p>
            </div>
            
            <p>Click the button below to review the consultation request and provide your expert advice:</p>
            
            <a href="{{consultationUrl}}" class="button">Review Consultation</a>
            
            <p>Thank you for being part of our expert community and helping farmers succeed!</p>
            
            <p>Best regards,<br>The Plantix Team</p>
          </div>
          <div class="footer">
            <p>Empowering agriculture through expert knowledge sharing</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();