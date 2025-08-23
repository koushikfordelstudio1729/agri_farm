import type { Document, Model } from 'mongoose';
import type { 
  Crop,
  CropVariety,
  GrowingConditions,
  NutrientRequirement,
  CropCalendarEvent,
  DatabaseId,
  LanguageCode 
} from '@/types';

export interface ICrop extends Document {
  name: string;
  scientificName: string;
  commonNames: Record<LanguageCode, string[]>;
  family: string;
  category: 'cereal' | 'vegetable' | 'fruit' | 'legume' | 'root' | 'herb' | 'cash' | 'fodder';
  type: 'annual' | 'perennial' | 'biennial';
  description: Record<LanguageCode, string>;
  images: {
    plant: string[];
    leaf: string[];
    fruit: string[];
    flower: string[];
    seed: string[];
  };
  varieties: CropVariety[];
  growingConditions: GrowingConditions;
  nutrientRequirements: NutrientRequirement[];
  isActive: boolean;
  tags: string[];
  createdBy: DatabaseId;
  updatedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addVariety(variety: Omit<CropVariety, 'id'>): Promise<void>;
  updateGrowingConditions(conditions: Partial<GrowingConditions>): Promise<void>;
  addNutrientRequirement(requirement: NutrientRequirement): Promise<void>;
  getLocalizedData(language: LanguageCode): Partial<ICrop>;
  isInSeason(date: Date, region?: string): boolean;
}

export interface ICropModel extends Model<ICrop> {
  findByCategory(category: ICrop['category']): Promise<ICrop[]>;
  findByFamily(family: string): Promise<ICrop[]>;
  searchByName(query: string, language?: LanguageCode): Promise<ICrop[]>;
  findSuitable(conditions: Partial<GrowingConditions>): Promise<ICrop[]>;
  getPopular(limit?: number): Promise<ICrop[]>;
  findByRegion(region: string): Promise<ICrop[]>;
}