import { Document, Model } from 'mongoose';

export interface ITreatment extends Document {
  name: string;
  diseaseId?: string;
  diseaseNames: string[];
  affectedCrops: Array<{
    cropId: string;
    cropName: string;
    effectiveness: number; // 0-100
    applicationNotes?: string;
  }>;
  
  category: 'chemical' | 'biological' | 'organic' | 'mechanical' | 'cultural' | 'integrated';
  type: 'preventive' | 'curative' | 'suppressive' | 'eradicant';
  
  description: string;
  objective: string;
  
  products: Array<{
    name: string;
    activeIngredient: string;
    concentration: string;
    brand?: string;
    manufacturer?: string;
    registrationNumber?: string;
    formulation: 'liquid' | 'powder' | 'granules' | 'tablet' | 'emulsifiable_concentrate' | 'wettable_powder';
    toxicityClass?: 'I' | 'II' | 'III' | 'IV'; // WHO classification
    organicApproved?: boolean;
  }>;
  
  application: {
    method: Array<'foliar_spray' | 'soil_drench' | 'seed_treatment' | 'trunk_injection' | 'fumigation' | 'dusting'>;
    dosage: {
      amount: number;
      unit: string; // ml/L, g/L, kg/ha, etc.
      concentration?: string;
    };
    dilution?: {
      ratio: string;
      waterAmount: number;
      unit: string;
    };
    equipment: string[];
    coverage: 'full_plant' | 'affected_areas' | 'soil_around_plant' | 'roots' | 'stems' | 'leaves';
    technique: string;
    conditions: {
      temperature?: { min?: number; max?: number };
      humidity?: { min?: number; max?: number };
      windSpeed?: { max: number };
      timeOfDay: Array<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>;
      weatherConditions: Array<'sunny' | 'cloudy' | 'overcast' | 'no_rain_expected'>;
    };
  };
  
  schedule: {
    frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
    interval?: number; // days between applications
    totalApplications?: number;
    duration?: string; // "2-3 weeks", "until symptoms disappear"
    timing: {
      startCondition: 'first_symptoms' | 'preventive' | 'specific_growth_stage';
      growthStages?: string[];
      seasonalTiming?: string[];
    };
  };
  
  safety: {
    preharvest: {
      interval: number; // days
      unit: 'days' | 'weeks';
    };
    reentry: {
      interval: number; // hours
      unit: 'hours' | 'days';
    };
    protection: {
      required: Array<'gloves' | 'mask' | 'goggles' | 'coveralls' | 'boots' | 'respirator'>;
      recommendations: string[];
    };
    warnings: string[];
    firstAid: string[];
    storage: string[];
    disposal: string[];
  };
  
  effectiveness: {
    rating: number; // 0-100
    successRate?: number; // percentage
    timeToResults: {
      initial: string; // "24-48 hours"
      full: string; // "7-14 days"
    };
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  };
  
  compatibility: {
    products: Array<{
      name: string;
      compatible: boolean;
      notes?: string;
    }>;
    restrictions: string[];
    interactions: Array<{
      with: string;
      type: 'synergistic' | 'antagonistic' | 'neutral';
      description: string;
    }>;
  };
  
  resistance: {
    riskLevel: 'low' | 'medium' | 'high';
    mechanism: string;
    management: string[];
    rotationGroups?: string[];
    alternativeProducts?: string[];
  };
  
  cost: {
    estimated: {
      amount: number;
      currency: string;
      unit: string; // per hectare, per plant, per application
    };
    factors: Array<{
      factor: string;
      impact: 'increase' | 'decrease';
      description: string;
    }>;
  };
  
  environmental: {
    impact: 'low' | 'medium' | 'high';
    concerns: Array<{
      type: 'soil' | 'water' | 'air' | 'beneficial_insects' | 'wildlife';
      severity: 'low' | 'medium' | 'high';
      description: string;
      mitigation?: string[];
    }>;
    beneficialImpact?: Array<{
      target: string;
      effect: string;
      description: string;
    }>;
  };
  
  alternatives: Array<{
    treatmentId?: string;
    name: string;
    category: string;
    effectiveness: number;
    reason: string;
  }>;
  
  references: Array<{
    type: 'research_paper' | 'field_trial' | 'university_extension' | 'manufacturer_guide';
    title: string;
    authors?: string[];
    publication?: string;
    year?: number;
    url?: string;
    doi?: string;
  }>;
  
  regions: Array<{
    country: string;
    state?: string;
    approved: boolean;
    restrictions?: string[];
    localName?: string;
  }>;
  
  expertNotes: Array<{
    expertId: string;
    note: string;
    rating?: number;
    experience: 'positive' | 'negative' | 'neutral';
    recommendedFor?: string[];
    notRecommendedFor?: string[];
    tips?: string[];
    createdAt: Date;
  }>;
  
  userFeedback: {
    averageRating: number;
    totalReviews: number;
    effectiveness: number;
    easeOfUse: number;
    value: number;
    wouldRecommend: number; // percentage
  };
  
  versions: Array<{
    version: string;
    changes: string[];
    updatedBy: string;
    updatedAt: Date;
    approved: boolean;
  }>;
  
  status: 'draft' | 'review' | 'approved' | 'deprecated' | 'withdrawn';
  isActive: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  createdBy: string;
  lastUpdatedBy: string;

  // Virtuals
  isOrganic: boolean;
  isChemical: boolean;
  overallRating: number;
  costEffectiveness: number;
  safetyScore: number;

  // Instance methods
  addProduct(product: ITreatment['products'][0]): Promise<void>;
  removeProduct(productName: string): Promise<void>;
  updateEffectiveness(cropId: string, effectiveness: number): Promise<void>;
  addExpertNote(expertId: string, note: string, rating?: number): Promise<void>;
  addUserFeedback(rating: number, effectiveness: number, easeOfUse: number, value: number): Promise<void>;
  addAlternative(alternative: ITreatment['alternatives'][0]): Promise<void>;
  approve(approvedBy: string): Promise<void>;
  deprecate(reason: string): Promise<void>;
  createNewVersion(changes: string[], updatedBy: string): Promise<void>;
  calculateSafetyScore(): number;
  calculateCostEffectiveness(): number;
  checkCompatibility(otherTreatmentId: string): Promise<{ compatible: boolean; notes?: string }>;
  isApprovedInRegion(country: string, state?: string): boolean;
}

export interface ITreatmentStatics {
  findByDisease(diseaseId: string, filters?: {
    category?: string[];
    type?: string[];
    effectiveness?: { min: number };
    organic?: boolean;
    approved?: boolean;
  }): Promise<ITreatment[]>;
  
  findByCrop(cropId: string, filters?: {
    category?: string[];
    type?: string[];
    effectiveness?: { min: number };
  }): Promise<ITreatment[]>;
  
  searchTreatments(query: string, filters?: {
    category?: string[];
    crops?: string[];
    diseases?: string[];
    region?: { country: string; state?: string };
    organic?: boolean;
    costRange?: { min: number; max: number };
  }): Promise<ITreatment[]>;
  
  findByProduct(productName: string): Promise<ITreatment[]>;
  
  getPopularTreatments(limit?: number): Promise<ITreatment[]>;
  
  getTreatmentStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    averageRating: number;
    averageEffectiveness: number;
    organicCount: number;
    approvedCount: number;
  }>;
  
  findCompatibleTreatments(treatmentId: string): Promise<Array<{
    treatment: ITreatment;
    compatibility: 'compatible' | 'incompatible' | 'conditional';
    notes?: string;
  }>>;
  
  findAlternativeTreatments(
    treatmentId: string,
    criteria?: 'effectiveness' | 'cost' | 'safety' | 'environmental'
  ): Promise<ITreatment[]>;
  
  getTreatmentRecommendations(
    diseaseId: string,
    cropId: string,
    filters?: {
      organic?: boolean;
      maxCost?: number;
      region?: { country: string; state?: string };
      userPreferences?: string[];
    }
  ): Promise<Array<{
    treatment: ITreatment;
    score: number;
    reasons: string[];
    pros: string[];
    cons: string[];
  }>>;
  
  createTreatment(data: {
    name: string;
    diseaseId?: string;
    diseaseNames: string[];
    category: string;
    type: string;
    description: string;
    createdBy: string;
  }): Promise<ITreatment>;
  
  updateTreatmentRatings(treatmentId: string): Promise<void>;
  
  findTreatmentsByExpertise(expertId: string): Promise<ITreatment[]>;
  
  getTreatmentCalendar(
    cropId: string,
    location: { latitude: number; longitude: number },
    year?: number
  ): Promise<Array<{
    month: string;
    treatments: Array<{
      treatment: ITreatment;
      reason: string;
      timing: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  }>>;
  
  compareEffectiveness(treatmentIds: string[]): Promise<Array<{
    treatmentId: string;
    name: string;
    effectiveness: number;
    cost: number;
    safety: number;
    environmental: number;
    overall: number;
  }>>;
  
  findResistanceManagement(diseaseId: string, cropId: string): Promise<Array<{
    group: string;
    treatments: ITreatment[];
    rotationSchedule: string[];
    notes: string[];
  }>>;
}

export interface ITreatmentModel extends Model<ITreatment>, ITreatmentStatics {}