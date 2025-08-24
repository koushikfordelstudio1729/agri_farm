import type { Request, Response } from 'express';
import type {
  CropData,
  CropVarietyData,
  CropSearchFilters,
  CropStats,
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

export interface GetAllCropsRequest extends AuthenticatedRequest {
  query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    category?: string;
    season?: string;
    region?: string;
    growthDuration?: string;
    isActive?: string;
  };
}

export interface GetCropRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
}

export interface CreateCropRequest extends AuthenticatedRequest {
  body: CropData;
}

export interface UpdateCropRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
  body: Partial<CropData>;
}

export interface DeleteCropRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
}

export interface SearchCropsRequest extends AuthenticatedRequest {
  query: {
    q?: string;
    category?: string;
    season?: string;
    region?: string;
    minGrowthDuration?: string;
    maxGrowthDuration?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetCropDiseasesRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
}

export interface GetCropTreatmentsRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
}

export interface GetCropStatsRequest extends AuthenticatedRequest {}

export interface AddCropVarietyRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
  };
  body: CropVarietyData;
}

export interface UpdateCropVarietyRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
    varietyId: string;
  };
  body: Partial<CropVarietyData>;
}

export interface DeleteCropVarietyRequest extends AuthenticatedRequest {
  params: {
    cropId: string;
    varietyId: string;
  };
}

// Response interfaces
export interface CropResponse {
  _id: DatabaseId;
  name: string;
  scientificName: string;
  commonNames: string[];
  description: string;
  category: string;
  seasons: string[];
  regions: string[];
  growthDuration: number;
  nutritionalNeeds: {
    soilType: string[];
    phRange: {
      min: number;
      max: number;
    };
    nutrients: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
    };
    waterRequirements: string;
    sunlightRequirements: string;
  };
  plantingCalendar: {
    sowingMonths: number[];
    harvestingMonths: number[];
    optimalTemperature: {
      min: number;
      max: number;
    };
  };
  varieties: CropVarietyResponse[];
  diseases: any[];
  treatments: any[];
  image?: string;
  images?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: DatabaseId;
  updatedBy?: DatabaseId;
}

export interface CropVarietyResponse {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  averageYield: number;
  resistantDiseases: string[];
  maturingDays: number;
  seedRate: number;
  spacing: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: DatabaseId;
  updatedBy?: DatabaseId;
}

export interface CropStatsResponse {
  overview: {
    totalCrops: number;
    totalCategories: number;
    categories: string[];
    averageGrowthDuration: number;
  };
  byCategory: Array<{
    _id: string;
    count: number;
    averageGrowthDuration: number;
  }>;
}

// Controller method types
export type GetAllCropsController = (
  req: GetAllCropsRequest,
  res: TypedResponse<CropResponse[]>
) => Promise<void>;

export type GetCropController = (
  req: GetCropRequest,
  res: TypedResponse<CropResponse>
) => Promise<void>;

export type CreateCropController = (
  req: CreateCropRequest,
  res: TypedResponse<CropResponse>
) => Promise<void>;

export type UpdateCropController = (
  req: UpdateCropRequest,
  res: TypedResponse<CropResponse>
) => Promise<void>;

export type DeleteCropController = (
  req: DeleteCropRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type SearchCropsController = (
  req: SearchCropsRequest,
  res: TypedResponse<CropResponse[]>
) => Promise<void>;

export type GetCropDiseasesController = (
  req: GetCropDiseasesRequest,
  res: TypedResponse<any[]>
) => Promise<void>;

export type GetCropTreatmentsController = (
  req: GetCropTreatmentsRequest,
  res: TypedResponse<any[]>
) => Promise<void>;

export type GetCropStatsController = (
  req: GetCropStatsRequest,
  res: TypedResponse<CropStatsResponse>
) => Promise<void>;

export type AddCropVarietyController = (
  req: AddCropVarietyRequest,
  res: TypedResponse<CropVarietyResponse>
) => Promise<void>;

export type UpdateCropVarietyController = (
  req: UpdateCropVarietyRequest,
  res: TypedResponse<CropVarietyResponse>
) => Promise<void>;

export type DeleteCropVarietyController = (
  req: DeleteCropVarietyRequest,
  res: TypedResponse<{}>
) => Promise<void>;

// Service response types
export interface CropServiceResult {
  success: boolean;
  crop?: CropResponse;
  message?: string;
  error?: string;
}

export interface CropSearchResult {
  success: boolean;
  crops: CropResponse[];
  pagination: PaginationResponse;
  message?: string;
  error?: string;
}

// Validation types
export interface CropValidationErrors {
  name?: string[];
  scientificName?: string[];
  category?: string[];
  seasons?: string[];
  regions?: string[];
  growthDuration?: string[];
  nutritionalNeeds?: string[];
  plantingCalendar?: string[];
}