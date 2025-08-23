import type { Request, Response } from 'express';
import type {
  CreateDiagnosisRequest,
  DiagnosisResponse,
  Diagnosis,
  DiagnosisListFilters,
  DiagnosisStats,
  ExpertDiagnosisReview,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  PaginationQuery,
  AuthenticatedRequest
} from '@/types';

// Request interfaces
export interface CreateDiagnosisApiRequest extends AuthenticatedRequest {
  body: Omit<CreateDiagnosisRequest, 'images'>;
  files?: Express.Multer.File[];
}

export interface GetDiagnosisRequest extends AuthenticatedRequest<{ id: string }> {}

export interface ListDiagnosesRequest extends AuthenticatedRequest<{}, {}, DiagnosisListFilters & PaginationQuery> {}

export interface UpdateDiagnosisRequest extends AuthenticatedRequest<{ id: string }> {
  body: {
    shareAnonymous?: boolean;
    shareForResearch?: boolean;
    tags?: string[];
  };
}

export interface SubmitFeedbackRequest extends AuthenticatedRequest<{ id: string }> {
  body: {
    rating: number;
    comment?: string;
    isHelpful: boolean;
  };
}

export interface ExpertReviewRequest extends AuthenticatedRequest<{ id: string }> {
  body: ExpertDiagnosisReview;
}

export interface RetryDiagnosisRequest extends AuthenticatedRequest<{ id: string }> {}

export interface DeleteDiagnosisRequest extends AuthenticatedRequest<{ id: string }> {}

export interface GetDiagnosisStatsRequest extends AuthenticatedRequest {
  query: {
    startDate?: string;
    endDate?: string;
    cropId?: string;
    userId?: string;
  };
}

export interface GetPublicDiagnosesRequest extends Request {
  query: DiagnosisListFilters & PaginationQuery;
}

export interface BatchDiagnosisRequest extends AuthenticatedRequest {
  body: {
    diagnoses: Omit<CreateDiagnosisRequest, 'images'>[];
  };
  files?: Express.Multer.File[];
}

// Response interfaces
export interface DiagnosisApiResponse extends ApiResponse<DiagnosisResponse> {}

export interface DiagnosisListResponse extends ApiResponse<{
  diagnoses: Diagnosis[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> {}

export interface DiagnosisStatsResponse extends ApiResponse<DiagnosisStats> {}

export interface DiagnosisDetailsResponse extends ApiResponse<Diagnosis> {}

// Controller method types
export type CreateDiagnosisController = (
  req: CreateDiagnosisApiRequest,
  res: TypedResponse<DiagnosisResponse>
) => Promise<void>;

export type GetDiagnosisController = (
  req: GetDiagnosisRequest,
  res: TypedResponse<Diagnosis>
) => Promise<void>;

export type ListDiagnosesController = (
  req: ListDiagnosesRequest,
  res: TypedResponse<{
    diagnoses: Diagnosis[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>
) => Promise<void>;

export type UpdateDiagnosisController = (
  req: UpdateDiagnosisRequest,
  res: TypedResponse<Diagnosis>
) => Promise<void>;

export type SubmitFeedbackController = (
  req: SubmitFeedbackRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type DeleteDiagnosisController = (
  req: DeleteDiagnosisRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type RetryDiagnosisController = (
  req: RetryDiagnosisRequest,
  res: TypedResponse<DiagnosisResponse>
) => Promise<void>;

export type ExpertReviewController = (
  req: ExpertReviewRequest,
  res: TypedResponse<{ message: string }>
) => Promise<void>;

export type GetDiagnosisStatsController = (
  req: GetDiagnosisStatsRequest,
  res: TypedResponse<DiagnosisStats>
) => Promise<void>;

export type GetPublicDiagnosesController = (
  req: GetPublicDiagnosesRequest,
  res: TypedResponse<{
    diagnoses: Partial<Diagnosis>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>
) => Promise<void>;

export type BatchDiagnosisController = (
  req: BatchDiagnosisRequest,
  res: TypedResponse<{
    batchId: string;
    diagnoses: DiagnosisResponse[];
    summary: {
      total: number;
      created: number;
      failed: number;
    };
  }>
) => Promise<void>;

// Service interfaces
export interface DiagnosisProcessingResult {
  success: boolean;
  results?: any[];
  confidence?: number;
  processingTime: number;
  error?: string;
}

export interface ImageProcessingResult {
  processedImages: {
    id: string;
    url: string;
    thumbnailUrl: string;
    metadata: {
      size: number;
      format: string;
      width: number;
      height: number;
      colorSpace: string;
      quality?: number;
    };
  }[];
  errors: string[];
}