import type { 
  DatabaseId, 
  BaseDocument, 
  LanguageCode,
  CropGrowthStage,
  LocationData 
} from './common.types';

export interface NutrientRequirement {
  nutrient: string;
  symbol: string;
  amount: number;
  unit: string;
  stage?: string;
  deficiencySymptoms: string[];
  sources: string[];
}

export interface GrowingConditions {
  temperature: {
    min: number;
    max: number;
    optimal: number;
    unit: 'celsius' | 'fahrenheit';
  };
  humidity: {
    min: number;
    max: number;
    optimal: number;
  };
  soilPh: {
    min: number;
    max: number;
    optimal: number;
  };
  soilType: string[];
  waterRequirement: {
    amount: number;
    frequency: string;
    unit: string;
    drainageType: 'well-drained' | 'moderate' | 'poor';
  };
  sunlight: {
    type: 'full-sun' | 'partial-sun' | 'shade' | 'partial-shade';
    hoursPerDay: number;
  };
  altitude: {
    min?: number;
    max?: number;
    unit: 'meters' | 'feet';
  };
}

export interface CropVariety {
  id: DatabaseId;
  name: string;
  localNames: Record<LanguageCode, string>;
  description: string;
  characteristics: string[];
  yield: {
    average: number;
    unit: string;
    timeframe: string;
  };
  diseaseResistance: string[];
  pestResistance: string[];
  matureDays: number;
  plantingMethod: string[];
  harvestingSigns: string[];
  storageRequirements: string;
  shelfLife: string;
  nutritionalValue?: Record<string, number>;
  marketValue?: {
    averagePrice: number;
    currency: string;
    unit: string;
    season?: string;
  };
}

export interface PlantingCalendar {
  region: string;
  climate: string;
  seasons: {
    name: string;
    startMonth: number;
    endMonth: number;
    activities: {
      activity: 'sowing' | 'transplanting' | 'harvesting' | 'pruning' | 'fertilizing';
      timing: string;
      description: string;
    }[];
  }[];
  monsoonSchedule?: {
    preMonsoon: { start: number; end: number };
    monsoon: { start: number; end: number };
    postMonsoon: { start: number; end: number };
  };
}

export interface CropCare {
  stage: string;
  daysFromPlanting: number;
  activities: {
    activity: string;
    description: string;
    frequency?: string;
    materials?: string[];
    tips: string[];
  }[];
  commonProblems: {
    problem: string;
    symptoms: string[];
    solutions: string[];
    prevention: string[];
  }[];
  expectedChanges: string[];
}

export interface Crop extends BaseDocument {
  id: DatabaseId;
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
  growthStages: CropGrowthStage[];
  growingConditions: GrowingConditions;
  nutrientRequirements: NutrientRequirement[];
  plantingCalendar: PlantingCalendar[];
  careInstructions: CropCare[];
  companionPlants: DatabaseId[];
  rotationCrops: DatabaseId[];
  harvesting: {
    indicators: string[];
    methods: string[];
    tools: string[];
    postHarvestCare: string[];
    storage: {
      method: string;
      duration: string;
      conditions: string[];
    }[];
  };
  economicInfo: {
    marketDemand: 'low' | 'medium' | 'high';
    profitability: 'low' | 'medium' | 'high';
    investmentRequired: 'low' | 'medium' | 'high';
    laborIntensive: boolean;
    mechanizationLevel: 'low' | 'medium' | 'high';
  };
  nutritionalValue: Record<string, {
    amount: number;
    unit: string;
    dailyValuePercentage?: number;
  }>;
  uses: string[];
  culturalSignificance?: Record<LanguageCode, string>;
  isActive: boolean;
  tags: string[];
  createdBy: DatabaseId;
  updatedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CropSearch {
  query?: string;
  category?: Crop['category'];
  type?: Crop['type'];
  family?: string;
  growingConditions?: Partial<GrowingConditions>;
  climate?: string;
  region?: string;
  matureDays?: {
    min?: number;
    max?: number;
  };
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  marketValue?: 'low' | 'medium' | 'high';
  tags?: string[];
  hasVarieties?: boolean;
}

export interface CropRecommendation {
  cropId: DatabaseId;
  crop: Pick<Crop, 'id' | 'name' | 'category' | 'description' | 'images'>;
  matchScore: number;
  reasons: string[];
  suitabilityFactors: {
    climate: number;
    soil: number;
    water: number;
    market: number;
    experience: number;
  };
  expectedYield: {
    amount: number;
    unit: string;
    timeframe: string;
  };
  investmentRequired: {
    amount: number;
    currency: string;
    breakdown: Record<string, number>;
  };
  bestPlantingTime: {
    months: number[];
    season: string;
  };
  risks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

export interface CropCalendarEvent {
  id: DatabaseId;
  cropId: DatabaseId;
  userId: DatabaseId;
  activity: string;
  description: string;
  scheduledDate: Date;
  completed: boolean;
  completedDate?: Date;
  notes?: string;
  reminder: boolean;
  reminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCropRequest {
  name: string;
  scientificName: string;
  commonNames: Record<LanguageCode, string[]>;
  family: string;
  category: Crop['category'];
  type: Crop['type'];
  description: Record<LanguageCode, string>;
  growingConditions: GrowingConditions;
  nutrientRequirements: NutrientRequirement[];
  tags?: string[];
}

export interface UpdateCropRequest extends Partial<CreateCropRequest> {
  isActive?: boolean;
}

export interface CropStats {
  totalCrops: number;
  categoryCounts: Record<Crop['category'], number>;
  typeCounts: Record<Crop['type'], number>;
  mostPopular: {
    cropId: DatabaseId;
    cropName: string;
    diagnosisCount: number;
    userCount: number;
  }[];
  recentlyAdded: Crop[];
}

export interface CropDisease {
  id: DatabaseId;
  cropId: DatabaseId;
  diseaseId: DatabaseId;
  susceptibility: 'low' | 'medium' | 'high';
  affectedStages: string[];
  symptoms: string[];
  preventiveMeasures: string[];
  organicTreatments: string[];
  chemicalTreatments: string[];
  biologicalTreatments: string[];
}

export interface CropPest {
  id: DatabaseId;
  cropId: DatabaseId;
  pestId: DatabaseId;
  susceptibility: 'low' | 'medium' | 'high';
  affectedParts: string[];
  damageSymptoms: string[];
  seasonalActivity: {
    peak: string[];
    low: string[];
  };
  controlMethods: {
    biological: string[];
    mechanical: string[];
    chemical: string[];
    cultural: string[];
  };
}