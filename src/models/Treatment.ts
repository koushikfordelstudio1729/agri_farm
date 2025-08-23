import { Schema, model } from 'mongoose';
import { ITreatment, ITreatmentMethods, ITreatmentStatics } from './Treatment.types';

const treatmentSchema = new Schema<ITreatment, ITreatmentStatics, ITreatmentMethods>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['chemical', 'organic', 'biological', 'cultural', 'prevention'],
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['fungicide', 'insecticide', 'herbicide', 'fertilizer', 'supplement', 'practice'],
    index: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  activeIngredients: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    concentration: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
  }],
  application: {
    method: {
      type: String,
      required: true,
      enum: ['spray', 'drench', 'granular', 'injection', 'manual', 'biological_release'],
    },
    dosage: {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      unit: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
      perUnit: {
        type: String,
        required: true,
        enum: ['per_plant', 'per_sqm', 'per_acre', 'per_liter_water'],
      },
    },
    frequency: {
      interval: {
        type: Number,
        required: true,
        min: 1,
      },
      intervalUnit: {
        type: String,
        required: true,
        enum: ['days', 'weeks', 'months'],
      },
      maxApplications: {
        type: Number,
        min: 1,
      },
    },
    timing: {
      growthStages: [{
        type: String,
        trim: true,
      }],
      timeOfDay: {
        type: String,
        enum: ['morning', 'evening', 'anytime'],
      },
      weatherConditions: [{
        type: String,
        trim: true,
      }],
    },
  },
  targets: [{
    type: {
      type: String,
      required: true,
      enum: ['disease', 'pest', 'nutrient_deficiency', 'growth_promotion'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: 'targets.type',
    },
    targetName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
  }],
  suitableCrops: [{
    type: Schema.Types.ObjectId,
    ref: 'Crop',
    index: true,
  }],
  effectiveness: {
    averageSuccess: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    controlLevel: {
      type: String,
      required: true,
      enum: ['preventive', 'curative', 'both'],
    },
    speedOfAction: {
      type: Number,
      required: true,
      min: 0,
      default: 24,
    },
    persistenceDays: {
      type: Number,
      required: true,
      min: 0,
      default: 7,
    },
  },
  safety: {
    toxicityLevel: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
      index: true,
    },
    humanSafety: {
      handlingPrecautions: [{
        type: String,
        required: true,
        trim: true,
      }],
      ppe: [{
        type: String,
        required: true,
        trim: true,
      }],
      firstAid: [{
        type: String,
        required: true,
        trim: true,
      }],
    },
    environmentalImpact: {
      soilPersistence: {
        type: Number,
        required: true,
        min: 0,
      },
      waterSolubility: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high'],
      },
      beesSafety: {
        type: Boolean,
        required: true,
        default: true,
      },
      beneficialInsectsSafety: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    restrictions: {
      preHarvestInterval: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      maxResidueLevel: {
        type: Number,
        min: 0,
      },
      bannedRegions: [{
        type: String,
        trim: true,
      }],
      licenseRequired: {
        type: Boolean,
        default: false,
      },
    },
  },
  cost: {
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3,
      default: 'USD',
    },
    applicationCost: {
      type: Number,
      min: 0,
    },
    costEffectiveness: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
    },
  },
  availability: {
    regions: [{
      type: String,
      required: true,
      trim: true,
      index: true,
    }],
    suppliers: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      contact: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
      inStock: {
        type: Boolean,
        default: true,
      },
    }],
    seasonality: {
      availableMonths: [{
        type: Number,
        min: 1,
        max: 12,
      }],
      peakDemandMonths: [{
        type: Number,
        min: 1,
        max: 12,
      }],
    },
  },
  alternatives: [{
    treatmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Treatment',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    effectiveness: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  }],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    distribution: {
      1: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      5: { type: Number, default: 0, min: 0 },
    },
  },
  images: [{
    type: String,
    trim: true,
  }],
  videos: [{
    type: String,
    trim: true,
  }],
  documents: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['label', 'msds', 'manual', 'research'],
    },
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  isOrganic: {
    type: Boolean,
    default: false,
    index: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  registrationNumber: {
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  },
  manufacturer: {
    type: String,
    trim: true,
    maxlength: 200,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
treatmentSchema.index({ name: 'text', description: 'text', tags: 'text' });
treatmentSchema.index({ type: 1, category: 1 });
treatmentSchema.index({ isApproved: 1, isActive: 1 });
treatmentSchema.index({ 'availability.regions': 1 });
treatmentSchema.index({ suitableCrops: 1 });

export const Treatment = model<ITreatment, ITreatmentStatics>('Treatment', treatmentSchema);
export default Treatment;