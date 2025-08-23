import type { Document, Model } from 'mongoose';
import type { 
  Diagnosis,
  DiagnosisResult,
  DiagnosisRequest,
  PlantImage,
  BatchDiagnosis,
  DatabaseId 
} from '@/types';

export interface IDiagnosis extends Document {
  userId: DatabaseId;
  images: PlantImage[];
  request: DiagnosisRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
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

  // Instance methods
  updateStatus(status: IDiagnosis['status']): Promise<void>;
  addResults(results: DiagnosisResult[]): Promise<void>;
  markAsCompleted(results: DiagnosisResult[], processingTime: number): Promise<void>;
  submitFeedback(rating: number, comment?: string, isHelpful?: boolean): Promise<void>;
  toPublicJSON(): Partial<IDiagnosis>;
}

export interface IDiagnosisModel extends Model<IDiagnosis> {
  findByUserId(userId: DatabaseId): Promise<IDiagnosis[]>;
  findPending(): Promise<IDiagnosis[]>;
  findByStatus(status: IDiagnosis['status']): Promise<IDiagnosis[]>;
  getStats(dateRange?: { start: Date; end: Date }): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    averageProcessingTime: number;
    averageConfidence: number;
  }>;
}