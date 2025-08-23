import mongoose, { Schema, Model } from 'mongoose';
import { ITranslation, ITranslationModel } from '@/interfaces/ITranslation';
import { LanguageCode, TranslationStatus, TranslationContext } from '@/types';

const translationSchema = new Schema<ITranslation>({
  key: {
    type: String,
    required: [true, 'Translation key is required'],
    trim: true,
    index: true,
  },
  namespace: {
    type: String,
    required: [true, 'Translation namespace is required'],
    trim: true,
    index: true,
  },
  language: {
    type: String,
    required: [true, 'Language code is required'],
    uppercase: true,
    trim: true,
    enum: ['EN', 'ES', 'FR', 'PT', 'HI', 'BN', 'ID', 'VI'],
    index: true,
  },
  value: {
    type: String,
    required: [true, 'Translation value is required'],
  },
  pluralValue: {
    type: String,
  },
  context: {
    type: String,
    enum: ['ui', 'api', 'email', 'sms', 'push', 'disease', 'crop', 'treatment', 'symptom', 'general'],
    default: 'general',
    index: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  maxLength: {
    type: Number,
    min: 0,
  },
  variables: [{
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean'],
      default: 'string',
    },
    description: String,
    required: {
      type: Boolean,
      default: false,
    },
  }],
  status: {
    type: String,
    enum: ['pending', 'translated', 'reviewed', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    automated: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    comments: String,
  },
  metadata: {
    originalValue: String,
    sourceLanguage: {
      type: String,
      enum: ['EN', 'ES', 'FR', 'PT', 'HI', 'BN', 'ID', 'VI'],
      default: 'EN',
    },
    translatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    translatedAt: Date,
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    version: {
      type: Number,
      default: 1,
    },
    isAutomated: {
      type: Boolean,
      default: false,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  tags: [String],
  usage: {
    count: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,
    platforms: [{
      type: String,
      enum: ['web', 'mobile', 'api', 'email'],
    }],
  },
  fallback: {
    language: {
      type: String,
      enum: ['EN', 'ES', 'FR', 'PT', 'HI', 'BN', 'ID', 'VI'],
    },
    value: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isDeprecated: {
    type: Boolean,
    default: false,
    index: true,
  },
  deprecationReason: String,
  replacementKey: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for performance
translationSchema.index({ namespace: 1, key: 1, language: 1 }, { unique: true });
translationSchema.index({ language: 1, status: 1 });
translationSchema.index({ context: 1, language: 1 });
translationSchema.index({ 'metadata.translatedBy': 1, status: 1 });
translationSchema.index({ isActive: 1, isDeprecated: 1 });

// Text search index
translationSchema.index({
  key: 'text',
  value: 'text',
  description: 'text',
  'variables.name': 'text',
});

// Virtual for full key path
translationSchema.virtual('fullKey').get(function(this: ITranslation): string {
  return `${this.namespace}.${this.key}`;
});

// Virtual for completion percentage
translationSchema.virtual('completionPercentage').get(function(this: ITranslation): number {
  if (this.status === 'approved') return 100;
  if (this.status === 'reviewed') return 90;
  if (this.status === 'translated') return 75;
  if (this.status === 'pending') return 0;
  return 50; // rejected
});

// Virtual for has plurals
translationSchema.virtual('hasPlurals').get(function(this: ITranslation): boolean {
  return Boolean(this.pluralValue);
});

// Instance methods
translationSchema.methods.updateStatus = async function(
  this: ITranslation,
  status: TranslationStatus,
  updatedBy?: string,
  comments?: string
): Promise<void> {
  this.status = status;
  
  if (updatedBy) {
    this.metadata.lastModifiedBy = new mongoose.Types.ObjectId(updatedBy);
  }
  
  if (status === 'reviewed' || status === 'approved') {
    this.quality.reviewedBy = updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined;
    this.quality.reviewedAt = new Date();
    this.quality.comments = comments;
  }

  await this.save();
};

translationSchema.methods.updateValue = async function(
  this: ITranslation,
  value: string,
  updatedBy?: string,
  pluralValue?: string
): Promise<void> {
  this.value = value;
  if (pluralValue) {
    this.pluralValue = pluralValue;
  }
  
  this.metadata.lastModifiedBy = updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined;
  this.metadata.version += 1;
  this.status = 'translated';
  
  await this.save();
};

translationSchema.methods.markAsUsed = async function(
  this: ITranslation,
  platform?: 'web' | 'mobile' | 'api' | 'email'
): Promise<void> {
  this.usage.count += 1;
  this.usage.lastUsed = new Date();
  
  if (platform && !this.usage.platforms.includes(platform)) {
    this.usage.platforms.push(platform);
  }
  
  await this.save();
};

translationSchema.methods.deprecate = async function(
  this: ITranslation,
  reason: string,
  replacementKey?: string
): Promise<void> {
  this.isDeprecated = true;
  this.deprecationReason = reason;
  this.replacementKey = replacementKey;
  await this.save();
};

translationSchema.methods.activate = async function(this: ITranslation): Promise<void> {
  this.isActive = true;
  this.isDeprecated = false;
  await this.save();
};

translationSchema.methods.setQualityScore = async function(
  this: ITranslation,
  score: number,
  reviewedBy?: string,
  comments?: string
): Promise<void> {
  this.quality.score = Math.max(0, Math.min(100, score));
  this.quality.reviewedBy = reviewedBy ? new mongoose.Types.ObjectId(reviewedBy) : undefined;
  this.quality.reviewedAt = new Date();
  this.quality.comments = comments;
  await this.save();
};

// Static methods
translationSchema.statics.findByKey = async function(
  namespace: string,
  key: string,
  language: LanguageCode
): Promise<ITranslation | null> {
  return this.findOne({
    namespace,
    key,
    language: language.toUpperCase(),
    isActive: true,
    isDeprecated: false,
  });
};

translationSchema.statics.findByNamespace = async function(
  namespace: string,
  language?: LanguageCode
): Promise<ITranslation[]> {
  const query: Record<string, unknown> = {
    namespace,
    isActive: true,
    isDeprecated: false,
  };

  if (language) {
    query.language = language.toUpperCase();
  }

  return this.find(query).sort({ key: 1 });
};

translationSchema.statics.getTranslationsByLanguage = async function(
  language: LanguageCode,
  status?: TranslationStatus
): Promise<ITranslation[]> {
  const query: Record<string, unknown> = {
    language: language.toUpperCase(),
    isActive: true,
    isDeprecated: false,
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ namespace: 1, key: 1 });
};

translationSchema.statics.searchTranslations = async function(
  query: string,
  language?: LanguageCode,
  context?: TranslationContext
): Promise<ITranslation[]> {
  const searchCriteria: Record<string, unknown> = {
    $text: { $search: query },
    isActive: true,
    isDeprecated: false,
  };

  if (language) {
    searchCriteria.language = language.toUpperCase();
  }

  if (context) {
    searchCriteria.context = context;
  }

  return this.find(searchCriteria)
    .sort({ score: { $meta: 'textScore' }, namespace: 1, key: 1 })
    .limit(50);
};

translationSchema.statics.getTranslationStats = async function(
  language?: LanguageCode
) {
  const matchStage: Record<string, unknown> = {
    isActive: true,
    isDeprecated: false,
  };

  if (language) {
    matchStage.language = language.toUpperCase();
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: language ? null : '$language',
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        translated: { $sum: { $cond: [{ $eq: ['$status', 'translated'] }, 1, 0] } },
        reviewed: { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        avgQualityScore: {
          $avg: {
            $cond: [
              { $ne: ['$quality.score', null] },
              '$quality.score',
              null
            ]
          }
        },
      }
    }
  ]);

  return stats.map(stat => ({
    language: stat._id || language,
    total: stat.total,
    completed: stat.approved + stat.reviewed,
    pending: stat.pending,
    inProgress: stat.translated,
    approved: stat.approved,
    rejected: stat.rejected,
    completionPercentage: stat.total > 0 ? Math.round(((stat.approved + stat.reviewed) / stat.total) * 100) : 0,
    averageQualityScore: stat.avgQualityScore || 0,
  }));
};

translationSchema.statics.getMissingTranslations = async function(
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string[]> {
  const sourceKeys = await this.distinct('key', {
    language: sourceLanguage.toUpperCase(),
    isActive: true,
    isDeprecated: false,
  });

  const targetKeys = await this.distinct('key', {
    language: targetLanguage.toUpperCase(),
    isActive: true,
    isDeprecated: false,
  });

  return sourceKeys.filter(key => !targetKeys.includes(key));
};

translationSchema.statics.createTranslation = async function(
  data: {
    key: string;
    namespace: string;
    language: LanguageCode;
    value: string;
    pluralValue?: string;
    context?: TranslationContext;
    description?: string;
    translatedBy?: string;
  }
): Promise<ITranslation> {
  const translation = new this({
    ...data,
    language: data.language.toUpperCase(),
    metadata: {
      translatedBy: data.translatedBy ? new mongoose.Types.ObjectId(data.translatedBy) : undefined,
      translatedAt: new Date(),
      version: 1,
      sourceLanguage: 'EN',
    },
    status: 'translated',
  });

  return await translation.save();
};

translationSchema.statics.bulkUpdateStatus = async function(
  ids: string[],
  status: TranslationStatus,
  updatedBy?: string
): Promise<number> {
  const updateData: Record<string, unknown> = { status };
  
  if (updatedBy) {
    updateData['metadata.lastModifiedBy'] = new mongoose.Types.ObjectId(updatedBy);
  }

  const result = await this.updateMany(
    { _id: { $in: ids } },
    updateData
  );

  return result.modifiedCount;
};

// Pre-save middleware
translationSchema.pre('save', function(this: ITranslation, next) {
  // Ensure language is always uppercase
  this.language = this.language.toUpperCase() as LanguageCode;
  
  // Update metadata on save
  if (this.isModified('value') || this.isModified('pluralValue')) {
    this.metadata.version += 1;
  }

  next();
});

export const Translation = mongoose.model<ITranslation, ITranslationModel>('Translation', translationSchema);
export default Translation;