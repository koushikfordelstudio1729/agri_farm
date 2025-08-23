import mongoose, { Schema, Model } from 'mongoose';
import { IOnboarding, IOnboardingModel } from '@/interfaces/IOnboarding';
import { OnboardingStep, OnboardingStatus, FarmingExperience, FarmType } from '@/types';

const stepProgressSchema = new Schema({
  stepId: {
    type: String,
    required: true,
    enum: ['welcome', 'profile', 'location', 'farming_background', 'interests', 'notifications', 'consent', 'complete'],
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started',
  },
  startedAt: Date,
  completedAt: Date,
  data: Schema.Types.Mixed,
  validationErrors: [String],
  isRequired: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const farmingBackgroundSchema = new Schema({
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'experienced', 'expert'],
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    max: 100,
  },
  farmSize: {
    value: Number,
    unit: {
      type: String,
      enum: ['acres', 'hectares', 'square_meters', 'square_feet'],
      default: 'acres',
    },
  },
  farmType: {
    type: String,
    enum: ['organic', 'conventional', 'hydroponic', 'greenhouse', 'permaculture', 'mixed'],
  },
  primaryCrops: [String],
  farmingMethods: [{
    type: String,
    enum: ['irrigation', 'drip', 'sprinkler', 'rain_fed', 'greenhouse', 'open_field', 'companion_planting'],
  }],
  equipment: [String],
  challenges: [String],
  goals: [String],
}, { _id: false });

const preferencesSchema = new Schema({
  language: {
    type: String,
    enum: ['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'],
    default: 'en',
  },
  units: {
    type: String,
    enum: ['metric', 'imperial'],
    default: 'metric',
  },
  currency: {
    type: String,
    default: 'USD',
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light',
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    weatherAlerts: { type: Boolean, default: true },
    priceAlerts: { type: Boolean, default: true },
    communityUpdates: { type: Boolean, default: true },
    expertAdvice: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
  },
  privacy: {
    shareLocation: { type: Boolean, default: false },
    shareProfile: { type: Boolean, default: true },
    allowDirectMessages: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },
  },
}, { _id: false });

const consentRecordSchema = new Schema({
  type: {
    type: String,
    enum: ['terms_of_service', 'privacy_policy', 'data_processing', 'marketing', 'cookies'],
    required: true,
  },
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
    enum: ['explicit', 'implicit', 'pre_checked'],
    default: 'explicit',
  },
}, { _id: false });

const onboardingSchema = new Schema<IOnboarding>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
    default: 'not_started',
    index: true,
  },
  currentStep: {
    type: String,
    enum: ['welcome', 'profile', 'location', 'farming_background', 'interests', 'notifications', 'consent', 'complete'],
    default: 'welcome',
  },
  totalSteps: {
    type: Number,
    default: 8,
  },
  completedSteps: {
    type: Number,
    default: 0,
  },
  steps: [stepProgressSchema],
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  
  // Collected data during onboarding
  profileData: {
    firstName: String,
    lastName: String,
    profileImage: String,
    bio: String,
    dateOfBirth: Date,
  },
  locationData: {
    country: String,
    state: String,
    city: String,
    zipCode: String,
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    address: String,
    timezone: String,
  },
  farmingBackground: farmingBackgroundSchema,
  interests: {
    cropsOfInterest: [String],
    diseasesOfInterest: [String],
    topicsOfInterest: [{
      type: String,
      enum: ['disease_diagnosis', 'pest_control', 'soil_health', 'weather', 'market_prices', 'organic_farming', 'sustainability', 'technology'],
    }],
    expertiseAreas: [String],
    learningGoals: [String],
  },
  preferences: preferencesSchema,
  consents: [consentRecordSchema],
  
  // Analytics and tracking
  sessionData: {
    device: {
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop'],
      },
      os: String,
      browser: String,
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    stepTimeSpent: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    dropOffStep: String,
    completionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  
  // Marketing and attribution
  source: {
    type: String,
    enum: ['direct', 'organic', 'social', 'referral', 'paid', 'email', 'unknown'],
    default: 'unknown',
  },
  campaign: String,
  referrer: String,
  utmParameters: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String,
  },
  
  // Configuration
  skipOptionalSteps: {
    type: Boolean,
    default: false,
  },
  customizations: {
    skipWelcome: { type: Boolean, default: false },
    mandatorySteps: [String],
    optionalSteps: [String],
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
onboardingSchema.index({ userId: 1 });
onboardingSchema.index({ status: 1, createdAt: -1 });
onboardingSchema.index({ currentStep: 1 });
onboardingSchema.index({ completedAt: -1 });

// Virtual for progress percentage
onboardingSchema.virtual('progressPercentage').get(function(this: IOnboarding): number {
  return Math.round((this.completedSteps / this.totalSteps) * 100);
});

// Virtual for is complete
onboardingSchema.virtual('isComplete').get(function(this: IOnboarding): boolean {
  return this.status === 'completed';
});

// Virtual for time since last activity
onboardingSchema.virtual('daysSinceLastActivity').get(function(this: IOnboarding): number {
  const now = new Date();
  const lastActivity = this.lastActivityAt || this.createdAt;
  return Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
});

// Instance methods
onboardingSchema.methods.initializeSteps = async function(this: IOnboarding): Promise<void> {
  const defaultSteps: Array<{
    stepId: OnboardingStep;
    name: string;
    isRequired: boolean;
  }> = [
    { stepId: 'welcome', name: 'Welcome', isRequired: true },
    { stepId: 'profile', name: 'Profile Setup', isRequired: true },
    { stepId: 'location', name: 'Location', isRequired: true },
    { stepId: 'farming_background', name: 'Farming Background', isRequired: false },
    { stepId: 'interests', name: 'Interests', isRequired: false },
    { stepId: 'notifications', name: 'Notifications', isRequired: false },
    { stepId: 'consent', name: 'Privacy & Consent', isRequired: true },
    { stepId: 'complete', name: 'Complete', isRequired: true },
  ];

  this.steps = defaultSteps.map(step => ({
    stepId: step.stepId,
    name: step.name,
    status: 'not_started',
    isRequired: step.isRequired,
  }));

  this.totalSteps = defaultSteps.length;
  await this.save();
};

onboardingSchema.methods.startStep = async function(
  this: IOnboarding,
  stepId: OnboardingStep
): Promise<void> {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step) {
    step.status = 'in_progress';
    step.startedAt = new Date();
    this.currentStep = stepId;
    this.lastActivityAt = new Date();
    await this.save();
  }
};

onboardingSchema.methods.completeStep = async function(
  this: IOnboarding,
  stepId: OnboardingStep,
  data?: Record<string, unknown>
): Promise<void> {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step && step.status !== 'completed') {
    step.status = 'completed';
    step.completedAt = new Date();
    step.data = data;
    
    this.completedSteps += 1;
    this.lastActivityAt = new Date();
    
    // Update session data
    if (step.startedAt) {
      const timeSpent = new Date().getTime() - step.startedAt.getTime();
      this.sessionData.totalTimeSpent += timeSpent;
      this.sessionData.stepTimeSpent.set(stepId, timeSpent);
    }
    
    // Move to next step
    const currentIndex = this.steps.findIndex(s => s.stepId === stepId);
    const nextStep = this.steps[currentIndex + 1];
    if (nextStep) {
      this.currentStep = nextStep.stepId;
    }
    
    // Check if onboarding is complete
    if (this.completedSteps === this.totalSteps) {
      this.status = 'completed';
      this.completedAt = new Date();
    } else {
      this.status = 'in_progress';
    }
    
    this.sessionData.completionRate = Math.round((this.completedSteps / this.totalSteps) * 100);
    
    await this.save();
  }
};

onboardingSchema.methods.skipStep = async function(
  this: IOnboarding,
  stepId: OnboardingStep
): Promise<void> {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step && !step.isRequired) {
    step.status = 'skipped';
    this.completedSteps += 1;
    this.lastActivityAt = new Date();
    
    // Move to next step
    const currentIndex = this.steps.findIndex(s => s.stepId === stepId);
    const nextStep = this.steps[currentIndex + 1];
    if (nextStep) {
      this.currentStep = nextStep.stepId;
    }
    
    await this.save();
  }
};

onboardingSchema.methods.saveStepData = async function(
  this: IOnboarding,
  stepId: OnboardingStep,
  data: Record<string, unknown>
): Promise<void> {
  switch (stepId) {
    case 'profile':
      this.profileData = { ...this.profileData, ...data };
      break;
    case 'location':
      this.locationData = { ...this.locationData, ...data };
      break;
    case 'farming_background':
      this.farmingBackground = { ...this.farmingBackground, ...data };
      break;
    case 'interests':
      this.interests = { ...this.interests, ...data };
      break;
    case 'notifications':
      this.preferences = { ...this.preferences, ...data };
      break;
  }
  
  await this.save();
};

onboardingSchema.methods.addConsent = async function(
  this: IOnboarding,
  type: 'terms_of_service' | 'privacy_policy' | 'data_processing' | 'marketing' | 'cookies',
  version: string,
  granted: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  if (!this.consents) {
    this.consents = [];
  }
  
  this.consents.push({
    type,
    version,
    granted,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    method: 'explicit',
  });
  
  await this.save();
};

onboardingSchema.methods.abandon = async function(
  this: IOnboarding,
  reason?: string
): Promise<void> {
  this.status = 'abandoned';
  this.sessionData.dropOffStep = this.currentStep;
  this.lastActivityAt = new Date();
  
  if (reason) {
    this.sessionData.dropOffStep = `${this.currentStep}:${reason}`;
  }
  
  await this.save();
};

// Static methods
onboardingSchema.statics.findByUserId = async function(userId: string): Promise<IOnboarding | null> {
  return this.findOne({ userId, isActive: true });
};

onboardingSchema.statics.createForUser = async function(
  userId: string,
  source?: string,
  utmParameters?: Record<string, string>
): Promise<IOnboarding> {
  const onboarding = new this({
    userId: new mongoose.Types.ObjectId(userId),
    source,
    utmParameters,
    status: 'not_started',
  });
  
  await onboarding.initializeSteps();
  return onboarding;
};

onboardingSchema.statics.getCompletionStats = async function(
  dateRange?: { start: Date; end: Date }
) {
  const matchStage = dateRange 
    ? { createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
    : {};

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        abandoned: { $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] } },
        avgCompletionRate: { $avg: '$sessionData.completionRate' },
        avgTimeSpent: { $avg: '$sessionData.totalTimeSpent' },
      }
    }
  ]);

  const stepStats = await this.aggregate([
    { $match: matchStage },
    { $unwind: '$steps' },
    {
      $group: {
        _id: '$steps.stepId',
        completed: { $sum: { $cond: [{ $eq: ['$steps.status', 'completed'] }, 1, 0] } },
        skipped: { $sum: { $cond: [{ $eq: ['$steps.status', 'skipped'] }, 1, 0] } },
        dropOffs: { $sum: { $cond: [{ $eq: ['$sessionData.dropOffStep', '$steps.stepId'] }, 1, 0] } },
      }
    }
  ]);

  return {
    overview: stats[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      abandoned: 0,
      completionRate: 0,
      averageTimeSpent: 0,
    },
    byStep: stepStats,
  };
};

onboardingSchema.statics.getAbandonedOnboardings = async function(
  daysSinceLastActivity: number = 7
): Promise<IOnboarding[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActivity);

  return this.find({
    status: 'in_progress',
    lastActivityAt: { $lt: cutoffDate },
    isActive: true,
  }).sort({ lastActivityAt: 1 });
};

// Pre-save middleware
onboardingSchema.pre('save', function(this: IOnboarding, next) {
  // Update completion rate
  this.sessionData.completionRate = Math.round((this.completedSteps / this.totalSteps) * 100);
  
  // Update last activity
  if (this.isModified() && !this.isNew) {
    this.lastActivityAt = new Date();
  }

  next();
});

export const Onboarding = mongoose.model<IOnboarding, IOnboardingModel>('Onboarding', onboardingSchema);
export default Onboarding;