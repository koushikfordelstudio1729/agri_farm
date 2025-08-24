import { Request, Response } from 'express';
import { 
  ExpertResponse,
  ExpertSearchQuery,
  BookConsultationRequest,
  ConsultationResponse,
  UpdateConsultationRequest,
  CancelConsultationRequest,
  ExpertReviewRequest,
  ExpertReviewResponse,
  CreateExpertProfileRequest,
  UpdateExpertProfileRequest,
  SetAvailabilityRequest,
  UpdateConsultationAsExpertRequest,
  ExpertApplicationRequest,
  SpecializationRequest
} from '@/controllers/expertController.types';

// Route parameter types
export interface ExpertParamsWithId {
  expertId: string;
}

export interface ConsultationParamsWithId {
  consultationId: string;
}

export interface SpecializationParams {
  specializationId: string;
}

// Query parameter types
export interface GetExpertsQuery {
  specialization?: string;
  location?: string;
  rating?: string;
  availability?: 'now' | 'today' | 'week';
  priceRange?: string;
  experience?: string;
  language?: string;
  page?: string;
  limit?: string;
  sortBy?: 'rating' | 'experience' | 'price' | 'distance' | 'availability';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchExpertsQuery {
  q: string;
  specialization?: string;
  location?: string;
  page?: string;
  limit?: string;
}

export interface GetExpertReviewsQuery {
  page?: string;
  limit?: string;
  rating?: string;
}

export interface GetExpertAvailabilityQuery {
  date?: string;
  timezone?: string;
}

export interface GetUserConsultationsQuery {
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  type?: 'instant' | 'scheduled';
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
  sortBy?: 'date' | 'status' | 'expert';
  sortOrder?: 'asc' | 'desc';
}

export interface GetRecommendedExpertsQuery {
  limit?: string;
  includeCrops?: string;
  includeLocation?: string;
}

export interface GetExpertConsultationsQuery {
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

export interface GetExpertStatsQuery {
  period?: '7d' | '30d' | '90d' | '1y';
}

export interface GetConsultationHistoryQuery {
  page?: string;
  limit?: string;
}

export interface GetExpertEarningsQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
  year?: string;
  month?: string;
}

export interface GetPendingApplicationsQuery {
  page?: string;
  limit?: string;
  specialization?: string;
}

export interface GetExpertAnalyticsQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
  specialization?: string;
}

// Express request types
export interface GetExpertsRequestHandler extends Request<{}, ExpertResponse[], {}, GetExpertsQuery> {}
export interface GetExpertRequestHandler extends Request<ExpertParamsWithId, ExpertResponse> {}
export interface SearchExpertsRequestHandler extends Request<{}, ExpertResponse[], {}, SearchExpertsQuery> {}

export interface GetExpertReviewsRequestHandler extends Request<ExpertParamsWithId, ExpertReviewResponse[], {}, GetExpertReviewsQuery> {}
export interface GetExpertAvailabilityRequestHandler extends Request<ExpertParamsWithId, any, {}, GetExpertAvailabilityQuery> {}

export interface BookConsultationRequestHandler extends Request<ExpertParamsWithId, ConsultationResponse, BookConsultationRequest> {}
export interface GetUserConsultationsRequestHandler extends Request<{}, ConsultationResponse[], {}, GetUserConsultationsQuery> {}
export interface GetConsultationRequestHandler extends Request<ConsultationParamsWithId, ConsultationResponse> {}
export interface UpdateConsultationRequestHandler extends Request<ConsultationParamsWithId, ConsultationResponse, UpdateConsultationRequest> {}
export interface CancelConsultationRequestHandler extends Request<ConsultationParamsWithId, any, CancelConsultationRequest> {}

export interface AddExpertReviewRequestHandler extends Request<ExpertParamsWithId, ExpertReviewResponse, ExpertReviewRequest> {}
export interface GetRecommendedExpertsRequestHandler extends Request<{}, ExpertResponse[], {}, GetRecommendedExpertsQuery> {}

export interface CreateExpertProfileRequestHandler extends Request<{}, ExpertResponse, CreateExpertProfileRequest> {}
export interface UpdateExpertProfileRequestHandler extends Request<{}, ExpertResponse, UpdateExpertProfileRequest> {}
export interface GetOwnExpertProfileRequestHandler extends Request<{}, ExpertResponse> {}

export interface SetExpertAvailabilityRequestHandler extends Request<{}, any, SetAvailabilityRequest> {}
export interface GetExpertConsultationsRequestHandler extends Request<{}, ConsultationResponse[], {}, GetExpertConsultationsQuery> {}
export interface UpdateConsultationAsExpertRequestHandler extends Request<ConsultationParamsWithId, ConsultationResponse, UpdateConsultationAsExpertRequest> {}

export interface GetExpertStatsRequestHandler extends Request<{}, any, {}, GetExpertStatsQuery> {}
export interface GetConsultationHistoryRequestHandler extends Request<{}, ConsultationResponse[], {}, GetConsultationHistoryQuery> {}
export interface GetExpertEarningsRequestHandler extends Request<{}, any, {}, GetExpertEarningsQuery> {}
export interface RequestPayoutRequestHandler extends Request<{}, any, { amount: number; paymentMethod: string; accountDetails: any }> {}

export interface GetPendingApplicationsRequestHandler extends Request<{}, ExpertResponse[], {}, GetPendingApplicationsQuery> {}
export interface ApproveExpertRequestHandler extends Request<ExpertParamsWithId, any, ExpertApplicationRequest> {}
export interface RejectExpertRequestHandler extends Request<ExpertParamsWithId, any, { reason: string; feedback?: string }> {}
export interface SuspendExpertRequestHandler extends Request<ExpertParamsWithId, any, { reason: string; duration?: number }> {}

export interface GetExpertAnalyticsRequestHandler extends Request<{}, any, {}, GetExpertAnalyticsQuery> {}
export interface AddSpecializationRequestHandler extends Request<{}, any, SpecializationRequest> {}
export interface UpdateSpecializationRequestHandler extends Request<SpecializationParams, any, Partial<SpecializationRequest>> {}
export interface DeleteSpecializationRequestHandler extends Request<SpecializationParams, any> {}

// Response types with Express
export interface ExpertResponseHandler extends Response<ExpertResponse> {}
export interface ExpertsListResponseHandler extends Response<ExpertResponse[]> {}
export interface ConsultationResponseHandler extends Response<ConsultationResponse> {}
export interface ConsultationsListResponseHandler extends Response<ConsultationResponse[]> {}
export interface ExpertReviewResponseHandler extends Response<ExpertReviewResponse> {}
export interface ExpertActionResponseHandler extends Response<any> {}