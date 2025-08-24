import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '@/types/auth.types';

export interface DiagnosisRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  middleware: RequestHandler[];
  handler: RequestHandler;
}

export interface DiagnosisRoutes {
  createDiagnosis: DiagnosisRoute;
  getUserDiagnoses: DiagnosisRoute;
  getDiagnosisById: DiagnosisRoute;
  updateDiagnosis: DiagnosisRoute;
  deleteDiagnosis: DiagnosisRoute;
  getDiagnosisStats: DiagnosisRoute;
  batchDiagnosis: DiagnosisRoute;
  getDiagnosisByImageHash: DiagnosisRoute;
  requestExpertReview: DiagnosisRoute;
  getSimilarDiagnoses: DiagnosisRoute;
  exportDiagnosisReport: DiagnosisRoute;
  getDiagnosisTrends: DiagnosisRoute;
  shareDiagnosis: DiagnosisRoute;
}

export interface DiagnosisRouteHandlers {
  createDiagnosis: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getUserDiagnoses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getDiagnosisById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  updateDiagnosis: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  deleteDiagnosis: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getDiagnosisStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  batchDiagnosis: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getDiagnosisByImageHash: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  requestExpertReview: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getSimilarDiagnoses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  exportDiagnosisReport: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  getDiagnosisTrends: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  shareDiagnosis: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}

export interface DiagnosisQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  crop?: string;
  disease?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeExpertReviewed?: string;
}

export interface DiagnosisParams {
  diagnosisId: string;
}

export interface CreateDiagnosisRequest extends AuthenticatedRequest {
  body: {
    cropType?: string;
    plantStage?: string;
    symptoms?: string[];
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    environmentalConditions?: {
      temperature?: number;
      humidity?: number;
      soilPh?: number;
      sunlightExposure?: string;
    };
    notes?: string;
    isPublic?: boolean;
  };
  files?: Express.Multer.File[];
}

export interface UpdateDiagnosisRequest extends AuthenticatedRequest {
  params: DiagnosisParams;
  body: {
    notes?: string;
    isPublic?: boolean;
    userFeedback?: {
      rating: number;
      comment?: string;
      wasHelpful: boolean;
    };
  };
}

export interface BatchDiagnosisRequest extends AuthenticatedRequest {
  body: {
    diagnoses: Array<{
      cropType?: string;
      plantStage?: string;
      symptoms?: string[];
      notes?: string;
    }>;
    commonLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    commonEnvironmentalConditions?: {
      temperature?: number;
      humidity?: number;
      soilPh?: number;
    };
  };
  files?: Express.Multer.File[];
}

export interface ExpertReviewRequest extends AuthenticatedRequest {
  params: DiagnosisParams;
  body: {
    message?: string;
    urgency?: 'low' | 'medium' | 'high';
    preferredExpertId?: string;
    maxWaitTime?: number; // hours
  };
}

export interface ShareDiagnosisRequest extends AuthenticatedRequest {
  params: DiagnosisParams;
  body: {
    shareWith: string[]; // email addresses or user IDs
    message?: string;
    includeImages: boolean;
    includeLocation: boolean;
    shareType: 'email' | 'link' | 'direct';
    expiresIn?: number; // hours for link sharing
  };
}

export interface ExpertReviewSubmissionRequest extends AuthenticatedRequest {
  params: DiagnosisParams;
  body: {
    status: 'approved' | 'rejected' | 'needs_revision';
    comments: string;
    confidence: number;
    modifiedResults?: Array<{
      disease: string;
      confidence: number;
      severity: string;
      treatments: Array<{
        name: string;
        type: string;
        description: string;
        instructions: string[];
      }>;
      preventionMeasures: string[];
    }>;
    recommendedActions: string[];
    followUpRequired: boolean;
    followUpDate?: Date;
  };
}