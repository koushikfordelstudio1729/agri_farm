import { Schema, model } from 'mongoose';
import { IExpert, IExpertMethods, IExpertStatics } from './Expert.types';

const expertSchema = new Schema<IExpert, IExpertStatics, IExpertMethods>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  credentials: {
    degree: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    graduationYear: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
    certifications: [{
      name: { type: String, required: true, trim: true, maxlength: 200 },
      issuingBody: { type: String, required: true, trim: true, maxlength: 200 },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date },
      certificateNumber: { type: String, trim: true, maxlength: 100 },
      verificationUrl: { type: String, trim: true },
    }],
    licenses: [{
      type: { type: String, required: true, trim: true, maxlength: 100 },
      number: { type: String, required: true, trim: true, maxlength: 100 },
      issuingAuthority: { type: String, required: true, trim: true, maxlength: 200 },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date },
      status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
    }],
  },
  expertise: {
    primarySpecialization: {
      type: String,
      required: true,
      enum: ['crop_management', 'disease_control', 'pest_management', 'soil_science', 'plant_pathology', 'entomology', 'agronomy', 'horticulture', 'irrigation', 'organic_farming'],
      index: true,
    },
    secondarySpecializations: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    crops: [{
      type: Schema.Types.ObjectId,
      ref: 'Crop',
    }],
    diseases: [{
      type: Schema.Types.ObjectId,
      ref: 'Disease',
    }],
    technologies: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    farmingSystems: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    geographicRegions: [{
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    }],
  },
  experience: {
    totalYears: {
      type: Number,
      required: true,
      min: 0,
      max: 60,
    },
    currentPosition: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    currentEmployer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    workHistory: [{
      position: { type: String, required: true, trim: true, maxlength: 200 },
      company: { type: String, required: true, trim: true, maxlength: 200 },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: false },
      description: { type: String, required: true, trim: true, maxlength: 1000 },
      achievements: [{ type: String, trim: true, maxlength: 500 }],
    }],
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationDate: {
      type: Date,
    },
    verificationMethod: [{
      type: String,
      trim: true,
    }],
    documentsSubmitted: [{
      type: { type: String, required: true, trim: true },
      filename: { type: String, required: true, trim: true },
      url: { type: String, required: true, trim: true },
      uploadDate: { type: Date, required: true, default: Date.now },
      verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    }],
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
  },
  stats: {
    consultations: {
      total: { type: Number, default: 0, min: 0 },
      completed: { type: Number, default: 0, min: 0 },
      ongoing: { type: Number, default: 0, min: 0 },
      rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0, min: 0 },
        distribution: {
          1: { type: Number, default: 0, min: 0 },
          2: { type: Number, default: 0, min: 0 },
          3: { type: Number, default: 0, min: 0 },
          4: { type: Number, default: 0, min: 0 },
          5: { type: Number, default: 0, min: 0 },
        },
      },
    },
    responses: {
      communityPosts: { type: Number, default: 0, min: 0 },
      questions: { type: Number, default: 0, min: 0 },
      averageResponseTime: { type: Number, default: 0, min: 0 },
      helpfulnessRating: { type: Number, default: 0, min: 0, max: 5 },
    },
    content: {
      articlesPublished: { type: Number, default: 0, min: 0 },
      videosCreated: { type: Number, default: 0, min: 0 },
      guidesWritten: { type: Number, default: 0, min: 0 },
      totalViews: { type: Number, default: 0, min: 0 },
      totalLikes: { type: Number, default: 0, min: 0 },
    },
  },
  availability: {
    isAvailable: { type: Boolean, default: true, index: true },
    maxConcurrentConsultations: { type: Number, default: 5, min: 1, max: 20 },
    responseTimeCommitment: { type: Number, default: 24, min: 1 },
    workingHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } },
    },
    timezone: { type: String, default: 'UTC' },
    vacationPeriods: [{
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      reason: { type: String, trim: true, maxlength: 200 },
    }],
  },
  pricing: {
    consultationTypes: [{
      type: { type: String, enum: ['chat', 'video', 'phone', 'email', 'field_visit'], required: true },
      pricePerHour: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'USD' },
      duration: { type: Number, required: true, min: 15 },
      description: { type: String, trim: true, maxlength: 500 },
      isAvailable: { type: Boolean, default: true },
    }],
  },
  content: {
    bio: { type: String, trim: true, maxlength: 2000 },
    expertise_summary: { type: String, trim: true, maxlength: 1000 },
    approach: { type: String, trim: true, maxlength: 1000 },
    achievements: [{ type: String, trim: true, maxlength: 500 }],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    index: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
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

expertSchema.index({ 'expertise.primarySpecialization': 1, 'verification.status': 1 });
expertSchema.index({ 'stats.consultations.rating.average': -1, isActive: 1 });

export const Expert = model<IExpert, IExpertStatics>('Expert', expertSchema);
export default Expert;