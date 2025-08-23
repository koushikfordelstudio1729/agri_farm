import mongoose, { Schema, Model } from 'mongoose';
import { IDisease, IDiseaseModel } from '@/interfaces/IDisease';
import { LanguageCode, DiseaseSymptom, DiseaseTreatment, DiseasePreventionTip } from '@/types';

const symptomSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    required: true,
  },
  visualSigns: [String],
  affectedParts: [{
    type: String,
    enum: ['leaf', 'stem', 'root', 'fruit', 'flower', 'bark', 'whole_plant'],
  }],
  stageOfInfection: {
    type: String,
    enum: ['early', 'mid', 'late', 'all_stages'],
    default: 'all_stages',
  },
}, { _id: false });

const treatmentStepSchema = new Schema({
  stepNumber: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ['chemical', 'organic', 'biological', 'mechanical', 'cultural'],
    required: true,
  },
  products: [{
    name: String,
    activeIngredient: String,
    concentration: String,
    applicationRate: String,
    safetyPeriod: String,
  }],
  timing: String,
  frequency: String,
  duration: String,
  cost: {
    estimated: Number,
    currency: {
      type: String,
      default: 'USD',
    },
  },
  effectiveness: {
    type: Number,
    min: 0,
    max: 100,
  },
  imageUrl: String,
}, { _id: false });

const preventionTipSchema = new Schema({
  category: {
    type: String,
    enum: ['cultural', 'chemical', 'biological', 'resistant_varieties', 'environmental'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  effectiveness: {
    type: Number,
    min: 0,
    max: 100,
  },
  cost: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  season: [String],
}, { _id: false });

const diseaseImageSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  description: String,
  stage: {
    type: String,
    enum: ['early', 'mid', 'late', 'recovery'],
  },
  affectedPart: {
    type: String,
    enum: ['leaf', 'stem', 'root', 'fruit', 'flower', 'bark', 'whole_plant'],
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

const diseaseSchema = new Schema<IDisease>({
  name: {
    type: String,
    required: [true, 'Disease name is required'],
    unique: true,
    trim: true,
    index: true,
  },
  scientificName: {
    type: String,
    trim: true,
    index: true,
  },
  commonNames: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    enum: ['fungal', 'bacterial', 'viral', 'nematode', 'insect', 'mite', 'nutritional', 'environmental', 'genetic'],
    required: true,
    index: true,
  },
  pathogen: {
    name: String,
    type: {
      type: String,
      enum: ['fungus', 'bacterium', 'virus', 'nematode', 'insect', 'mite'],
    },
    scientificName: String,
    family: String,
    genus: String,
    species: String,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true,
  },
  affectedCrops: [{
    cropId: {
      type: Schema.Types.ObjectId,
      ref: 'Crop',
      required: true,
    },
    susceptibility: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    yieldLoss: {
      min: Number,
      max: Number,
      average: Number,
    },
  }],
  symptoms: [symptomSchema],
  causes: [{
    factor: {
      type: String,
      enum: ['environmental', 'cultural', 'biological', 'chemical', 'genetic'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    conditions: [String],
  }],
  treatments: [treatmentStepSchema],
  preventionTips: [preventionTipSchema],
  images: [diseaseImageSchema],
  environmentalFactors: {
    temperature: {
      optimal: {
        min: Number,
        max: Number,
      },
      range: {
        min: Number,
        max: Number,
      },
    },
    humidity: {
      optimal: {
        min: Number,
        max: Number,
      },
      range: {
        min: Number,
        max: Number,
      },
    },
    rainfall: {
      favorable: {
        min: Number,
        max: Number,
      },
    },
    soilConditions: [String],
    seasonality: [String],
  },
  economicImpact: {
    globalYieldLoss: Number,
    economicLoss: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
      region: String,
      year: Number,
    },
    affectedRegions: [String],
  },
  distribution: {
    global: {
      type: Boolean,
      default: false,
    },
    regions: [String],
    countries: [String],
    climateZones: [String],
  },
  lifeCycle: {
    stages: [String],
    duration: String,
    overwintering: String,
    spread: [String],
  },
  diagnosticFeatures: [String],
  differentialDiagnosis: [{
    diseaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Disease',
    },
    diseaseName: String,
    differences: [String],
  }],
  researchLinks: [{
    title: String,
    url: String,
    source: String,
    publishedDate: Date,
  }],
  expertNotes: [{
    expertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    note: String,
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  translations: {
    type: Map,
    of: {
      name: String,
      description: String,
      symptoms: [String],
      treatments: [String],
      preventionTips: [String],
    },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: Date,
  tags: [String],
  searchKeywords: [String],
  aiTrainingData: {
    used: {
      type: Boolean,
      default: true,
    },
    modelVersion: String,
    lastUpdated: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
diseaseSchema.index({ name: 1 });
diseaseSchema.index({ category: 1, severity: 1 });
diseaseSchema.index({ 'affectedCrops.cropId': 1 });
diseaseSchema.index({ tags: 1 });
diseaseSchema.index({ searchKeywords: 1 });
diseaseSchema.index({ isActive: 1, isVerified: 1 });

// Text search index
diseaseSchema.index({ 
  name: 'text', 
  scientificName: 'text', 
  description: 'text',
  searchKeywords: 'text',
  'symptoms.name': 'text',
  'symptoms.description': 'text'
});

// Virtual for treatment count
diseaseSchema.virtual('treatmentCount').get(function(this: IDisease): number {
  return this.treatments?.length || 0;
});

// Virtual for prevention count
diseaseSchema.virtual('preventionCount').get(function(this: IDisease): number {
  return this.preventionTips?.length || 0;
});

// Virtual for affected crop count
diseaseSchema.virtual('affectedCropCount').get(function(this: IDisease): number {
  return this.affectedCrops?.length || 0;
});

// Instance methods
diseaseSchema.methods.addTranslation = async function(
  this: IDisease,
  language: LanguageCode,
  translation: {
    name: string;
    description: string;
    symptoms?: string[];
    treatments?: string[];
    preventionTips?: string[];
  }
): Promise<void> {
  if (!this.translations) {
    this.translations = new Map();
  }
  this.translations.set(language, translation);
  await this.save();
};

diseaseSchema.methods.getTranslation = function(
  this: IDisease,
  language: LanguageCode
): {
  name: string;
  description: string;
  symptoms?: string[];
  treatments?: string[];
  preventionTips?: string[];
} | null {
  return this.translations?.get(language) || null;
};

diseaseSchema.methods.addExpertNote = async function(
  this: IDisease,
  expertId: string,
  note: string,
  isPublic: boolean = true
): Promise<void> {
  if (!this.expertNotes) {
    this.expertNotes = [];
  }
  this.expertNotes.push({
    expertId: new mongoose.Types.ObjectId(expertId),
    note,
    isPublic,
    createdAt: new Date(),
  });
  await this.save();
};

diseaseSchema.methods.verify = async function(
  this: IDisease,
  verifiedBy: string
): Promise<void> {
  this.isVerified = true;
  this.verifiedBy = new mongoose.Types.ObjectId(verifiedBy);
  this.verifiedAt = new Date();
  await this.save();
};

// Static methods
diseaseSchema.statics.findByCategory = async function(category: IDisease['category']): Promise<IDisease[]> {
  return this.find({ 
    category,
    isActive: true,
    isVerified: true 
  }).sort({ name: 1 });
};

diseaseSchema.statics.findByCrop = async function(cropId: string): Promise<IDisease[]> {
  return this.find({
    'affectedCrops.cropId': cropId,
    isActive: true,
    isVerified: true
  }).sort({ severity: -1, name: 1 });
};

diseaseSchema.statics.searchDiseases = async function(
  query: string,
  filters?: {
    category?: string;
    severity?: string;
    cropId?: string;
  }
): Promise<IDisease[]> {
  const searchCriteria: Record<string, unknown> = {
    $text: { $search: query },
    isActive: true,
    isVerified: true,
  };

  if (filters?.category) {
    searchCriteria.category = filters.category;
  }
  if (filters?.severity) {
    searchCriteria.severity = filters.severity;
  }
  if (filters?.cropId) {
    searchCriteria['affectedCrops.cropId'] = filters.cropId;
  }

  return this.find(searchCriteria)
    .sort({ score: { $meta: 'textScore' }, severity: -1 })
    .limit(20);
};

diseaseSchema.statics.getPopularDiseases = async function(limit: number = 10): Promise<IDisease[]> {
  return this.find({
    isActive: true,
    isVerified: true
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Pre-save middleware
diseaseSchema.pre('save', function(this: IDisease, next) {
  // Update search keywords
  this.searchKeywords = [
    ...this.commonNames,
    this.name.toLowerCase(),
    this.scientificName?.toLowerCase() || '',
    this.category,
    ...(this.symptoms?.map(s => s.name.toLowerCase()) || []),
  ].filter(Boolean);

  next();
});

export const Disease = mongoose.model<IDisease, IDiseaseModel>('Disease', diseaseSchema);
export default Disease;