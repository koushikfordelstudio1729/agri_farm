import type { 
  DatabaseId, 
  BaseDocument, 
  DiagnosisStatus,
  FileUpload,
  TreatmentStep 
} from './common.types';

export interface PlantImage {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl: string;
  processedUrl?: string;
  metadata: {
    size: number;
    format: string;
    width: number;
    height: number;
    colorSpace: string;
    quality?: number;
  };
  uploadedAt: Date;
}

export interface DiagnosisResult {
  diseaseId: DatabaseId;
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedArea?: number;
  symptoms: string[];
  causes: string[];
  treatments: TreatmentStep[];
  preventionTips: string[];
  expectedRecoveryTime?: string;
  riskFactors: string[];
}

export interface DiagnosisRequest {
  cropId: DatabaseId;
  cropName: string;
  plantAge?: number;
  growthStage?: string;
  symptoms?: string[];
  environmentalFactors?: {
    weather: string;
    soilType?: string;
    irrigationType?: string;
    fertilizers?: string[];
    pesticides?: string[];
    temperature?: number;
    humidity?: number;
  };
  farmingPractices?: {
    organic: boolean;
    greenhouse: boolean;
    hydroponics: boolean;
  };
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
}

export interface Diagnosis extends BaseDocument {
  id: DatabaseId;
  userId: DatabaseId;
  images: PlantImage[];
  request: DiagnosisRequest;
  status: DiagnosisStatus;
  results?: DiagnosisResult[];
  aiModel: {
    name: string;
    version: string;
    accuracy?: number;
  };
  expertReview?: {
    expertId: DatabaseId;
    reviewedAt: Date;
    approved: boolean;
    modifications?: Partial<DiagnosisResult>;
    notes?: string;
  };
  processingTime?: number;
  confidence: number;
  isPublic: boolean;
  tags: string[];
  feedback?: {
    rating: number;
    comment?: string;
    isHelpful: boolean;
    submittedAt: Date;
  };
  shareData: {
    anonymous: boolean;
    forResearch: boolean;
    forTraining: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchDiagnosis {
  id: DatabaseId;
  userId: DatabaseId;
  diagnoses: DatabaseId[];
  status: 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  estimatedCompletionTime?: Date;
  results?: {
    successful: number;
    failed: number;
    warnings: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDiagnosisRequest {
  cropId: DatabaseId;
  images: Express.Multer.File[];
  cropName?: string;
  plantAge?: number;
  growthStage?: string;
  symptoms?: string[];
  environmentalFactors?: DiagnosisRequest['environmentalFactors'];
  farmingPractices?: DiagnosisRequest['farmingPractices'];
  urgency?: DiagnosisRequest['urgency'];
  location?: DiagnosisRequest['location'];
  notes?: string;
  shareAnonymous?: boolean;
  shareForResearch?: boolean;
}

export interface DiagnosisResponse {
  id: DatabaseId;
  status: DiagnosisStatus;
  estimatedCompletionTime?: Date;
  queuePosition?: number;
  results?: DiagnosisResult[];
  confidence?: number;
  processingTime?: number;
  message: string;
}

export interface DiagnosisListFilters {
  status?: DiagnosisStatus;
  cropId?: DatabaseId;
  dateFrom?: Date;
  dateTo?: Date;
  confidenceMin?: number;
  severity?: DiagnosisResult['severity'];
  hasExpertReview?: boolean;
  isPublic?: boolean;
}

export interface DiagnosisStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  averageProcessingTime: number;
  averageConfidence: number;
  mostCommonDiseases: {
    diseaseId: DatabaseId;
    diseaseName: string;
    count: number;
    percentage: number;
  }[];
  mostAffectedCrops: {
    cropId: DatabaseId;
    cropName: string;
    count: number;
    percentage: number;
  }[];
}

export interface ExpertDiagnosisReview {
  diagnosisId: DatabaseId;
  approved: boolean;
  modifications?: Partial<DiagnosisResult>;
  notes?: string;
  confidence?: number;
}

export interface DiagnosisHistory {
  diagnoses: Diagnosis[];
  summary: {
    totalDiagnoses: number;
    successRate: number;
    averageConfidence: number;
    mostFrequentDiseases: string[];
    improvementTrends: {
      month: string;
      accuracy: number;
      count: number;
    }[];
  };
}

export interface AIDiagnosisConfig {
  modelName: string;
  version: string;
  confidenceThreshold: number;
  maxImages: number;
  supportedFormats: string[];
  maxFileSize: number;
  preprocessing: {
    resize: boolean;
    normalize: boolean;
    augment: boolean;
  };
  postprocessing: {
    filterLowConfidence: boolean;
    mergeResults: boolean;
    validateResults: boolean;
  };
}