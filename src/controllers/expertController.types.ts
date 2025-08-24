import type { Request, Response } from 'express';
import type {
  ExpertData,
  ConsultationData,
  ReviewData,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  PaginationResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface GetExpertsRequest extends AuthenticatedRequest {
  query: {
    specialization?: string;
    location?: string; // "lat,lng" format
    rating?: string;
    availability?: 'now' | 'today' | 'week';
    priceRange?: string; // "min,max" format
    experience?: string;
    language?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetExpertRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
}

export interface CreateExpertProfileRequest extends AuthenticatedRequest {
  body: {
    specializations: string[];
    credentials: Array<{
      title: string;
      institution: string;
      year: number;
      verified: boolean;
    }>;
    experience: number;
    education: Array<{
      degree: string;
      field: string;
      institution: string;
      year: number;
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      credentialId?: string;
    }>;
    consultationFee: number;
    languages: string[];
    bio: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    availability?: {
      [key: string]: {
        isAvailable: boolean;
        timeSlots: Array<{
          start: string;
          end: string;
          isBooked: boolean;
        }>;
      };
    };
  };
}

export interface UpdateExpertProfileRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  body: Partial<CreateExpertProfileRequest['body']>;
}

export interface BookConsultationRequest extends AuthenticatedRequest {
  body: {
    expertId: string;
    type: 'instant' | 'scheduled';
    scheduledDate?: string;
    timeSlot?: string;
    problem: string;
    urgency?: 'low' | 'medium' | 'high';
    attachments?: Array<{
      url: string;
      type: string;
      name: string;
    }>;
    consultationFee?: number;
  };
}

export interface GetConsultationsRequest extends AuthenticatedRequest {
  query: {
    status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
    type?: 'instant' | 'scheduled';
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface UpdateConsultationRequest extends AuthenticatedRequest {
  params: {
    consultationId: string;
  };
  body: {
    status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
    notes?: string;
    rating?: number;
    review?: string;
  };
}

export interface CancelConsultationRequest extends AuthenticatedRequest {
  params: {
    consultationId: string;
  };
  body: {
    reason: string;
  };
}

export interface GetExpertStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d' | '1y';
  };
}

export interface SearchExpertsRequest extends AuthenticatedRequest {
  query: {
    q?: string;
    specialization?: string;
    location?: string;
    minRating?: string;
    maxPrice?: string;
    availability?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetExpertReviewsRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  query: {
    page?: string;
    limit?: string;
    rating?: string;
  };
}

export interface AddExpertReviewRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  body: {
    rating: number;
    review?: string;
    consultationId: string;
  };
}

export interface GetExpertAvailabilityRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  query: {
    date?: string;
  };
}

export interface SetExpertAvailabilityRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  body: {
    availability: {
      [key: string]: {
        isAvailable: boolean;
        timeSlots: Array<{
          start: string;
          end: string;
          isBooked: boolean;
        }>;
      };
    };
  };
}

export interface GetConsultationHistoryRequest extends AuthenticatedRequest {
  query: {
    page?: string;
    limit?: string;
  };
}

export interface ApproveExpertRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  body: {
    notes?: string;
  };
}

export interface RejectExpertRequest extends AuthenticatedRequest {
  params: {
    expertId: string;
  };
  body: {
    reason: string;
  };
}

// Response interfaces
export interface ExpertResponse {
  _id: DatabaseId;
  user: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
    email?: string;
  };
  specializations: string[];
  credentials: Array<{
    title: string;
    institution: string;
    year: number;
    verified: boolean;
  }>;
  experience: number;
  education: Array<{
    degree: string;
    field: string;
    institution: string;
    year: number;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    credentialId?: string;
    verified: boolean;
  }>;
  consultationFee: number;
  languages: string[];
  bio: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  availability: {
    [key: string]: {
      isAvailable: boolean;
      timeSlots: Array<{
        start: string;
        end: string;
        isBooked: boolean;
      }>;
    };
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
  averageResponseTime?: string;
  successRate?: number;
  reviews?: ReviewResponse[];
  statistics?: {
    totalConsultations: number;
    completedConsultations: number;
    responseTime: string;
    successRate: number;
  };
  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: DatabaseId;
  rejectedBy?: DatabaseId;
  approvalNotes?: string;
  rejectionReason?: string;
}

export interface ConsultationResponse {
  _id: DatabaseId;
  user: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  expert: ExpertResponse;
  type: 'instant' | 'scheduled';
  scheduledDate?: Date;
  timeSlot?: string;
  problem: string;
  urgency: 'low' | 'medium' | 'high';
  attachments: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  consultationFee: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  rating?: number;
  review?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: DatabaseId;
}

export interface ExpertStatsResponse {
  period: string;
  overview: {
    totalConsultations: number;
    completedConsultations: number;
    cancelledConsultations: number;
    totalEarnings: number;
    averageRating: number;
  };
  profile: {
    totalReviews: number;
    averageRating: number;
    responseTime: string;
    completionRate: number;
  };
  earnings: {
    total: number;
    average: number;
    currency: string;
  };
}

export interface ReviewResponse {
  _id: DatabaseId;
  user: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  consultation?: DatabaseId;
  rating: number;
  review?: string;
  createdAt: Date;
}

export interface AvailabilityResponse {
  expertId: DatabaseId;
  availability: {
    [key: string]: {
      isAvailable: boolean;
      timeSlots: Array<{
        start: string;
        end: string;
        isBooked: boolean;
      }>;
    };
  };
  lastUpdated: Date;
}

// Controller method types
export type GetExpertsController = (
  req: GetExpertsRequest,
  res: TypedResponse<ExpertResponse[]>
) => Promise<void>;

export type GetExpertController = (
  req: GetExpertRequest,
  res: TypedResponse<ExpertResponse>
) => Promise<void>;

export type CreateExpertProfileController = (
  req: CreateExpertProfileRequest,
  res: TypedResponse<ExpertResponse>
) => Promise<void>;

export type UpdateExpertProfileController = (
  req: UpdateExpertProfileRequest,
  res: TypedResponse<ExpertResponse>
) => Promise<void>;

export type BookConsultationController = (
  req: BookConsultationRequest,
  res: TypedResponse<ConsultationResponse>
) => Promise<void>;

export type GetConsultationsController = (
  req: GetConsultationsRequest,
  res: TypedResponse<ConsultationResponse[]>
) => Promise<void>;

export type UpdateConsultationController = (
  req: UpdateConsultationRequest,
  res: TypedResponse<ConsultationResponse>
) => Promise<void>;

export type CancelConsultationController = (
  req: CancelConsultationRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetExpertStatsController = (
  req: GetExpertStatsRequest,
  res: TypedResponse<ExpertStatsResponse>
) => Promise<void>;

export type SearchExpertsController = (
  req: SearchExpertsRequest,
  res: TypedResponse<ExpertResponse[]>
) => Promise<void>;

export type GetExpertReviewsController = (
  req: GetExpertReviewsRequest,
  res: TypedResponse<ReviewResponse[]>
) => Promise<void>;

export type AddExpertReviewController = (
  req: AddExpertReviewRequest,
  res: TypedResponse<ReviewResponse>
) => Promise<void>;

export type GetExpertAvailabilityController = (
  req: GetExpertAvailabilityRequest,
  res: TypedResponse<AvailabilityResponse>
) => Promise<void>;

export type SetExpertAvailabilityController = (
  req: SetExpertAvailabilityRequest,
  res: TypedResponse<AvailabilityResponse>
) => Promise<void>;

export type GetConsultationHistoryController = (
  req: GetConsultationHistoryRequest,
  res: TypedResponse<ConsultationResponse[]>
) => Promise<void>;

export type ApproveExpertController = (
  req: ApproveExpertRequest,
  res: TypedResponse<ExpertResponse>
) => Promise<void>;

export type RejectExpertController = (
  req: RejectExpertRequest,
  res: TypedResponse<{}>
) => Promise<void>;

// Service response types
export interface ExpertServiceResult {
  success: boolean;
  expert?: ExpertResponse;
  message?: string;
  error?: string;
}

export interface ConsultationServiceResult {
  success: boolean;
  consultation?: ConsultationResponse;
  message?: string;
  error?: string;
}

export interface ExpertSearchResult {
  success: boolean;
  experts: ExpertResponse[];
  pagination: PaginationResponse;
  message?: string;
  error?: string;
}

// Validation types
export interface ExpertValidationErrors {
  specializations?: string[];
  credentials?: string[];
  experience?: string[];
  education?: string[];
  consultationFee?: string[];
  languages?: string[];
  bio?: string[];
  location?: string[];
  availability?: string[];
}

export interface ConsultationValidationErrors {
  expertId?: string[];
  type?: string[];
  scheduledDate?: string[];
  timeSlot?: string[];
  problem?: string[];
  urgency?: string[];
  attachments?: string[];
}