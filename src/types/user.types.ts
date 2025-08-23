import type { 
  UserRole, 
  DatabaseId, 
  BaseDocument, 
  LanguageCode, 
  ContactInfo, 
  Address,
  LocationData
} from './common.types';

export interface UserProfile {
  id: DatabaseId;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  profileImage?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredLanguage: LanguageCode;
  location?: LocationData;
  bio?: string;
  expertise?: string[];
  farmingExperience?: number;
  cropsOfInterest?: string[];
  farmSize?: number;
  farmType?: 'organic' | 'conventional' | 'hydroponic' | 'greenhouse';
  contactInfo?: ContactInfo;
  address?: Address;
  timezone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    weatherAlerts: boolean;
    priceAlerts: boolean;
    communityUpdates: boolean;
    expertReplies: boolean;
    marketingEmails: boolean;
  };
  privacy: {
    showProfile: boolean;
    showLocation: boolean;
    showContactInfo: boolean;
    allowDirectMessages: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: LanguageCode;
    currency: string;
    units: 'metric' | 'imperial';
    timezone: string;
  };
  ai: {
    saveImages: boolean;
    shareAnonymous: boolean;
    improveModel: boolean;
  };
}

export interface UserStats {
  totalDiagnoses: number;
  successfulDiagnoses: number;
  communityPosts: number;
  communityLikes: number;
  consultationsRequested: number;
  consultationsCompleted: number;
  expertRating?: number;
  joinDate: Date;
  lastActiveDate: Date;
}

// ExpertProfile is now defined in expert.types.ts

export interface UserActivity {
  id: DatabaseId;
  userId: DatabaseId;
  action: string;
  resource: string;
  resourceId?: DatabaseId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserDevice {
  id: string;
  userId: DatabaseId;
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  fcmToken?: string;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  preferredLanguage?: LanguageCode;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingConsent?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  bio?: string;
  location?: LocationData;
  expertise?: string[];
  farmingExperience?: number;
  cropsOfInterest?: string[];
  farmSize?: number;
  farmType?: 'organic' | 'conventional' | 'hydroponic' | 'greenhouse';
  contactInfo?: ContactInfo;
  address?: Address;
  timezone?: string;
}

export interface UserSearchFilters {
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  hasExpertProfile?: boolean;
  location?: {
    country?: string;
    state?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  expertise?: string[];
  farmType?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  dateJoined?: {
    from?: Date;
    to?: Date;
  };
}

export interface UserListResponse {
  users: UserProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface DeleteUserRequest {
  password: string;
  reason?: string;
  deleteData?: boolean;
}