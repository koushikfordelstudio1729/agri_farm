import { Schema, model } from 'mongoose';
import { ICrop, ICropMethods, ICropStatics } from './Crop.types';

const growthStageSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  keyCharacteristics: [{
    type: String,
    trim: true,
    maxlength: 200,
  }],
}, { _id: false });

const cropSchema = new Schema<ICrop, ICropStatics, ICropMethods>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true,
  },
  scientificName: {
    type: String,
    trim: true,
    maxlength: 200,
    index: true,
  },
  commonNames: [{
    type: String,
    trim: true,
    maxlength: 100,
  }],
  category: {
    type: String,
    required: true,
    enum: ['cereals', 'vegetables', 'fruits', 'legumes', 'oilseeds', 'cash_crops', 'spices', 'medicinal'],
    index: true,
  },
  family: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  growthStages: [growthStageSchema],
  climate: {
    temperature: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      optimal: { type: Number, required: true },
    },
    humidity: {
      min: { type: Number, min: 0, max: 100 },
      max: { type: Number, min: 0, max: 100 },
    },
    rainfall: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    sunlightHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    soilTypes: [{
      type: String,
      trim: true,
    }],
    phRange: {
      min: { type: Number, min: 0, max: 14 },
      max: { type: Number, min: 0, max: 14 },
    },
  },
  plantingSeason: [{
    startMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    endMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    regions: [{
      type: String,
      trim: true,
    }],
  }],
  harvestingSeason: [{
    startMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    endMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    regions: [{
      type: String,
      trim: true,
    }],
  }],
  marketInfo: {
    averagePrice: {
      type: Number,
      min: 0,
    },
    priceUnit: {
      type: String,
      enum: ['per_kg', 'per_quintal', 'per_ton', 'per_piece'],
    },
    currency: {
      type: String,
      trim: true,
      maxlength: 3,
    },
    demandLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    exportPotential: {
      type: Boolean,
      default: false,
    },
  },
  nutrition: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbohydrates: { type: Number, min: 0 },
    fiber: { type: Number, min: 0 },
    vitamins: {
      type: Map,
      of: Number,
    },
    minerals: {
      type: Map,
      of: Number,
    },
  },
  commonDiseases: [{
    type: Schema.Types.ObjectId,
    ref: 'Disease',
  }],
  commonPests: [{
    type: String,
    trim: true,
    maxlength: 100,
  }],
  resistantVarieties: [{
    type: String,
    trim: true,
    maxlength: 200,
  }],
  cultivationRegions: [{
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  }],
  nativeRegion: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  images: [{
    type: String,
    trim: true,
  }],
  videos: [{
    type: String,
    trim: true,
  }],
  resources: [{
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
      enum: ['guide', 'research', 'video', 'article'],
    },
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  isPopular: {
    type: Boolean,
    default: false,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
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
cropSchema.index({ name: 'text', description: 'text', commonNames: 'text' });
cropSchema.index({ cultivationRegions: 1 });
cropSchema.index({ isActive: 1, approvalStatus: 1 });

export const Crop = model<ICrop, ICropStatics>('Crop', cropSchema);
export default Crop;