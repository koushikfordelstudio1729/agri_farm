import { Document } from 'mongoose';
import { DatabaseId, FileUpload, DiagnosisStatus } from '@/types/common.types';
export interface IDiagnosis extends Document {
    _id: DatabaseId;
    userId: DatabaseId;
    images: FileUpload[];
    status: DiagnosisStatus;
    confidence: number;
    processingTime?: number;
    detectedDiseases: {
        diseaseId: DatabaseId;
        name: string;
        scientificName?: string;
        confidence: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
        affectedArea?: number;
        symptoms: string[];
    }[];
    cropId?: DatabaseId;
    cropName: string;
    cropVariety?: string;
    growthStage?: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
        region?: string;
    };
    weather?: {
        temperature: number;
        humidity: number;
        rainfall: number;
        conditions: string;
    };
    plantingDate?: Date;
    modelVersion: string;
    modelProvider: 'tensorflow' | 'pytorch' | 'custom';
    processingMetadata?: {
        imagePreprocessing?: string[];
        algorithms?: string[];
        dataAugmentation?: boolean;
        ensembleModels?: string[];
    };
    treatments: {
        treatmentId?: DatabaseId;
        type: 'chemical' | 'organic' | 'biological' | 'cultural' | 'prevention';
        name: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        urgency: 'immediate' | 'within_week' | 'within_month' | 'seasonal';
        cost?: {
            min: number;
            max: number;
            currency: string;
        };
        effectiveness: number;
        sideEffects?: string[];
        precautions?: string[];
        applicationMethod?: string;
        dosage?: string;
        frequency?: string;
    }[];
    expertConsultation?: {
        requested: boolean;
        requestedAt?: Date;
        expertId?: DatabaseId;
        consultationId?: DatabaseId;
        status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
        urgencyLevel: 'low' | 'medium' | 'high';
    };
    feedback?: {
        rating: number;
        comment?: string;
        accuracy: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent';
        helpfulness: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent';
        followedTreatment: boolean;
        treatmentEffective?: boolean;
        submittedAt: Date;
    };
    followUp?: {
        scheduled: boolean;
        scheduledDate?: Date;
        reminders: {
            type: 'email' | 'sms' | 'push';
            sentAt: Date;
            opened?: boolean;
        }[];
        progressImages?: FileUpload[];
        progressNotes?: string;
        outcome?: 'recovered' | 'improved' | 'same' | 'worse' | 'unknown';
    };
    sharing?: {
        isPublic: boolean;
        anonymized: boolean;
        sharedAt?: Date;
        communityPostId?: DatabaseId;
        likes?: number;
        comments?: number;
        helpful?: number;
    };
    qualityFlags?: {
        imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
        imageRelevance: boolean;
        multipleDiseases: boolean;
        uncertainResults: boolean;
        requiresReview: boolean;
        reviewedBy?: DatabaseId;
        reviewedAt?: Date;
        reviewNotes?: string;
    };
    analytics?: {
        sessionId: string;
        deviceInfo?: string;
        appVersion?: string;
        apiVersion: string;
        referrer?: string;
        timeSpent?: number;
        userAgent?: string;
        ipAddress?: string;
    };
    tags: string[];
    notes?: string;
    isArchived: boolean;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
}
export interface IDiagnosisMethods {
    addTreatment(treatment: IDiagnosis['treatments'][0]): Promise<void>;
    updateStatus(status: DiagnosisStatus): Promise<void>;
    addFeedback(feedback: IDiagnosis['feedback']): Promise<void>;
    requestExpertConsultation(urgencyLevel?: IDiagnosis['expertConsultation']['urgencyLevel']): Promise<void>;
    scheduleFollowUp(days: number): Promise<void>;
    makePublic(anonymized?: boolean): Promise<void>;
    archive(): Promise<void>;
    unarchive(): Promise<void>;
    calculateAccuracy(): number;
    getTimeToCompletion(): number;
    canRequestExpert(): boolean;
    isExpired(): boolean;
}
export interface IDiagnosisStatics {
    findByUserId(userId: DatabaseId, options?: DiagnosisQueryOptions): Promise<IDiagnosis[]>;
    findByStatus(status: DiagnosisStatus): Promise<IDiagnosis[]>;
    findByDisease(diseaseId: DatabaseId): Promise<IDiagnosis[]>;
    findByCrop(cropId: DatabaseId): Promise<IDiagnosis[]>;
    findInRegion(bounds: GeoBounds): Promise<IDiagnosis[]>;
    findPublic(options?: PublicDiagnosisOptions): Promise<IDiagnosis[]>;
    getStatistics(filters?: DiagnosisStatsFilters): Promise<DiagnosisStatistics>;
    getTrending(timeframe?: 'day' | 'week' | 'month'): Promise<TrendingDiagnosis[]>;
    getQualityMetrics(): Promise<QualityMetrics>;
    findSimilar(diagnosisId: DatabaseId, limit?: number): Promise<IDiagnosis[]>;
    bulkProcess(diagnosisIds: DatabaseId[]): Promise<ProcessingResult>;
    cleanup(olderThanDays: number): Promise<number>;
}
export interface DiagnosisQueryOptions {
    status?: DiagnosisStatus;
    crop?: string;
    disease?: string;
    dateRange?: {
        from: Date;
        to: Date;
    };
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'confidence' | 'severity';
    sortOrder?: 'asc' | 'desc';
    includeArchived?: boolean;
}
export interface PublicDiagnosisOptions {
    crop?: string;
    disease?: string;
    region?: string;
    minConfidence?: number;
    limit?: number;
    offset?: number;
}
export interface GeoBounds {
    northeast: {
        latitude: number;
        longitude: number;
    };
    southwest: {
        latitude: number;
        longitude: number;
    };
}
export interface DiagnosisStatsFilters {
    userId?: DatabaseId;
    dateRange?: {
        from: Date;
        to: Date;
    };
    crop?: string;
    disease?: string;
    region?: string;
    expertId?: DatabaseId;
}
export interface DiagnosisStatistics {
    totalDiagnoses: number;
    completedDiagnoses: number;
    pendingDiagnoses: number;
    averageConfidence: number;
    averageProcessingTime: number;
    topDiseases: Array<{
        disease: string;
        count: number;
        averageConfidence: number;
    }>;
    topCrops: Array<{
        crop: string;
        count: number;
    }>;
    accuracyMetrics: {
        averageRating: number;
        totalFeedback: number;
        accuracyRate: number;
    };
    treatmentMetrics: {
        averageTreatments: number;
        effectivenessRate: number;
        followUpRate: number;
    };
    geographicDistribution: Array<{
        region: string;
        count: number;
    }>;
}
export interface TrendingDiagnosis {
    disease: string;
    crop: string;
    count: number;
    growthRate: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    regions: string[];
}
export interface QualityMetrics {
    totalDiagnoses: number;
    highQualityImages: number;
    requiresReview: number;
    averageImageQuality: number;
    reviewPending: number;
    flaggedDiagnoses: number;
}
export interface ProcessingResult {
    processed: number;
    failed: number;
    errors: Array<{
        diagnosisId: DatabaseId;
        error: string;
    }>;
}
export interface CreateDiagnosisData {
    userId: DatabaseId;
    images: FileUpload[];
    cropName: string;
    cropId?: DatabaseId;
    cropVariety?: string;
    growthStage?: string;
    location?: IDiagnosis['location'];
    plantingDate?: Date;
    notes?: string;
    priority?: IDiagnosis['priority'];
    sessionId?: string;
    deviceInfo?: string;
}
export interface UpdateDiagnosisData {
    status?: DiagnosisStatus;
    confidence?: number;
    detectedDiseases?: IDiagnosis['detectedDiseases'];
    treatments?: IDiagnosis['treatments'];
    processingTime?: number;
    processingMetadata?: IDiagnosis['processingMetadata'];
    modelVersion?: string;
    weather?: IDiagnosis['weather'];
    qualityFlags?: IDiagnosis['qualityFlags'];
}
//# sourceMappingURL=Diagnosis.types.d.ts.map