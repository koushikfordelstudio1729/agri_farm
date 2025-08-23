import type { 
  DatabaseId, 
  BaseDocument, 
  LanguageCode,
  TreatmentStep,
  FileUpload 
} from './common.types';

export interface DiseaseSymptom {
  id: DatabaseId;
  name: string;
  description: Record<LanguageCode, string>;
  severity: 'mild' | 'moderate' | 'severe';
  visualMarkers: string[];
  affectedParts: ('leaf' | 'stem' | 'root' | 'fruit' | 'flower' | 'seed')[];
  progressionStages: {
    stage: number;
    description: string;
    timeline: string;
    images?: string[];
  }[];
  commonMistakes: string[];
}

export interface Pathogen {
  type: 'virus' | 'bacteria' | 'fungus' | 'nematode' | 'pest' | 'deficiency' | 'toxicity' | 'environmental';
  name: string;
  scientificName?: string;
  strain?: string;
  transmissionMethod: ('air' | 'water' | 'soil' | 'vector' | 'contact' | 'seed')[];
  survivalConditions: {
    temperature: { min: number; max: number; optimal: number };
    humidity: { min: number; max: number; optimal: number };
    ph: { min: number; max: number; optimal: number };
    hostRange: string[];
  };
  lifecycle: {
    stage: string;
    duration: string;
    conditions: string;
    description: string;
  }[];
}

export interface Treatment {
  id: DatabaseId;
  name: string;
  type: 'organic' | 'chemical' | 'biological' | 'mechanical' | 'cultural';
  category: 'preventive' | 'curative' | 'systemic';
  activeIngredient?: string;
  concentration?: string;
  applicationMethod: ('spray' | 'drench' | 'granular' | 'fumigation' | 'injection' | 'dusting')[];
  dosage: {
    amount: number;
    unit: string;
    perArea?: string;
    frequency: string;
    timing: string[];
  };
  effectiveness: {
    rating: number;
    conditions: string[];
    duration: string;
  };
  steps: TreatmentStep[];
  precautions: {
    safety: string[];
    environmental: string[];
    resistance: string[];
  };
  cost: {
    amount: number;
    currency: string;
    unit: string;
    laborHours?: number;
  };
  availability: {
    regions: string[];
    suppliers: string[];
    seasonality?: string;
  };
  restrictions: {
    preHarvestDays: number;
    cropStages: string[];
    weatherConditions: string[];
    incompatibleProducts: string[];
  };
  sideEffects: {
    crop: string[];
    environment: string[];
    beneficialInsects: string[];
  };
}

export interface Disease extends BaseDocument {
  id: DatabaseId;
  name: string;
  scientificName?: string;
  commonNames: Record<LanguageCode, string[]>;
  description: Record<LanguageCode, string>;
  pathogen: Pathogen;
  affectedCrops: DatabaseId[];
  symptoms: DiseaseSymptom[];
  images: {
    early: string[];
    advanced: string[];
    microscopic?: string[];
    comparison?: string[];
  };
  causes: {
    primary: string[];
    secondary: string[];
    predisposingFactors: string[];
  };
  favorableConditions: {
    environmental: {
      temperature: { min: number; max: number; optimal: number };
      humidity: { min: number; max: number; optimal: number };
      rainfall: { min: number; max: number };
      windSpeed?: { min: number; max: number };
    };
    hostFactors: string[];
    seasonality: {
      peak: string[];
      low: string[];
      regions: Record<string, string[]>;
    };
  };
  distribution: {
    global: string[];
    regions: Record<string, {
      prevalence: 'low' | 'medium' | 'high';
      seasons: string[];
      economicImpact: 'low' | 'medium' | 'high';
    }>;
  };
  economicImpact: {
    yieldLoss: {
      min: number;
      max: number;
      average: number;
      unit: 'percentage' | 'tons_per_hectare';
    };
    qualityImpact: string[];
    marketValue: {
      reduction: number;
      unit: 'percentage' | 'currency';
    };
  };
  lifecycle: {
    stages: {
      name: string;
      duration: string;
      conditions: string;
      description: string;
      symptoms: string[];
    }[];
    totalDuration: string;
    criticalStages: string[];
  };
  transmission: {
    methods: string[];
    vectors: string[];
    distance: string;
    conditions: string[];
    preventionMethods: string[];
  };
  diagnosis: {
    visualIdentification: {
      keyFeatures: string[];
      differentialDiagnosis: {
        disease: string;
        differences: string[];
      }[];
    };
    laboratory: {
      tests: string[];
      procedures: string[];
      timeRequired: string;
      accuracy: number;
    };
    fieldTests: {
      name: string;
      procedure: string;
      accuracy: string;
      cost: string;
    }[];
  };
  management: {
    prevention: {
      cultural: string[];
      biological: string[];
      chemical: string[];
      resistant_varieties: string[];
    };
    treatment: {
      organic: Treatment[];
      chemical: Treatment[];
      biological: Treatment[];
      integrated: {
        strategy: string;
        components: string[];
        timeline: string;
        effectiveness: number;
      }[];
    };
    monitoring: {
      frequency: string;
      methods: string[];
      indicators: string[];
      thresholds: Record<string, number>;
    };
  };
  resistance: {
    development: {
      risk: 'low' | 'medium' | 'high';
      mechanisms: string[];
      timeframe: string;
    };
    management: {
      strategies: string[];
      alternativeProducts: string[];
      rotationSchedule: string;
    };
  };
  research: {
    latestFindings: {
      title: string;
      summary: string;
      date: Date;
      source: string;
    }[];
    ongoingStudies: string[];
    futureDirections: string[];
  };
  references: {
    title: string;
    authors: string[];
    journal?: string;
    year: number;
    doi?: string;
    url?: string;
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  isQuarantine: boolean;
  reportingRequired: boolean;
  tags: string[];
  createdBy: DatabaseId;
  updatedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiseaseOutbreak {
  id: DatabaseId;
  diseaseId: DatabaseId;
  location: {
    country: string;
    state?: string;
    district?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    affectedArea: number;
    unit: 'hectares' | 'acres';
  };
  reportedBy: DatabaseId;
  confirmedBy?: DatabaseId;
  status: 'reported' | 'investigating' | 'confirmed' | 'contained' | 'resolved';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedCrops: {
    cropId: DatabaseId;
    variety?: string;
    area: number;
    severity: 'low' | 'medium' | 'high';
    yieldLoss?: number;
  }[];
  timeline: {
    firstReported: Date;
    confirmed?: Date;
    peakDate?: Date;
    containedDate?: Date;
    resolvedDate?: Date;
  };
  causativeFactors: {
    weather: string[];
    farming_practices: string[];
    introduction_method?: string;
  };
  response: {
    interventions: string[];
    treatments_used: DatabaseId[];
    effectiveness: string;
    cost: number;
    currency: string;
  };
  impact: {
    farmersAffected: number;
    economicLoss: number;
    currency: string;
    cropLoss: number;
    unit: 'tons' | 'kg';
  };
  surveillance: {
    monitoring_frequency: string;
    survey_methods: string[];
    reporting_schedule: string;
  };
  lessons_learned: string[];
  recommendations: string[];
  media_coverage?: {
    articles: string[];
    press_releases: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DiseaseAlert {
  id: DatabaseId;
  diseaseId: DatabaseId;
  title: string;
  message: Record<LanguageCode, string>;
  alertType: 'warning' | 'watch' | 'advisory' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: {
    regions: string[];
    crops: DatabaseId[];
    farmerTypes: string[];
    expertTypes: string[];
  };
  validFrom: Date;
  validUntil: Date;
  conditions: {
    weather: string[];
    seasonal: string[];
    regional: string[];
  };
  recommendations: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  resources: {
    contacts: {
      name: string;
      phone: string;
      email: string;
      role: string;
    }[];
    websites: string[];
    documents: string[];
  };
  isActive: boolean;
  sentTo: DatabaseId[];
  acknowledgments: {
    userId: DatabaseId;
    acknowledgedAt: Date;
    response?: string;
  }[];
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDiseaseRequest {
  name: string;
  scientificName?: string;
  commonNames: Record<LanguageCode, string[]>;
  description: Record<LanguageCode, string>;
  pathogen: Pathogen;
  affectedCrops: DatabaseId[];
  symptoms: Omit<DiseaseSymptom, 'id'>[];
  severity: Disease['severity'];
  tags?: string[];
}

export interface UpdateDiseaseRequest extends Partial<CreateDiseaseRequest> {
  priority?: number;
  isQuarantine?: boolean;
  reportingRequired?: boolean;
}

export interface DiseaseSearchFilters {
  pathogenType?: Pathogen['type'];
  affectedCrop?: DatabaseId;
  severity?: Disease['severity'];
  region?: string;
  season?: string;
  symptoms?: string[];
  isQuarantine?: boolean;
  tags?: string[];
}

export interface DiseaseStats {
  totalDiseases: number;
  byPathogenType: Record<Pathogen['type'], number>;
  bySeverity: Record<Disease['severity'], number>;
  mostCommon: {
    diseaseId: DatabaseId;
    diseaseName: string;
    diagnosisCount: number;
    affectedCropsCount: number;
  }[];
  seasonal: {
    month: string;
    diseaseCount: number;
    outbreakCount: number;
  }[];
  regional: {
    region: string;
    diseaseCount: number;
    prevalence: number;
  }[];
}

export interface DiseaseIdentificationKey {
  id: DatabaseId;
  name: string;
  description: string;
  steps: {
    step: number;
    question: string;
    options: {
      option: string;
      nextStep?: number;
      possibleDiseases?: DatabaseId[];
    }[];
  }[];
  targetCrops: DatabaseId[];
  accuracy: number;
  usage_count: number;
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}