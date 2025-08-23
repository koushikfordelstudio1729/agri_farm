import { Schema, model } from 'mongoose';
import { IOTPAttempt, IOTPAttemptMethods, IOTPAttemptStatics, CreateOTPAttemptData } from './OTPAttempt.types';

const otpAttemptSchema = new Schema<IOTPAttempt, IOTPAttemptStatics, IOTPAttemptMethods>({
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15,
  },
  countryCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5,
  },
  attemptType: {
    type: String,
    required: true,
    enum: ['registration', 'login', 'phone_update', 'password_reset'],
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  blockedUntil: {
    type: Date,
  },
  metadata: {
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
otpAttemptSchema.index({ phone: 1, countryCode: 1 }, { unique: true });
otpAttemptSchema.index({ blocked: 1 });
otpAttemptSchema.index({ blockedUntil: 1 });
otpAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

// Instance methods
otpAttemptSchema.methods.incrementAttempt = async function(this: IOTPAttempt): Promise<void> {
  this.attempts += 1;
  this.lastAttempt = new Date();
  
  // Block after 5 attempts
  if (this.attempts >= 5) {
    this.blocked = true;
    this.blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  
  await this.save();
};

otpAttemptSchema.methods.isBlocked = function(this: IOTPAttempt): boolean {
  if (!this.blocked) return false;
  
  if (this.blockedUntil && new Date() > this.blockedUntil) {
    // Auto-unblock if time has passed
    this.blocked = false;
    this.blockedUntil = undefined;
    this.save();
    return false;
  }
  
  return true;
};

otpAttemptSchema.methods.block = async function(this: IOTPAttempt, durationMinutes: number = 15): Promise<void> {
  this.blocked = true;
  this.blockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  await this.save();
};

otpAttemptSchema.methods.unblock = async function(this: IOTPAttempt): Promise<void> {
  this.blocked = false;
  this.blockedUntil = undefined;
  await this.save();
};

otpAttemptSchema.methods.reset = async function(this: IOTPAttempt): Promise<void> {
  this.attempts = 0;
  this.blocked = false;
  this.blockedUntil = undefined;
  this.lastAttempt = new Date();
  await this.save();
};

// Static methods
otpAttemptSchema.statics.findByPhone = async function(
  phone: string, 
  countryCode: string
): Promise<IOTPAttempt | null> {
  return this.findOne({ phone, countryCode });
};

otpAttemptSchema.statics.createOrUpdate = async function(
  phone: string,
  countryCode: string,
  attemptType: IOTPAttempt['attemptType'],
  metadata?: IOTPAttempt['metadata']
): Promise<IOTPAttempt> {
  let attempt = await this.findOne({ phone, countryCode });
  
  if (attempt) {
    attempt.attemptType = attemptType;
    attempt.lastAttempt = new Date();
    if (metadata) attempt.metadata = metadata;
    await attempt.incrementAttempt();
  } else {
    attempt = await this.create({
      phone,
      countryCode,
      attemptType,
      attempts: 1,
      lastAttempt: new Date(),
      metadata,
    });
  }
  
  return attempt;
};

otpAttemptSchema.statics.cleanup = async function(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  });
  
  return result.deletedCount || 0;
};

otpAttemptSchema.statics.getAttemptStats = async function(
  dateRange?: { from: Date; to: Date }
): Promise<{
  totalAttempts: number;
  blockedNumbers: number;
  attemptsByType: Record<string, number>;
}> {
  const matchCondition = dateRange 
    ? { createdAt: { $gte: dateRange.from, $lte: dateRange.to } }
    : {};

  const [totalResult, blockedResult, typeResult] = await Promise.all([
    this.aggregate([
      { $match: matchCondition },
      { $group: { _id: null, total: { $sum: '$attempts' } } }
    ]),
    this.countDocuments({ ...matchCondition, blocked: true }),
    this.aggregate([
      { $match: matchCondition },
      { $group: { _id: '$attemptType', count: { $sum: '$attempts' } } }
    ])
  ]);

  return {
    totalAttempts: totalResult[0]?.total || 0,
    blockedNumbers: blockedResult,
    attemptsByType: typeResult.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};

export const OTPAttempt = model<IOTPAttempt, IOTPAttemptStatics>('OTPAttempt', otpAttemptSchema);
export default OTPAttempt;