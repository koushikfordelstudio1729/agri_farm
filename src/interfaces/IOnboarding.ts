import { Document, Model } from 'mongoose';
import { OnboardingStep, OnboardingStatus, FarmingExperience, FarmType } from '@/types';

export interface IOnboarding extends Document {
  userId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  totalSteps: number;
  completedSteps: number;
  steps: Array<{
    stepId: OnboardingStep;
    name: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    data?: Record<string, unknown>;
    validationErrors?: string[];
    isRequired: boolean;
  }>;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;

  // Collected data during onboarding
  profileData?: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    bio?: string;
    dateOfBirth?: Date;
  };
  locationData?: {
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
    timezone?: string;
  };
  farmingBackground?: {
    experience?: FarmingExperience;
    yearsOfExperience?: number;
    farmSize?: {
      value: number;
      unit: 'acres' | 'hectares' | 'square_meters' | 'square_feet';
    };
    farmType?: FarmType;
    primaryCrops?: string[];
    farmingMethods?: Array<'irrigation' | 'drip' | 'sprinkler' | 'rain_fed' | 'greenhouse' | 'open_field' | 'companion_planting'>;
    equipment?: string[];
    challenges?: string[];
    goals?: string[];
  };
  interests?: {
    cropsOfInterest?: string[];
    diseasesOfInterest?: string[];
    topicsOfInterest?: Array<'disease_diagnosis' | 'pest_control' | 'soil_health' | 'weather' | 'market_prices' | 'organic_farming' | 'sustainability' | 'technology'>;
    expertiseAreas?: string[];
    learningGoals?: string[];
  };
  preferences?: {
    language?: string;
    units?: 'metric' | 'imperial';
    currency?: string;
    timezone?: string;
    theme?: 'light' | 'dark' | 'auto';
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      weatherAlerts?: boolean;
      priceAlerts?: boolean;
      communityUpdates?: boolean;
      expertAdvice?: boolean;
      marketingEmails?: boolean;
    };
    privacy?: {
      shareLocation?: boolean;
      shareProfile?: boolean;
      allowDirectMessages?: boolean;
      showOnlineStatus?: boolean;
    };
  };
  consents?: Array<{
    type: 'terms_of_service' | 'privacy_policy' | 'data_processing' | 'marketing' | 'cookies';
    version: string;
    granted: boolean;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    method: 'explicit' | 'implicit' | 'pre_checked';
  }>;

  // Analytics and tracking
  sessionData: {
    device?: {
      type?: 'mobile' | 'tablet' | 'desktop';
      os?: string;
      browser?: string;
    };
    totalTimeSpent: number;
    stepTimeSpent: Map<OnboardingStep, number>;
    dropOffStep?: string;
    completionRate: number;
  };

  // Marketing and attribution
  source?: 'direct' | 'organic' | 'social' | 'referral' | 'paid' | 'email' | 'unknown';
  campaign?: string;
  referrer?: string;
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  // Configuration
  skipOptionalSteps: boolean;
  customizations?: {
    skipWelcome?: boolean;
    mandatorySteps?: string[];
    optionalSteps?: string[];
  };

  isActive: boolean;

  // Virtuals
  progressPercentage: number;
  isComplete: boolean;
  daysSinceLastActivity: number;

  // Instance methods
  initializeSteps(): Promise<void>;
  startStep(stepId: OnboardingStep): Promise<void>;
  completeStep(stepId: OnboardingStep, data?: Record<string, unknown>): Promise<void>;
  skipStep(stepId: OnboardingStep): Promise<void>;
  saveStepData(stepId: OnboardingStep, data: Record<string, unknown>): Promise<void>;
  addConsent(
    type: 'terms_of_service' | 'privacy_policy' | 'data_processing' | 'marketing' | 'cookies',
    version: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void>;
  abandon(reason?: string): Promise<void>;
}

export interface IOnboardingStatics {
  findByUserId(userId: string): Promise<IOnboarding | null>;
  createForUser(userId: string, source?: string, utmParameters?: Record<string, string>): Promise<IOnboarding>;
  getCompletionStats(dateRange?: { start: Date; end: Date }): Promise<{
    overview: {
      total: number;
      completed: number;
      inProgress: number;
      abandoned: number;
      completionRate: number;
      averageTimeSpent: number;
    };
    byStep: Array<{
      _id: OnboardingStep;
      completed: number;
      skipped: number;
      dropOffs: number;
    }>;
  }>;
  getAbandonedOnboardings(daysSinceLastActivity?: number): Promise<IOnboarding[]>;
}

export interface IOnboardingModel extends Model<IOnboarding>, IOnboardingStatics {}