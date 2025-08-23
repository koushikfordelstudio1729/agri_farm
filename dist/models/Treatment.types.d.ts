import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';
export interface ITreatment extends Document {
    _id: DatabaseId;
    name: string;
    type: 'chemical' | 'organic' | 'biological' | 'cultural' | 'prevention';
    category: 'fungicide' | 'insecticide' | 'herbicide' | 'fertilizer' | 'supplement' | 'practice';
    description: string;
    activeIngredients?: {
        name: string;
        concentration: number;
        unit: string;
    }[];
    application: {
        method: 'spray' | 'drench' | 'granular' | 'injection' | 'manual' | 'biological_release';
        dosage: {
            amount: number;
            unit: string;
            perUnit: 'per_plant' | 'per_sqm' | 'per_acre' | 'per_liter_water';
        };
        frequency: {
            interval: number;
            intervalUnit: 'days' | 'weeks' | 'months';
            maxApplications?: number;
        };
        timing: {
            growthStages?: string[];
            timeOfDay?: 'morning' | 'evening' | 'anytime';
            weatherConditions?: string[];
        };
    };
    targets: {
        type: 'disease' | 'pest' | 'nutrient_deficiency' | 'growth_promotion';
        targetId?: DatabaseId;
        targetName: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }[];
    suitableCrops: DatabaseId[];
    effectiveness: {
        averageSuccess: number;
        controlLevel: 'preventive' | 'curative' | 'both';
        speedOfAction: number;
        persistenceDays: number;
    };
    safety: {
        toxicityLevel: 'low' | 'medium' | 'high';
        humanSafety: {
            handlingPrecautions: string[];
            ppe: string[];
            firstAid: string[];
        };
        environmentalImpact: {
            soilPersistence: number;
            waterSolubility: 'low' | 'medium' | 'high';
            beesSafety: boolean;
            beneficialInsectsSafety: boolean;
        };
        restrictions?: {
            preHarvestInterval: number;
            maxResidueLevel?: number;
            bannedRegions?: string[];
            licenseRequired?: boolean;
        };
    };
    cost: {
        pricePerUnit: number;
        unit: string;
        currency: string;
        applicationCost?: number;
        costEffectiveness: 'low' | 'medium' | 'high';
    };
    availability: {
        regions: string[];
        suppliers: {
            name: string;
            contact?: string;
            website?: string;
            inStock: boolean;
        }[];
        seasonality?: {
            availableMonths: number[];
            peakDemandMonths?: number[];
        };
    };
    alternatives?: {
        treatmentId: DatabaseId;
        reason: string;
        effectiveness: number;
    }[];
    ratings: {
        average: number;
        count: number;
        distribution: {
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
        };
    };
    images: string[];
    videos?: string[];
    documents?: {
        title: string;
        url: string;
        type: 'label' | 'msds' | 'manual' | 'research';
    }[];
    tags: string[];
    isOrganic: boolean;
    isApproved: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvedBy?: DatabaseId;
    registrationNumber?: string;
    manufacturer?: string;
    isActive: boolean;
    createdBy?: DatabaseId;
    createdAt: Date;
    updatedAt: Date;
}
export interface ITreatmentMethods {
    addTarget(target: ITreatment['targets'][0]): Promise<void>;
    removeTarget(targetId: string): Promise<void>;
    updateEffectiveness(data: Partial<ITreatment['effectiveness']>): Promise<void>;
    addRating(rating: number, userId?: DatabaseId): Promise<void>;
    calculateAverageRating(): Promise<void>;
    addSuitableCrop(cropId: DatabaseId): Promise<void>;
    removeSuitableCrop(cropId: DatabaseId): Promise<void>;
    isEffectiveFor(diseaseId: DatabaseId): boolean;
    isSafeFor(cropId: DatabaseId, harvestInDays?: number): boolean;
    getApplicationInstructions(): string;
    approve(approvedBy: DatabaseId): Promise<void>;
    reject(): Promise<void>;
}
export interface ITreatmentStatics {
    findByType(type: ITreatment['type']): Promise<ITreatment[]>;
    findByTarget(targetType: string, targetId?: DatabaseId): Promise<ITreatment[]>;
    findByCrop(cropId: DatabaseId): Promise<ITreatment[]>;
    findOrganic(): Promise<ITreatment[]>;
    findSafeForEnvironment(): Promise<ITreatment[]>;
    search(query: string, filters?: TreatmentSearchFilters): Promise<ITreatment[]>;
    getTreatmentStats(): Promise<{
        totalTreatments: number;
        approvedTreatments: number;
        organicTreatments: number;
        treatmentsByType: Record<string, number>;
        averageRating: number;
    }>;
    findAlternatives(treatmentId: DatabaseId): Promise<ITreatment[]>;
    cleanup(inactiveDays: number): Promise<number>;
}
export interface TreatmentSearchFilters {
    type?: ITreatment['type'];
    category?: ITreatment['category'];
    isOrganic?: boolean;
    toxicityLevel?: ITreatment['safety']['toxicityLevel'];
    region?: string;
    cropId?: DatabaseId;
    minRating?: number;
}
export interface CreateTreatmentData {
    name: string;
    type: ITreatment['type'];
    category: ITreatment['category'];
    description: string;
    activeIngredients?: ITreatment['activeIngredients'];
    application: ITreatment['application'];
    targets?: ITreatment['targets'];
    suitableCrops?: DatabaseId[];
    effectiveness?: Partial<ITreatment['effectiveness']>;
    safety: ITreatment['safety'];
    cost: ITreatment['cost'];
    availability: ITreatment['availability'];
    images?: string[];
    tags?: string[];
    isOrganic?: boolean;
    manufacturer?: string;
    createdBy?: DatabaseId;
}
export interface UpdateTreatmentData {
    name?: string;
    description?: string;
    application?: Partial<ITreatment['application']>;
    effectiveness?: Partial<ITreatment['effectiveness']>;
    safety?: Partial<ITreatment['safety']>;
    cost?: Partial<ITreatment['cost']>;
    availability?: Partial<ITreatment['availability']>;
    images?: string[];
    tags?: string[];
    isActive?: boolean;
}
//# sourceMappingURL=Treatment.types.d.ts.map