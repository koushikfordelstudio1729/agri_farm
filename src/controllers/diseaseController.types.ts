import type { Request, Response } from 'express';
import type {
  DiseaseData,
  SymptomData,
  DiseaseSearchFilters,
  DiseaseStats,
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

export interface GetAllDiseasesRequest extends AuthenticatedRequest {
  query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    severity?: string;
    type?: string;
    affectedCrops?: string;
    season?: string;
    isActive?: string;
  };
}

export interface GetDiseaseRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
  };
}

export interface CreateDiseaseRequest extends AuthenticatedRequest {
  body: DiseaseData;
}

export interface UpdateDiseaseRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
  };
  body: Partial<DiseaseData>;
}

export interface DeleteDiseaseRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
  };
}

export interface SearchDiseasesRequest extends AuthenticatedRequest {
  query: {
    q?: string;
    severity?: string;
    type?: string;
    affectedCrops?: string;
    symptoms?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetDiseaseTreatmentsRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
  };
}

export interface GetDiseaseStatsRequest extends AuthenticatedRequest {}

export interface AddSymptomRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
  };
  body: SymptomData;
}

export interface UpdateSymptomRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
    symptomId: string;
  };
  body: Partial<SymptomData>;
}

export interface RemoveSymptomRequest extends AuthenticatedRequest {
  params: {
    diseaseId: string;
    symptomId: string;
  };
}

// Response interfaces
export interface DiseaseResponse {
  _id: DatabaseId;
  name: string;
  scientificName: string;
  commonNames: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutritional' | 'environmental';
  symptoms: SymptomResponse[];
  causes: string[];
  favorableConditions: {
    temperature: {
      min: number;
      max: number;
    };
    humidity: {
      min: number;
      max: number;
    };
    soilMoisture: string;
    season: string[];
  };
  affectedCrops: any[];
  treatments: any[];
  preventiveMeasures: string[];
  image?: string;
  images?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: DatabaseId;
  updatedBy?: DatabaseId;
  deletedAt?: Date;
  deletedBy?: DatabaseId;
}

export interface SymptomResponse {
  id: string;
  part: 'leaf' | 'stem' | 'root' | 'fruit' | 'flower' | 'whole_plant';
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  stage: 'early' | 'middle' | 'late';
  visualIndicators: string[];
  images?: string[];
  createdAt: Date;
  updatedAt?: Date;
  createdBy: DatabaseId;
  updatedBy?: DatabaseId;
}

export interface DiseaseStatsResponse {
  overview: {
    totalDiseases: number;
    totalSeverityLevels: number;
    totalDiseaseTypes: number;
    severityLevels: string[];
    diseaseTypes: string[];
  };
  bySeverity: Array<{
    _id: string;
    count: number;
    averageTreatments: number;
  }>;
  byType: Array<{
    _id: string;
    count: number;
    averageSeverity: number;
  }>;
}

// Controller method types
export type GetAllDiseasesController = (
  req: GetAllDiseasesRequest,
  res: TypedResponse<DiseaseResponse[]>
) => Promise<void>;

export type GetDiseaseController = (
  req: GetDiseaseRequest,
  res: TypedResponse<DiseaseResponse>
) => Promise<void>;

export type CreateDiseaseController = (
  req: CreateDiseaseRequest,
  res: TypedResponse<DiseaseResponse>
) => Promise<void>;

export type UpdateDiseaseController = (
  req: UpdateDiseaseRequest,
  res: TypedResponse<DiseaseResponse>
) => Promise<void>;

export type DeleteDiseaseController = (
  req: DeleteDiseaseRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type SearchDiseasesController = (
  req: SearchDiseasesRequest,
  res: TypedResponse<DiseaseResponse[]>
) => Promise<void>;

export type GetDiseaseTreatmentsController = (
  req: GetDiseaseTreatmentsRequest,
  res: TypedResponse<any[]>
) => Promise<void>;

export type GetDiseaseStatsController = (
  req: GetDiseaseStatsRequest,
  res: TypedResponse<DiseaseStatsResponse>
) => Promise<void>;

export type AddSymptomController = (
  req: AddSymptomRequest,
  res: TypedResponse<SymptomResponse>
) => Promise<void>;

export type UpdateSymptomController = (
  req: UpdateSymptomRequest,
  res: TypedResponse<SymptomResponse>
) => Promise<void>;

export type RemoveSymptomController = (
  req: RemoveSymptomRequest,
  res: TypedResponse<{}>
) => Promise<void>;

// Service response types
export interface DiseaseServiceResult {
  success: boolean;
  disease?: DiseaseResponse;
  message?: string;
  error?: string;
}

export interface DiseaseSearchResult {
  success: boolean;
  diseases: DiseaseResponse[];
  pagination: PaginationResponse;
  message?: string;
  error?: string;
}

// Validation types
export interface DiseaseValidationErrors {
  name?: string[];
  scientificName?: string[];
  severity?: string[];
  type?: string[];
  symptoms?: string[];
  causes?: string[];
  affectedCrops?: string[];
  treatments?: string[];
  preventiveMeasures?: string[];
}