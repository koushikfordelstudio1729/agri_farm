import { Document, Model } from 'mongoose';
import { ConsentType, ConsentStatus, ConsentMethod } from '@/types';

export interface IUserConsent extends Document {
  userId: string;
  type: ConsentType;
  status: ConsentStatus;
  currentVersion: string;
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;

  // Current consent details
  method: ConsentMethod;
  source: 'onboarding' | 'settings' | 'popup' | 'email' | 'sms' | 'api';
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };

  // Detailed consent information
  details?: {
    purpose: string;
    category: 'necessary' | 'functional' | 'analytics' | 'marketing' | 'personalization';
    dataTypes: string[];
    retention: {
      period: string;
      unit: 'days' | 'months' | 'years' | 'indefinite';
    };
    thirdParties?: Array<{
      name: string;
      purpose: string;
      privacyPolicy: string;
    }>;
    lawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  };

  // Consent history
  history: Array<{
    version: string;
    granted: boolean;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    method: ConsentMethod;
    source: 'onboarding' | 'settings' | 'popup' | 'email' | 'sms' | 'api';
    reason?: string;
  }>;

  // Preferences and granular controls
  preferences: {
    email: {
      marketing: boolean;
      transactional: boolean;
      newsletter: boolean;
      updates: boolean;
    };
    sms: {
      marketing: boolean;
      alerts: boolean;
      verification: boolean;
    };
    push: {
      marketing: boolean;
      alerts: boolean;
      reminders: boolean;
    };
    data: {
      analytics: boolean;
      personalization: boolean;
      sharing: boolean;
      retention: boolean;
    };
    cookies: {
      necessary: boolean;
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
    };
  };

  // Compliance and audit
  compliance: {
    gdpr: {
      applicable: boolean;
      lawfulBasis?: string;
      dataSubject: boolean;
    };
    ccpa: {
      applicable: boolean;
      consumer: boolean;
      doNotSell: boolean;
    };
    coppa: {
      applicable: boolean;
      parentalConsent: boolean;
    };
  };

  // Reminders and renewals
  reminderSent: boolean;
  reminderSentAt?: Date;
  renewalRequired: boolean;
  renewalDueAt?: Date;

  // Metadata
  isActive: boolean;
  notes?: string;
  tags: string[];

  // Virtuals
  isExpired: boolean;
  isValid: boolean;
  daysUntilExpiry: number | null;

  // Instance methods
  grant(method: ConsentMethod, source: string, ipAddress?: string, userAgent?: string, expiryDays?: number): Promise<void>;
  withdraw(reason?: string, ipAddress?: string, userAgent?: string): Promise<void>;
  deny(ipAddress?: string, userAgent?: string): Promise<void>;
  updatePreferences(preferences: Partial<IUserConsent['preferences']>): Promise<void>;
  renew(newVersion: string, expiryDays?: number): Promise<void>;
  scheduleRenewal(renewalDate: Date): Promise<void>;
  sendReminder(): Promise<void>;
  checkExpiry(): boolean;
}

export interface IUserConsentStatics {
  findByUserId(userId: string): Promise<IUserConsent[]>;
  findByType(userId: string, type: ConsentType): Promise<IUserConsent | null>;
  createConsent(userId: string, type: ConsentType, version: string, details: IUserConsent['details']): Promise<IUserConsent>;
  getExpiringConsents(daysAhead?: number): Promise<IUserConsent[]>;
  getRenewalDue(): Promise<IUserConsent[]>;
  getConsentStats(dateRange?: { start: Date; end: Date }): Promise<{
    overview: {
      total: number;
      granted: number;
      denied: number;
      withdrawn: number;
      expired: number;
      pending: number;
    };
    byType: Array<{
      _id: ConsentType;
      total: number;
      granted: number;
      denied: number;
      withdrawn: number;
    }>;
    compliance: {
      gdprApplicable: number;
      ccpaApplicable: number;
      coppaApplicable: number;
    };
  }>;
  bulkExpireOldConsents(): Promise<number>;
  getComplianceReport(userId?: string): Promise<{
    user?: string;
    consents: Array<{
      type: ConsentType;
      status: ConsentStatus;
      granted: boolean;
      grantedAt?: Date;
      method: ConsentMethod;
      lawfulBasis?: string;
      canWithdraw: boolean;
    }>;
  }>;
}

export interface IUserConsentModel extends Model<IUserConsent>, IUserConsentStatics {}