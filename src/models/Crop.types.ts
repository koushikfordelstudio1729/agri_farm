import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface ICrop extends Document {
  _id: DatabaseId;
  name: string;
  scientificName?: string;
  commonNames: string[];
  category: 'cereals' | 'vegetables' | 'fruits' | 'legumes' | 'oilseeds' | 'cash_crops' | 'spices' | 'medicinal';
  family?: string;
  description: string;
  
  // Growing information
  growthStages: {
    name: string;
    duration: number; // days
    description: string;
    keyCharacteristics: string[];
  }[];
  
  // Environmental requirements
  climate: {
    temperature: {
      min: number;
      max: number;
      optimal: number;
    };
    humidity: {
      min: number;
      max: number;
    };
    rainfall: {
      min: number; // mm per season
      max: number;
    };
    sunlightHours: number;
    soilTypes: string[];
    phRange: {
      min: number;
      max: number;
    };
  };
  
  // Seasonal information
  plantingSeason: {
    startMonth: number;
    endMonth: number;
    regions?: string[];
  }[];
  harvestingSeason: {
    startMonth: number;
    endMonth: number;
    regions?: string[];
  }[];
  
  // Economic data
  marketInfo?: {
    averagePrice: number;
    priceUnit: 'per_kg' | 'per_quintal' | 'per_ton' | 'per_piece';
    currency: string;
    demandLevel: 'low' | 'medium' | 'high';
    exportPotential: boolean;
  };
  
  // Nutritional information
  nutrition?: {
    calories: number; // per 100g
    protein: number;
    carbohydrates: number;
    fiber: number;
    vitamins: Record<string, number>;
    minerals: Record<string, number>;
  };
  
  // Disease susceptibility
  commonDiseases: DatabaseId[];
  commonPests: string[];
  resistantVarieties?: string[];
  
  // Geographic data
  cultivationRegions: string[];
  nativeRegion?: string;
  
  // Media and resources
  images: string[];
  videos?: string[];
  resources?: {
    title: string;
    url: string;
    type: 'guide' | 'research' | 'video' | 'article';
  }[];
  
  // Metadata
  tags: string[];
  isPopular: boolean;
  isActive: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdBy?: DatabaseId;
  approvedBy?: DatabaseId;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ICropMethods {
  addGrowthStage(stage: ICrop['growthStages'][0]): Promise<void>;
  updateGrowthStage(stageIndex: number, updates: Partial<ICrop['growthStages'][0]>): Promise<void>;
  removeGrowthStage(stageIndex: number): Promise<void>;
  isInPlantingSeason(month?: number, region?: string): boolean;
  isInHarvestSeason(month?: number, region?: string): boolean;
  getOptimalConditions(): ICrop['climate'];
  addCommonDisease(diseaseId: DatabaseId): Promise<void>;
  removeCommonDisease(diseaseId: DatabaseId): Promise<void>;
  approve(approvedBy: DatabaseId): Promise<void>;
  reject(): Promise<void>;
  calculatePopularityScore(): Promise<number>;
}

export interface ICropStatics {
  findByCategory(category: ICrop['category']): Promise<ICrop[]>;
  findByRegion(region: string): Promise<ICrop[]>;
  findInSeason(month?: number, type?: 'planting' | 'harvesting', region?: string): Promise<ICrop[]>;
  findSuitableForClimate(conditions: Partial<ICrop['climate']>): Promise<ICrop[]>;
  findByDifficulty(difficulty: ICrop['difficulty']): Promise<ICrop[]>;
  getPopularCrops(limit?: number): Promise<ICrop[]>;
  search(query: string): Promise<ICrop[]>;
  getCropStatistics(): Promise<{
    totalCrops: number;
    activeCrops: number;
    cropsByCategory: Record<string, number>;
    cropsByDifficulty: Record<string, number>;
    averageGrowthStages: number;
  }>;
  findSimilar(cropId: DatabaseId, limit?: number): Promise<ICrop[]>;
  cleanup(inactiveDays: number): Promise<number>;
}

export interface CreateCropData {
  name: string;
  scientificName?: string;
  commonNames?: string[];
  category: ICrop['category'];
  family?: string;
  description: string;
  growthStages?: ICrop['growthStages'];
  climate?: Partial<ICrop['climate']>;
  plantingSeason?: ICrop['plantingSeason'];
  harvestingSeason?: ICrop['harvestingSeason'];
  marketInfo?: ICrop['marketInfo'];
  nutrition?: ICrop['nutrition'];
  commonDiseases?: DatabaseId[];
  commonPests?: string[];
  cultivationRegions?: string[];
  nativeRegion?: string;
  images?: string[];
  tags?: string[];
  difficulty?: ICrop['difficulty'];
  createdBy?: DatabaseId;
}

export interface UpdateCropData {
  name?: string;
  scientificName?: string;
  commonNames?: string[];
  family?: string;
  description?: string;
  growthStages?: ICrop['growthStages'];
  climate?: Partial<ICrop['climate']>;
  plantingSeason?: ICrop['plantingSeason'];
  harvestingSeason?: ICrop['harvestingSeason'];
  marketInfo?: ICrop['marketInfo'];
  nutrition?: ICrop['nutrition'];
  cultivationRegions?: string[];
  images?: string[];
  tags?: string[];
  difficulty?: ICrop['difficulty'];
  isActive?: boolean;
}