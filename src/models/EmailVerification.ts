import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  IEmailVerification,
  IEmailVerificationMethods,
  IEmailVerificationStatics,
  CreateEmailVerificationData,
  EmailVerificationStats,
  EmailBlockList
} from './EmailVerification.types';

type EmailVerificationDocument = IEmailVerification & IEmailVerificationMethods;
type EmailVerificationModel = Model<EmailVerificationDocument> & IEmailVerificationStatics;

const emailVerificationSchema = new Schema<EmailVerificationDocument, EmailVerificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      select: false, // Never include in queries
    },
    hashedOtp: {
      type: String,
      required: true,
      select: false,
    },
    purpose: {
      type: String,
      required: true,
      enum: ['registration', 'login', 'email_update', 'password_reset', 'account_verification'],
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    lastAttemptAt: Date,
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    verifiedAt: Date,
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    metadata: {
      deviceId: String,
      sessionId: String,
      referrer: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.otp;
        delete ret.hashedOtp;
        return ret;
      },
    },
  }
);

// Indexes
emailVerificationSchema.index({ email: 1, verified: 1 });
emailVerificationSchema.index({ userId: 1, purpose: 1 });
emailVerificationSchema.index({ expiresAt: 1, verified: 1 });

// Pre-save middleware to hash OTP
emailVerificationSchema.pre('save', async function(next) {
  if (!this.isModified('otp')) return next();
  
  if (this.otp) {
    const saltRounds = 10;
    this.hashedOtp = await bcrypt.hash(this.otp, saltRounds);
  }
  
  next();
});

// Instance methods
emailVerificationSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

emailVerificationSchema.methods.canRetry = function(): boolean {
  if (this.verified) return false;
  if (this.isExpired()) return false;
  return this.attempts < this.maxAttempts;
};

emailVerificationSchema.methods.incrementAttempts = async function(): Promise<void> {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  await this.save();
};

emailVerificationSchema.methods.verify = async function(inputOtp: string): Promise<boolean> {
  if (!this.canRetry()) {
    return false;
  }

  await this.incrementAttempts();

  if (!this.hashedOtp) {
    return false;
  }

  const isValid = await bcrypt.compare(inputOtp, this.hashedOtp);
  
  if (isValid && !this.isExpired()) {
    await this.markAsVerified();
    return true;
  }

  return false;
};

emailVerificationSchema.methods.markAsVerified = async function(): Promise<void> {
  this.verified = true;
  this.verifiedAt = new Date();
  await this.save();
};

emailVerificationSchema.methods.extend = async function(minutes: number = 10): Promise<void> {
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  await this.save();
};

emailVerificationSchema.methods.generateNewOtp = async function(): Promise<string> {
  const otpLength = parseInt(process.env.OTP_LENGTH || '6', 10);
  const newOtp = crypto.randomInt(Math.pow(10, otpLength - 1), Math.pow(10, otpLength)).toString();
  
  this.otp = newOtp;
  this.attempts = 0;
  this.verified = false;
  this.verifiedAt = undefined;
  this.lastAttemptAt = undefined;
  
  // Extend expiration
  const expirationMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  this.expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  await this.save();
  return newOtp;
};

// Static methods
emailVerificationSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ 
    email: email.toLowerCase().trim()
  }).sort({ createdAt: -1 }).exec();
};

emailVerificationSchema.statics.findActiveByEmail = function(email: string) {
  return this.findOne({ 
    email: email.toLowerCase().trim(),
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).exec();
};

emailVerificationSchema.statics.createVerification = async function(data: CreateEmailVerificationData) {
  const {
    userId,
    email,
    purpose,
    expirationMinutes = 10,
    ipAddress,
    userAgent,
    metadata = {},
  } = data;

  const cleanEmail = email.toLowerCase().trim();

  // Check if email is blocked
  const isBlocked = await this.isEmailBlocked(cleanEmail);
  if (isBlocked) {
    throw new Error('Email address is temporarily blocked');
  }

  // Generate OTP
  const otpLength = parseInt(process.env.OTP_LENGTH || '6', 10);
  const otp = crypto.randomInt(Math.pow(10, otpLength - 1), Math.pow(10, otpLength)).toString();
  
  // Deactivate any existing active verifications for this email
  await this.updateMany(
    { 
      email: cleanEmail,
      verified: false,
    },
    { 
      expiresAt: new Date() // Expire immediately
    }
  );

  const verification = new this({
    userId,
    email: cleanEmail,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
    ipAddress,
    userAgent,
    metadata,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  });

  await verification.save();
  return verification;
};

emailVerificationSchema.statics.cleanupExpired = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
    verified: false,
  });

  return result.deletedCount || 0;
};

emailVerificationSchema.statics.getVerificationStats = async function(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<EmailVerificationStats> {
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const [totalStats, topDomains, purposeBreakdown] = await Promise.all([
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: { $sum: { $cond: ['$verified', 1, 0] } },
          failed: { $sum: { $cond: ['$verified', 0, 1] } },
          totalAttempts: { $sum: '$attempts' },
        },
      },
    ]),
    
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $addFields: {
          domain: { $arrayElemAt: [{ $split: ['$email', '@'] }, 1] }
        }
      },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { domain: '$_id', count: 1, _id: 0 } },
    ]),
    
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = totalStats[0] || { total: 0, successful: 0, failed: 0, totalAttempts: 0 };

  return {
    totalVerifications: stats.total,
    successfulVerifications: stats.successful,
    failedVerifications: stats.failed,
    successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
    averageAttempts: stats.total > 0 ? stats.totalAttempts / stats.total : 0,
    topDomains,
    purposeBreakdown: purposeBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
  };
};

emailVerificationSchema.statics.blockEmail = async function(email: string, reason: string): Promise<void> {
  const EmailBlockListModel = mongoose.model('EmailBlockList');
  const cleanEmail = email.toLowerCase().trim();
  const domain = cleanEmail.split('@')[1];
  
  await EmailBlockListModel.findOneAndUpdate(
    { email: cleanEmail },
    {
      domain,
      reason,
      isActive: true,
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Block for 24 hours
    },
    { upsert: true, new: true }
  );
};

emailVerificationSchema.statics.unblockEmail = async function(email: string): Promise<void> {
  const EmailBlockListModel = mongoose.model('EmailBlockList');
  const cleanEmail = email.toLowerCase().trim();
  
  await EmailBlockListModel.findOneAndUpdate(
    { email: cleanEmail },
    { isActive: false }
  );
};

emailVerificationSchema.statics.isEmailBlocked = async function(email: string): Promise<boolean> {
  const EmailBlockListModel = mongoose.model('EmailBlockList');
  const cleanEmail = email.toLowerCase().trim();
  const domain = cleanEmail.split('@')[1];
  
  const blockEntry = await EmailBlockListModel.findOne({
    $or: [
      { email: cleanEmail },
      { domain: domain }
    ],
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  return !!blockEntry;
};

// Email Block List Schema
const emailBlockListSchema = new Schema<EmailBlockList>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  domain: {
    type: String,
    lowercase: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
  },
  blockedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

emailBlockListSchema.index({ email: 1 });
emailBlockListSchema.index({ domain: 1 });
emailBlockListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model<EmailVerificationDocument, EmailVerificationModel>('EmailVerification', emailVerificationSchema);
const EmailBlockListModel = mongoose.model<EmailBlockList>('EmailBlockList', emailBlockListSchema);

export { EmailBlockListModel };
export default EmailVerification;