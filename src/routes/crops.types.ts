import { Request, Response } from 'express';
import { 
  CreateCropRequest, 
  UpdateCropRequest,
  CropResponse,
  CropVarietyRequest,
  CropVarietyResponse,
  CropRecommendationRequest,
  BulkCropRequest
} from '@/controllers/cropController.types';

// Route parameter types
export interface CropParamsWithId {
  cropId: string;
}

export interface CropVarietyParams {
  cropId: string;
  varietyId: string;
}

// Query parameter types
export interface GetCropsQuery {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  family?: string;
  season?: string;
  region?: string;
  sortBy?: 'name' | 'category' | 'plantingTime' | 'maturityDays';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchCropsQuery {
  q: string;
  category?: string;
  limit?: string;
  includeVarieties?: string;
}

export interface GetCropsByLocationQuery {
  lat: string;
  lng: string;
  radius?: string;
  season?: string;
}

// Express request types
export interface CreateCropRequestHandler extends Request<{}, CropResponse, CreateCropRequest> {}
export interface UpdateCropRequestHandler extends Request<CropParamsWithId, CropResponse, UpdateCropRequest> {}
export interface GetCropRequestHandler extends Request<CropParamsWithId, CropResponse> {}
export interface GetCropsRequestHandler extends Request<{}, CropResponse[], {}, GetCropsQuery> {}
export interface SearchCropsRequestHandler extends Request<{}, CropResponse[], {}, SearchCropsQuery> {}

export interface AddCropVarietyRequestHandler extends Request<CropParamsWithId, CropVarietyResponse, CropVarietyRequest> {}
export interface UpdateCropVarietyRequestHandler extends Request<CropVarietyParams, CropVarietyResponse, Partial<CropVarietyRequest>> {}

export interface GetCropRecommendationsRequestHandler extends Request<{}, CropResponse[], CropRecommendationRequest> {}

export interface BulkCreateCropsRequestHandler extends Request<{}, CropResponse[], BulkCropRequest> {}

// Response types with Express
export interface CropResponseHandler extends Response<CropResponse> {}
export interface CropsListResponseHandler extends Response<CropResponse[]> {}
export interface CropVarietyResponseHandler extends Response<CropVarietyResponse> {}