import mongoose, { Schema } from 'mongoose';
import { IDiagnosis, IDiagnosisModel } from '@/interfaces/IDiagnosis';
import { DiagnosisResult, PlantImage, DiagnosisRequest } from '@/types';

const plantImageSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  processedUrl: String,
  metadata: {
    size: { type: Number, required: true },
    format: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    colorSpace: { type: String, required: true },
    quality: Number,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const diagnosisResultSchema = new Schema({
  diseaseId: {
    type: Schema.Types.ObjectId,
    ref: 'Disease',
    required: true,
  },
  diseaseName: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  affectedArea: Number,
  symptoms: [String],
  causes: [String],
  treatments: [{
    step: Number,
    title: String,
    description: String,
    imageUrl: String,
    duration: String,
  }],
  preventionTips: [String],
  expectedRecoveryTime: String,
  riskFactors: [String],
}, { _id: false });

const diagnosisRequestSchema = new Schema({
  cropId: {
    type: Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
  cropName: {
    type: String,
    required: true,
  },
  plantAge: Number,
  growthStage: String,
  symptoms: [String],
  environmentalFactors: {
    weather: String,
    soilType: String,
    irrigationType: String,
    fertilizers: [String],
    pesticides: [String],
    temperature: Number,
    humidity: Number,
  },
  farmingPractices: {
    organic: { type: Boolean, default: false },
    greenhouse: { type: Boolean, default: false },
    hydroponics: { type: Boolean, default: false },
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium',
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  notes: String,
}, { _id: false });

const diagnosisSchema = new Schema<IDiagnosis>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  images: {
    type: [plantImageSchema],
    required: true,
    validate: {
      validator: function(images: PlantImage[]): boolean {
        return images.length > 0 && images.length <= 10;
      },
      message: 'Must have between 1 and 10 images',
    },
  },
  request: {
    type: diagnosisRequestSchema,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  results: [diagnosisResultSchema],
  aiModel: {
    name: {
      type: String,
      required: true,
      default: 'plantnet-v2.0',
    },
    version: {
      type: String,
      required: true,
      default: '2.0.0',
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  expertReview: {
    expertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    approved: Boolean,
    modifications: Schema.Types.Mixed,
    notes: String,
  },
  processingTime: {
    type: Number,
    min: 0,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: String,
    isHelpful: Boolean,
    submittedAt: Date,
  },
  shareData: {
    anonymous: {
      type: Boolean,
      default: false,
    },
    forResearch: {
      type: Boolean,
      default: false,
    },
    forTraining: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
diagnosisSchema.index({ userId: 1, createdAt: -1 });
diagnosisSchema.index({ status: 1, createdAt: -1 });
diagnosisSchema.index({ 'request.cropId': 1 });
diagnosisSchema.index({ confidence: -1 });
diagnosisSchema.index({ tags: 1 });
diagnosisSchema.index({ isPublic: 1, status: 1 });

// Instance methods
diagnosisSchema.methods.updateStatus = async function(this: IDiagnosis, status: IDiagnosis['status']): Promise<void> {
  this.status = status;
  await this.save();
};

diagnosisSchema.methods.addResults = async function(this: IDiagnosis, results: DiagnosisResult[]): Promise<void> {
  this.results = results;
  this.confidence = results.length > 0 ? Math.max(...results.map(r => r.confidence)) : 0;
  await this.save();
};

diagnosisSchema.methods.markAsCompleted = async function(
  this: IDiagnosis, 
  results: DiagnosisResult[], 
  processingTime: number
): Promise<void> {
  this.status = 'completed';
  this.results = results;
  this.processingTime = processingTime;
  this.confidence = results.length > 0 ? Math.max(...results.map(r => r.confidence)) : 0;
  await this.save();
};

diagnosisSchema.methods.submitFeedback = async function(
  this: IDiagnosis,
  rating: number,
  comment?: string,
  isHelpful?: boolean
): Promise<void> {
  this.feedback = {
    rating,
    comment: comment || undefined,
    isHelpful: isHelpful || undefined,
    submittedAt: new Date(),
  };
  await this.save();
};

diagnosisSchema.methods.toPublicJSON = function(this: IDiagnosis): Partial<IDiagnosis> {
  const obj = this.toObject();
  if (obj.shareData.anonymous) {
    delete obj.userId;
  }
  delete obj.shareData;
  return obj;
};

// Static methods
diagnosisSchema.statics.findByUserId = async function(userId: string): Promise<IDiagnosis[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

diagnosisSchema.statics.findPending = async function(): Promise<IDiagnosis[]> {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

diagnosisSchema.statics.findByStatus = async function(status: IDiagnosis['status']): Promise<IDiagnosis[]> {
  return this.find({ status }).sort({ createdAt: -1 });
};

diagnosisSchema.statics.getStats = async function(dateRange?: { start: Date; end: Date }) {
  const matchStage = dateRange 
    ? { createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
    : {};

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        },
        pending: { 
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } 
        },
        failed: { 
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } 
        },
        avgProcessingTime: { 
          $avg: { 
            $cond: [
              { $ne: ['$processingTime', null] }, 
              '$processingTime', 
              null
            ] 
          } 
        },
        avgConfidence: { $avg: '$confidence' },
      },
    },
  ]);

  return stats[0] || {
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    averageProcessingTime: 0,
    averageConfidence: 0,
  };
};

export const Diagnosis = mongoose.model<IDiagnosis, IDiagnosisModel>('Diagnosis', diagnosisSchema);
export default Diagnosis;