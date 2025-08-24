import type { Request, Response } from 'express';
import type {
  OnboardingStepData,
  UserPreferences,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface StartOnboardingRequest extends AuthenticatedRequest {
  body: {
    deviceInfo?: {
      platform: 'ios' | 'android' | 'web';
      version: string;
      deviceId: string;
    };
    referralCode?: string;
    source?: string;
  };
}

export interface GetOnboardingStepsRequest extends AuthenticatedRequest {
  query: {
    userType?: 'farmer' | 'expert' | 'buyer';
  };
}

export interface UpdateOnboardingStepRequest extends AuthenticatedRequest {
  params: {
    stepId: string;
  };
  body: {
    data: {
      [key: string]: any;
    };
    isCompleted?: boolean;
  };
}

export interface GetOnboardingProgressRequest extends AuthenticatedRequest {}

export interface CompleteOnboardingRequest extends AuthenticatedRequest {
  body: {
    preferences: {
      notifications: {
        push: boolean;
        email: boolean;
        sms: boolean;
      };
      language: string;
      units: 'metric' | 'imperial';
      theme: 'light' | 'dark' | 'auto';
    };
    profile: {
      firstName: string;
      lastName: string;
      farmSize?: number;
      farmLocation?: {
        latitude: number;
        longitude: number;
        address: string;
        city: string;
        state: string;
        country: string;
      };
      cropsOfInterest?: string[];
      experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    };
    interests?: {
      diagnostics: boolean;
      community: boolean;
      marketplace: boolean;
      weather: boolean;
      expertConsultation: boolean;
    };
  };
}

export interface SkipOnboardingRequest extends AuthenticatedRequest {
  body: {
    reason?: string;
  };
}

export interface RestartOnboardingRequest extends AuthenticatedRequest {}

export interface GetOnboardingTutorialsRequest extends AuthenticatedRequest {
  query: {
    category?: string;
    feature?: string;
  };
}

export interface MarkTutorialCompletedRequest extends AuthenticatedRequest {
  params: {
    tutorialId: string;
  };
}

export interface GetOnboardingStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d' | '1y';
    userType?: 'farmer' | 'expert' | 'buyer';
  };
}

export interface UpdateOnboardingFlowRequest extends AuthenticatedRequest {
  body: {
    steps: Array<{
      id: string;
      title: string;
      description: string;
      order: number;
      isRequired: boolean;
      userTypes: ('farmer' | 'expert' | 'buyer')[];
      fields: Array<{
        name: string;
        type: string;
        label: string;
        placeholder?: string;
        required: boolean;
        options?: string[];
        validation?: any;
      }>;
    }>;
  };
}

export interface GetUserOnboardingDataRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
}

// Response interfaces
export interface OnboardingStepResponse {
  _id: DatabaseId;
  stepId: string;
  title: string;
  description: string;
  order: number;
  isRequired: boolean;
  userTypes: ('farmer' | 'expert' | 'buyer')[];
  fields: Array<{
    name: string;
    type: 'text' | 'select' | 'multiselect' | 'number' | 'location' | 'boolean' | 'date';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      message?: string;
    };
  }>;
  isCompleted: boolean;
  data?: {
    [key: string]: any;
  };
  completedAt?: Date;
}

export interface OnboardingProgressResponse {
  userId: DatabaseId;
  isStarted: boolean;
  isCompleted: boolean;
  currentStepId?: string;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  steps: OnboardingStepResponse[];
  startedAt?: Date;
  completedAt?: Date;
  lastActiveAt?: Date;
  deviceInfo?: {
    platform: string;
    version: string;
    deviceId: string;
  };
  source?: string;
  referralCode?: string;
  timeToComplete?: string;
}

export interface OnboardingTutorialResponse {
  _id: DatabaseId;
  tutorialId: string;
  title: string;
  description: string;
  category: string;
  feature: string;
  order: number;
  duration: string;
  mediaUrl?: string;
  content: Array<{
    type: 'text' | 'image' | 'video' | 'interactive';
    content: string;
    mediaUrl?: string;
    duration?: number;
  }>;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface OnboardingStatsResponse {
  period: string;
  overview: {
    totalUsers: number;
    startedOnboarding: number;
    completedOnboarding: number;
    skippedOnboarding: number;
    completionRate: number;
    averageTimeToComplete: string;
  };
  byUserType: Array<{
    userType: string;
    started: number;
    completed: number;
    completionRate: number;
  }>;
  byStep: Array<{
    stepId: string;
    stepTitle: string;
    started: number;
    completed: number;
    dropOffRate: number;
  }>;
  dropOffPoints: Array<{
    stepId: string;
    stepTitle: string;
    dropOffCount: number;
    dropOffRate: number;
  }>;
  trends: {
    daily: Array<{
      date: string;
      started: number;
      completed: number;
    }>;
  };
}

export interface UserOnboardingDataResponse {
  user: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    profileImage?: string;
  };
  onboarding: OnboardingProgressResponse;
  profile: {
    farmSize?: number;
    farmLocation?: {
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      state: string;
      country: string;
    };
    cropsOfInterest?: string[];
    experienceLevel?: string;
  };
  preferences: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    language: string;
    units: string;
    theme: string;
  };
  interests: {
    diagnostics: boolean;
    community: boolean;
    marketplace: boolean;
    weather: boolean;
    expertConsultation: boolean;
  };
}

// Controller method types
export type StartOnboardingController = (
  req: StartOnboardingRequest,
  res: TypedResponse<OnboardingProgressResponse>
) => Promise<void>;

export type GetOnboardingStepsController = (
  req: GetOnboardingStepsRequest,
  res: TypedResponse<OnboardingStepResponse[]>
) => Promise<void>;

export type UpdateOnboardingStepController = (
  req: UpdateOnboardingStepRequest,
  res: TypedResponse<OnboardingStepResponse>
) => Promise<void>;

export type GetOnboardingProgressController = (
  req: GetOnboardingProgressRequest,
  res: TypedResponse<OnboardingProgressResponse>
) => Promise<void>;

export type CompleteOnboardingController = (
  req: CompleteOnboardingRequest,
  res: TypedResponse<{
    isCompleted: boolean;
    completedAt: Date;
    timeToComplete: string;
  }>
) => Promise<void>;

export type SkipOnboardingController = (
  req: SkipOnboardingRequest,
  res: TypedResponse<{ isSkipped: boolean; reason?: string }>
) => Promise<void>;

export type RestartOnboardingController = (
  req: RestartOnboardingRequest,
  res: TypedResponse<OnboardingProgressResponse>
) => Promise<void>;

export type GetOnboardingTutorialsController = (
  req: GetOnboardingTutorialsRequest,
  res: TypedResponse<OnboardingTutorialResponse[]>
) => Promise<void>;

export type MarkTutorialCompletedController = (
  req: MarkTutorialCompletedRequest,
  res: TypedResponse<{ isCompleted: boolean; completedAt: Date }>
) => Promise<void>;

export type GetOnboardingStatsController = (
  req: GetOnboardingStatsRequest,
  res: TypedResponse<OnboardingStatsResponse>
) => Promise<void>;

export type UpdateOnboardingFlowController = (
  req: UpdateOnboardingFlowRequest,
  res: TypedResponse<{ updatedSteps: number }>
) => Promise<void>;

export type GetUserOnboardingDataController = (
  req: GetUserOnboardingDataRequest,
  res: TypedResponse<UserOnboardingDataResponse>
) => Promise<void>;

// Service response types
export interface OnboardingServiceResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface OnboardingStepValidationResult {
  isValid: boolean;
  errors: { [fieldName: string]: string[] };
  data?: any;
}

// Validation types
export interface OnboardingValidationErrors {
  stepId?: string[];
  data?: string[];
  preferences?: string[];
  profile?: string[];
  interests?: string[];
}