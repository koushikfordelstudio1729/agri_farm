import { Request, Response } from 'express';
import { 
  CreateDiseaseRequest, 
  UpdateDiseaseRequest,
  DiseaseResponse,
  DiseaseReportRequest,
  TreatmentRequest,
  TreatmentResponse,
  BulkDiseaseRequest
} from '@/controllers/diseaseController.types';

// Route parameter types
export interface DiseaseParamsWithId {
  diseaseId: string;
}

export interface TreatmentParams {
  diseaseId: string;
  treatmentId: string;
}

export interface CropDiseaseParams {
  cropId: string;
}

// Query parameter types
export interface GetDiseasesQuery {
  page?: string;
  limit?: string;
  search?: string;
  type?: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient' | 'environmental';
  crop?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  sortBy?: 'name' | 'type' | 'severity' | 'prevalence';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchDiseasesQuery {
  q: string;
  type?: string;
  crop?: string;
  limit?: string;
  includeSymptoms?: string;
}

export interface GetNearbyReportsQuery {
  lat: string;
  lng: string;
  radius?: string;
  disease?: string;
  timeframe?: string;
}

export interface GetDiseaseReportsQuery {
  startDate?: string;
  endDate?: string;
  severity?: string;
  location?: string;
  page?: string;
  limit?: string;
}

// Express request types
export interface CreateDiseaseRequestHandler extends Request<{}, DiseaseResponse, CreateDiseaseRequest> {}
export interface UpdateDiseaseRequestHandler extends Request<DiseaseParamsWithId, DiseaseResponse, UpdateDiseaseRequest> {}
export interface GetDiseaseRequestHandler extends Request<DiseaseParamsWithId, DiseaseResponse> {}
export interface GetDiseasesRequestHandler extends Request<{}, DiseaseResponse[], {}, GetDiseasesQuery> {}
export interface SearchDiseasesRequestHandler extends Request<{}, DiseaseResponse[], {}, SearchDiseasesQuery> {}

export interface ReportDiseaseRequestHandler extends Request<DiseaseParamsWithId, any, DiseaseReportRequest> {}
export interface GetDiseasesByCropRequestHandler extends Request<CropDiseaseParams, DiseaseResponse[]> {}

export interface AddTreatmentRequestHandler extends Request<DiseaseParamsWithId, TreatmentResponse, TreatmentRequest> {}
export interface UpdateTreatmentRequestHandler extends Request<TreatmentParams, TreatmentResponse, Partial<TreatmentRequest>> {}

export interface BulkCreateDiseasesRequestHandler extends Request<{}, DiseaseResponse[], BulkDiseaseRequest> {}

// Response types with Express
export interface DiseaseResponseHandler extends Response<DiseaseResponse> {}
export interface DiseasesListResponseHandler extends Response<DiseaseResponse[]> {}
export interface TreatmentResponseHandler extends Response<TreatmentResponse> {}
export interface DiseaseReportResponseHandler extends Response<any> {}