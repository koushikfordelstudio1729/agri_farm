import mongoose, { Schema, Model } from 'mongoose';
import { IUserConsent, IUserConsentModel } from '@/interfaces/IUserConsent';
import { ConsentType, ConsentStatus, ConsentMethod } from '@/types';

const consentHistorySchema = new Schema({
  version: {
    type: String,
    required: true,
  },
  granted: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  userAgent: String,
  method: {
    type: String,
    enum: ['explicit', 'implicit', 'pre_checked', 'opt_out', 'withdrawal'],
    required: true,
  },
  source: {
    type: String,
    enum: ['onboarding', 'settings', 'popup', 'email', 'sms', 'api'],
    required: true,
  },
  reason: String,
}, { _id: true, timestamps: true });

const consentDetailsSchema = new Schema({
  purpose: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['necessary', 'functional', 'analytics', 'marketing', 'personalization'],
    required: true,
  },
  dataTypes: [{
    type: String,
    required: true,
  }],
  retention: {
    period: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      enum: ['days', 'months', 'years', 'indefinite'],
      required: true,
    },
  },
  thirdParties: [{
    name: String,
    purpose: String,
    privacyPolicy: String,
  }],
  lawfulBasis: {
    type: String,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
    required: true,
  },
}, { _id: false });

const userConsentSchema = new Schema<IUserConsent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'cookies', 'analytics', 'communication', 'location', 'biometric'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'granted', 'denied', 'withdrawn', 'expired'],
    default: 'pending',
    index: true,
  },
  currentVersion: {
    type: String,
    required: true,
  },
  granted: {
    type: Boolean,
    required: true,
    default: false,
  },
  grantedAt: Date,
  withdrawnAt: Date,
  expiresAt: Date,
  
  // Current consent details
  method: {
    type: String,
    enum: ['explicit', 'implicit', 'pre_checked', 'opt_out', 'withdrawal'],
    required: true,
  },
  source: {
    type: String,
    enum: ['onboarding', 'settings', 'popup', 'email', 'sms', 'api'],
    required: true,
  },
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String,
  },
  
  // Detailed consent information
  details: consentDetailsSchema,
  
  // Consent history
  history: [consentHistorySchema],
  
  // Preferences and granular controls
  preferences: {
    email: {
      marketing: { type: Boolean, default: false },
      transactional: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
      updates: { type: Boolean, default: true },
    },
    sms: {
      marketing: { type: Boolean, default: false },
      alerts: { type: Boolean, default: false },
      verification: { type: Boolean, default: true },
    },
    push: {
      marketing: { type: Boolean, default: false },
      alerts: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
    data: {
      analytics: { type: Boolean, default: false },
      personalization: { type: Boolean, default: false },
      sharing: { type: Boolean, default: false },
      retention: { type: Boolean, default: true },
    },
    cookies: {
      necessary: { type: Boolean, default: true },
      functional: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
    },
  },
  
  // Compliance and audit
  compliance: {
    gdpr: {
      applicable: { type: Boolean, default: false },
      lawfulBasis: String,
      dataSubject: { type: Boolean, default: false },
    },
    ccpa: {
      applicable: { type: Boolean, default: false },
      consumer: { type: Boolean, default: false },
      doNotSell: { type: Boolean, default: false },
    },
    coppa: {
      applicable: { type: Boolean, default: false },
      parentalConsent: { type: Boolean, default: false },
    },
  },
  
  // Reminders and renewals
  reminderSent: {
    type: Boolean,
    default: false,
  },
  reminderSentAt: Date,
  renewalRequired: {
    type: Boolean,
    default: false,
  },
  renewalDueAt: Date,
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  notes: String,
  tags: [String],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for performance
userConsentSchema.index({ userId: 1, type: 1 }, { unique: true });
userConsentSchema.index({ status: 1, expiresAt: 1 });
userConsentSchema.index({ renewalRequired: 1, renewalDueAt: 1 });
userConsentSchema.index({ 'compliance.gdpr.applicable': 1 });
userConsentSchema.index({ 'compliance.ccpa.applicable': 1 });

// Virtual for is expired
userConsentSchema.virtual('isExpired').get(function(this: IUserConsent): boolean {
  return Boolean(this.expiresAt && this.expiresAt < new Date());
});

// Virtual for is valid
userConsentSchema.virtual('isValid').get(function(this: IUserConsent): boolean {
  return this.granted && 
         this.status === 'granted' && 
         !this.isExpired && 
         this.isActive;
});

// Virtual for days until expiry
userConsentSchema.virtual('daysUntilExpiry').get(function(this: IUserConsent): number | null {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diffTime = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
userConsentSchema.methods.grant = async function(
  this: IUserConsent,
  method: ConsentMethod,
  source: string,
  ipAddress?: string,
  userAgent?: string,
  expiryDays?: number
): Promise<void> {
  this.status = 'granted';
  this.granted = true;
  this.grantedAt = new Date();
  this.method = method;
  this.source = source as any;
  this.ipAddress = ipAddress;
  this.userAgent = userAgent;
  
  if (expiryDays) {
    this.expiresAt = new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000));
  }
  
  // Add to history
  this.history.push({
    version: this.currentVersion,
    granted: true,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    method,
    source: source as any,
  });
  
  await this.save();
};

userConsentSchema.methods.withdraw = async function(
  this: IUserConsent,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  this.status = 'withdrawn';
  this.granted = false;
  this.withdrawnAt = new Date();
  
  // Add to history
  this.history.push({
    version: this.currentVersion,
    granted: false,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    method: 'withdrawal',
    source: 'settings',
    reason,
  });
  
  await this.save();
};

userConsentSchema.methods.deny = async function(
  this: IUserConsent,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  this.status = 'denied';
  this.granted = false;
  
  // Add to history
  this.history.push({
    version: this.currentVersion,
    granted: false,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    method: 'explicit',
    source: 'popup',
  });
  
  await this.save();
};

userConsentSchema.methods.updatePreferences = async function(
  this: IUserConsent,
  preferences: Partial<IUserConsent['preferences']>
): Promise<void> {
  this.preferences = { ...this.preferences, ...preferences };
  await this.save();
};

userConsentSchema.methods.renew = async function(
  this: IUserConsent,
  newVersion: string,
  expiryDays?: number
): Promise<void> {
  this.currentVersion = newVersion;
  this.renewalRequired = false;
  this.renewalDueAt = undefined;
  this.reminderSent = false;
  this.reminderSentAt = undefined;
  
  if (expiryDays) {
    this.expiresAt = new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000));
  }
  
  await this.save();
};

userConsentSchema.methods.scheduleRenewal = async function(
  this: IUserConsent,
  renewalDate: Date
): Promise<void> {
  this.renewalRequired = true;
  this.renewalDueAt = renewalDate;
  await this.save();
};

userConsentSchema.methods.sendReminder = async function(this: IUserConsent): Promise<void> {
  this.reminderSent = true;
  this.reminderSentAt = new Date();
  await this.save();
};

userConsentSchema.methods.checkExpiry = function(this: IUserConsent): boolean {
  if (!this.expiresAt) return false;
  
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    this.granted = false;
    return true;
  }
  
  return false;
};

// Static methods
userConsentSchema.statics.findByUserId = async function(userId: string): Promise<IUserConsent[]> {
  return this.find({ 
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true 
  }).sort({ type: 1 });
};

userConsentSchema.statics.findByType = async function(
  userId: string,
  type: ConsentType
): Promise<IUserConsent | null> {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    isActive: true,
  });
};

userConsentSchema.statics.createConsent = async function(
  userId: string,
  type: ConsentType,
  version: string,
  details: IUserConsent['details']
): Promise<IUserConsent> {
  const consent = new this({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    currentVersion: version,
    details,
    status: 'pending',
    granted: false,
    method: 'explicit',
    source: 'onboarding',
  });
  
  return await consent.save();
};

userConsentSchema.statics.getExpiringConsents = async function(
  daysAhead: number = 30
): Promise<IUserConsent[]> {
  const cutoffDate = new Date(Date.now() + (daysAhead * 24 * 60 * 60 * 1000));
  
  return this.find({
    status: 'granted',
    expiresAt: { $lte: cutoffDate, $gt: new Date() },
    isActive: true,
  }).populate('userId');
};

userConsentSchema.statics.getRenewalDue = async function(): Promise<IUserConsent[]> {
  return this.find({
    renewalRequired: true,
    renewalDueAt: { $lte: new Date() },
    isActive: true,
  }).populate('userId');
};

userConsentSchema.statics.getConsentStats = async function(
  dateRange?: { start: Date; end: Date }
) {
  const matchStage = dateRange 
    ? { createdAt: { $gte: dateRange.start, $lte: dateRange.end }, isActive: true }
    : { isActive: true };

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        granted: { $sum: { $cond: [{ $eq: ['$status', 'granted'] }, 1, 0] } },
        denied: { $sum: { $cond: [{ $eq: ['$status', 'denied'] }, 1, 0] } },
        withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
      }
    }
  ]);

  const byType = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        granted: { $sum: { $cond: [{ $eq: ['$status', 'granted'] }, 1, 0] } },
        denied: { $sum: { $cond: [{ $eq: ['$status', 'denied'] }, 1, 0] } },
        withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
      }
    }
  ]);

  const complianceStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        gdprApplicable: { $sum: { $cond: ['$compliance.gdpr.applicable', 1, 0] } },
        ccpaApplicable: { $sum: { $cond: ['$compliance.ccpa.applicable', 1, 0] } },
        coppaApplicable: { $sum: { $cond: ['$compliance.coppa.applicable', 1, 0] } },
      }
    }
  ]);

  return {
    overview: stats[0] || {
      total: 0,
      granted: 0,
      denied: 0,
      withdrawn: 0,
      expired: 0,
      pending: 0,
    },
    byType,
    compliance: complianceStats[0] || {
      gdprApplicable: 0,
      ccpaApplicable: 0,
      coppaApplicable: 0,
    },
  };
};

userConsentSchema.statics.bulkExpireOldConsents = async function(): Promise<number> {
  const result = await this.updateMany(
    {
      status: 'granted',
      expiresAt: { $lt: new Date() },
      isActive: true,
    },
    {
      status: 'expired',
      granted: false,
    }
  );

  return result.modifiedCount;
};

userConsentSchema.statics.getComplianceReport = async function(
  userId?: string
): Promise<{
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
}> {
  const query = userId 
    ? { userId: new mongoose.Types.ObjectId(userId), isActive: true }
    : { isActive: true };

  const consents = await this.find(query).populate('userId');

  return {
    user: userId,
    consents: consents.map(consent => ({
      type: consent.type,
      status: consent.status,
      granted: consent.granted,
      grantedAt: consent.grantedAt,
      method: consent.method,
      lawfulBasis: consent.details?.lawfulBasis,
      canWithdraw: consent.granted && consent.status === 'granted',
    })),
  };
};

// Pre-save middleware to check expiry
userConsentSchema.pre('save', function(this: IUserConsent, next) {
  // Check if consent has expired
  this.checkExpiry();
  
  // Set renewal due date if expiry is set
  if (this.expiresAt && !this.renewalDueAt) {
    this.renewalDueAt = new Date(this.expiresAt.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days before expiry
    this.renewalRequired = true;
  }

  next();
});

export const UserConsent = mongoose.model<IUserConsent, IUserConsentModel>('UserConsent', userConsentSchema);
export default UserConsent;