export type SmsProvider = 'twilio' | 'aws_sns' | 'firebase';

export interface SmsServiceConfig {
  provider: SmsProvider;
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
}

export interface SmsOptions {
  to: string;
  message: string;
  from?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  provider?: SmsProvider;
  otp?: string;
}

export interface OtpOptions {
  phoneNumber: string;
  length?: number;
  expiryMinutes?: number;
  template?: string;
  alphanumeric?: boolean;
}

export interface OtpVerificationResult {
  success: boolean;
  status?: string;
  valid?: boolean;
  error?: string;
}

export interface BulkSmsOptions {
  phoneNumbers: string[];
  message: string;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface SmsTemplate {
  name: string;
  content: string;
  variables: string[];
  category: 'otp' | 'notification' | 'marketing' | 'alert';
}

export interface SmsAnalytics {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  cost: number;
  deliveryRate: number;
}

export interface PhoneNumberValidation {
  isValid: boolean;
  formatted?: string;
  country?: string;
  type?: 'mobile' | 'fixed_line' | 'toll_free' | 'premium_rate' | 'voip';
  carrier?: string;
}

export interface MessageStatus {
  messageId: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
  cost?: number;
}