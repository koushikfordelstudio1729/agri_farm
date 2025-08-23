import { Request, Response, NextFunction } from 'express';
import { IUser } from '@/models/User.types';
import { DatabaseId, PaginationQuery, FilterQuery } from '@/types/common.types';

// Extended Request interfaces
export interface AuthenticatedRequest extends Request {
  user: {
    id: DatabaseId;
    email: string;
    role: IUser['role'];
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
}

export interface GetUserRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
}

export interface UpdateProfileRequest extends AuthenticatedRequest {
  body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    countryCode?: string;
    profileImage?: string;
    language?: IUser['language'];
    timezone?: string;
    location?: IUser['location'];
    farmingExperience?: number;
    farmSize?: number;
    primaryCrops?: string[];
    farmingType?: IUser['farmingType'];
    units?: IUser['units'];
  };
}

export interface UploadProfileImageRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export interface ChangePasswordRequest extends AuthenticatedRequest {
  body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
}

export interface UpdatePreferencesRequest extends AuthenticatedRequest {
  body: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      digestFrequency?: 'immediate' | 'daily' | 'weekly' | 'never';
      diagnosisResults?: boolean;
      weatherAlerts?: boolean;
      priceAlerts?: boolean;
      communityUpdates?: boolean;
      expertReplies?: boolean;
      marketingEmails?: boolean;
    };
    privacy?: {
      showProfile?: boolean;
      showLocation?: boolean;
      showContactInfo?: boolean;
      allowDirectMessages?: boolean;
    };
    display?: {
      theme?: 'light' | 'dark' | 'auto';
      language?: IUser['language'];
      currency?: string;
      units?: 'metric' | 'imperial';
      timezone?: string;
    };
    ai?: {
      saveImages?: boolean;
      shareAnonymous?: boolean;
      improveModel?: boolean;
    };
  };
}

export interface SearchUsersRequest extends Request {
  query: PaginationQuery & FilterQuery & {
    q?: string;
    role?: IUser['role'];
    verified?: string;
    country?: string;
    state?: string;
    city?: string;
    farmingType?: IUser['farmingType'];
    subscriptionTier?: IUser['subscriptionTier'];
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface FollowUserRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
}

export interface GetFollowersRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  query: PaginationQuery;
}

export interface GetFollowingRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  query: PaginationQuery;
}

export interface BlockUserRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  body: {
    reason?: string;
  };
}

export interface ReportUserRequest extends AuthenticatedRequest {
  params: {
    userId: string;
  };
  body: {
    reason: 'spam' | 'harassment' | 'inappropriate_content' | 'fake_profile' | 'other';
    description?: string;
    evidence?: string[];
  };
}

export interface DeleteAccountRequest extends AuthenticatedRequest {
  body: {
    password: string;
    reason?: 'not_useful' | 'too_expensive' | 'privacy_concerns' | 'switching_service' | 'other';
    feedback?: string;
  };
}

export interface ExportDataRequest extends AuthenticatedRequest {
  body: {
    dataTypes: ('profile' | 'diagnoses' | 'posts' | 'messages' | 'preferences')[];
    format: 'json' | 'csv' | 'pdf';
  };
}

// Response interfaces
export interface UserProfileResponse {
  id: DatabaseId;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImage?: string;
  role: IUser['role'];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  language: IUser['language'];
  timezone: string;
  location?: IUser['location'];
  farmingExperience?: number;
  farmSize?: number;
  primaryCrops: string[];
  farmingType: IUser['farmingType'];
  subscriptionTier: IUser['subscriptionTier'];
  reputation: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  onboardingCompleted: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  canFollow?: boolean;
  isFollowing?: boolean;
  mutualFollowers?: number;
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<IUser['role'], number>;
  usersBySubscription: Record<IUser['subscriptionTier'], number>;
  newUsersThisMonth: number;
  averageSessionDuration: number;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
  growthMetrics: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  engagementMetrics: {
    averageLogin: number;
    averageDiagnoses: number;
    averagePosts: number;
  };
}

export interface FollowResponse {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

// Controller function types
export type GetProfileController = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export type GetUserController = (req: GetUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type UpdateProfileController = (req: UpdateProfileRequest, res: Response, next: NextFunction) => Promise<void>;
export type UploadProfileImageController = (req: UploadProfileImageRequest, res: Response, next: NextFunction) => Promise<void>;
export type ChangePasswordController = (req: ChangePasswordRequest, res: Response, next: NextFunction) => Promise<void>;
export type UpdatePreferencesController = (req: UpdatePreferencesRequest, res: Response, next: NextFunction) => Promise<void>;
export type SearchUsersController = (req: SearchUsersRequest, res: Response, next: NextFunction) => Promise<void>;
export type FollowUserController = (req: FollowUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type UnfollowUserController = (req: FollowUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type GetFollowersController = (req: GetFollowersRequest, res: Response, next: NextFunction) => Promise<void>;
export type GetFollowingController = (req: GetFollowingRequest, res: Response, next: NextFunction) => Promise<void>;
export type BlockUserController = (req: BlockUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type UnblockUserController = (req: FollowUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type ReportUserController = (req: ReportUserRequest, res: Response, next: NextFunction) => Promise<void>;
export type DeleteAccountController = (req: DeleteAccountRequest, res: Response, next: NextFunction) => Promise<void>;
export type ExportDataController = (req: ExportDataRequest, res: Response, next: NextFunction) => Promise<void>;
export type GetUserStatsController = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export type DeactivateAccountController = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export type ReactivateAccountController = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

// Validation schemas as types
export interface UpdateProfileValidation {
  body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    countryCode?: string;
    language?: IUser['language'];
    timezone?: string;
    farmingExperience?: number;
    farmSize?: number;
    primaryCrops?: string[];
    farmingType?: IUser['farmingType'];
    location?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    units?: {
      temperature?: 'celsius' | 'fahrenheit';
      area?: 'hectares' | 'acres';
      weight?: 'kg' | 'pounds';
    };
  };
}

export interface ChangePasswordValidation {
  body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
}