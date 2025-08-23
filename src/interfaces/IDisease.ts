import type { Document, Model } from 'mongoose';
import type { 
  Disease,
  DiseaseSymptom,
  Treatment,
  DatabaseId,
  LanguageCode 
} from '@/types';

export interface IDisease extends Document {
  name: string;
  scientificName?: string;
  commonNames: Record<LanguageCode, string[]>;
  description: Record<LanguageCode, string>;
  affectedCrops: DatabaseId[];
  symptoms: DiseaseSymptom[];
  images: {
    early: string[];
    advanced: string[];
    microscopic?: string[];
    comparison?: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  isQuarantine: boolean;
  reportingRequired: boolean;
  tags: string[];
  createdBy: DatabaseId;
  updatedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addSymptom(symptom: Omit<DiseaseSymptom, 'id'>): Promise<void>;
  addAffectedCrop(cropId: DatabaseId): Promise<void>;
  removeAffectedCrop(cropId: DatabaseId): Promise<void>;
  getLocalizedData(language: LanguageCode): Partial<IDisease>;
  getTreatments(): Promise<Treatment[]>;
  updateSeverity(severity: IDisease['severity']): Promise<void>;
}

export interface IDiseaseModel extends Model<IDisease> {
  findByCrop(cropId: DatabaseId): Promise<IDisease[]>;
  findBySymptoms(symptoms: string[]): Promise<IDisease[]>;
  findBySeverity(severity: IDisease['severity']): Promise<IDisease[]>;
  searchByName(query: string, language?: LanguageCode): Promise<IDisease[]>;
  findQuarantine(): Promise<IDisease[]>;
  getMostCommon(limit?: number): Promise<IDisease[]>;
  findByRegion(region: string): Promise<IDisease[]>;
}