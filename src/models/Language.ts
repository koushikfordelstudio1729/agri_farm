import mongoose, { Schema, Model } from 'mongoose';
import { ILanguage, ILanguageModel } from '@/interfaces/ILanguage';
import { LanguageCode } from '@/types';

const languageSchema = new Schema<ILanguage>({
  code: {
    type: String,
    required: [true, 'Language code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    enum: ['EN', 'ES', 'FR', 'PT', 'HI', 'BN', 'ID', 'VI'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Language name is required'],
    trim: true,
  },
  nativeName: {
    type: String,
    required: [true, 'Native language name is required'],
    trim: true,
  },
  englishName: {
    type: String,
    required: [true, 'English language name is required'],
    trim: true,
  },
  isRTL: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  flag: {
    type: String,
    trim: true,
  },
  locale: {
    type: String,
    required: true,
    trim: true,
  },
  translationProgress: {
    total: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  regions: [{
    type: String,
    trim: true,
  }],
  countries: [{
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  }],
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD',
  },
  timeFormat: {
    type: String,
    default: 'HH:mm',
  },
  numberFormat: {
    decimalSeparator: {
      type: String,
      default: '.',
    },
    thousandSeparator: {
      type: String,
      default: ',',
    },
  },
  currency: {
    code: {
      type: String,
      default: 'USD',
    },
    symbol: {
      type: String,
      default: '$',
    },
    position: {
      type: String,
      enum: ['before', 'after'],
      default: 'before',
    },
  },
  fallbackLanguage: {
    type: String,
    enum: ['EN', 'ES', 'FR', 'PT', 'HI', 'BN', 'ID', 'VI'],
    default: 'EN',
  },
  supportedFeatures: {
    voice: {
      type: Boolean,
      default: false,
    },
    speechToText: {
      type: Boolean,
      default: false,
    },
    textToSpeech: {
      type: Boolean,
      default: false,
    },
    ocr: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
languageSchema.index({ code: 1 });
languageSchema.index({ isActive: 1, isDefault: 1 });
languageSchema.index({ 'countries.code': 1 });

// Virtual for completion status
languageSchema.virtual('isComplete').get(function(this: ILanguage): boolean {
  return this.translationProgress.percentage >= 100;
});

// Virtual for completion color
languageSchema.virtual('completionColor').get(function(this: ILanguage): string {
  const percentage = this.translationProgress.percentage;
  if (percentage >= 100) return 'green';
  if (percentage >= 80) return 'yellow';
  if (percentage >= 50) return 'orange';
  return 'red';
});

// Instance methods
languageSchema.methods.updateProgress = async function(
  this: ILanguage,
  completed: number,
  total: number
): Promise<void> {
  this.translationProgress.completed = completed;
  this.translationProgress.total = total;
  this.translationProgress.percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  this.translationProgress.lastUpdated = new Date();
  await this.save();
};

languageSchema.methods.activate = async function(this: ILanguage): Promise<void> {
  this.isActive = true;
  await this.save();
};

languageSchema.methods.deactivate = async function(this: ILanguage): Promise<void> {
  this.isActive = false;
  await this.save();
};

languageSchema.methods.setAsDefault = async function(this: ILanguage): Promise<void> {
  // First, remove default flag from all other languages
  await (this.constructor as ILanguageModel).updateMany(
    { _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  // Set this language as default
  this.isDefault = true;
  await this.save();
};

languageSchema.methods.addCountry = async function(
  this: ILanguage,
  countryCode: string,
  countryName: string
): Promise<void> {
  if (!this.countries.some(c => c.code === countryCode.toUpperCase())) {
    this.countries.push({
      code: countryCode.toUpperCase(),
      name: countryName,
    });
    await this.save();
  }
};

languageSchema.methods.removeCountry = async function(
  this: ILanguage,
  countryCode: string
): Promise<void> {
  this.countries = this.countries.filter(c => c.code !== countryCode.toUpperCase());
  await this.save();
};

// Static methods
languageSchema.statics.findByCode = async function(code: LanguageCode): Promise<ILanguage | null> {
  return this.findOne({ 
    code: code.toUpperCase(), 
    isActive: true 
  });
};

languageSchema.statics.getActiveLanguages = async function(): Promise<ILanguage[]> {
  return this.find({ isActive: true })
    .sort({ isDefault: -1, name: 1 });
};

languageSchema.statics.getDefaultLanguage = async function(): Promise<ILanguage | null> {
  return this.findOne({ 
    isDefault: true, 
    isActive: true 
  });
};

languageSchema.statics.findByCountry = async function(countryCode: string): Promise<ILanguage[]> {
  return this.find({
    'countries.code': countryCode.toUpperCase(),
    isActive: true
  }).sort({ name: 1 });
};

languageSchema.statics.getTranslationStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalLanguages: { $sum: 1 },
        completedLanguages: {
          $sum: { $cond: [{ $gte: ['$translationProgress.percentage', 100] }, 1, 0] }
        },
        averageProgress: { $avg: '$translationProgress.percentage' },
        totalTranslations: { $sum: '$translationProgress.total' },
        completedTranslations: { $sum: '$translationProgress.completed' },
      }
    }
  ]);

  const progressByLanguage = await this.find({ isActive: true })
    .select('code name translationProgress')
    .sort({ 'translationProgress.percentage': -1 });

  return {
    overview: stats[0] || {
      totalLanguages: 0,
      completedLanguages: 0,
      averageProgress: 0,
      totalTranslations: 0,
      completedTranslations: 0,
    },
    byLanguage: progressByLanguage,
  };
};

languageSchema.statics.createLanguage = async function(
  languageData: {
    code: LanguageCode;
    name: string;
    nativeName: string;
    englishName: string;
    locale: string;
    isRTL?: boolean;
    countries?: Array<{ code: string; name: string; }>;
  }
): Promise<ILanguage> {
  const language = new this({
    ...languageData,
    code: languageData.code.toUpperCase(),
    translationProgress: {
      total: 0,
      completed: 0,
      percentage: 0,
      lastUpdated: new Date(),
    },
  });

  return await language.save();
};

languageSchema.statics.searchLanguages = async function(
  query: string
): Promise<ILanguage[]> {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    isActive: true,
    $or: [
      { name: searchRegex },
      { nativeName: searchRegex },
      { englishName: searchRegex },
      { code: searchRegex },
      { locale: searchRegex },
    ]
  }).sort({ name: 1 });
};

// Pre-save middleware
languageSchema.pre('save', function(this: ILanguage, next) {
  // Ensure code is always uppercase
  this.code = this.code.toUpperCase() as LanguageCode;
  
  // Update translation progress percentage
  if (this.translationProgress.total > 0) {
    this.translationProgress.percentage = Math.round(
      (this.translationProgress.completed / this.translationProgress.total) * 100
    );
  }

  next();
});

// Ensure only one default language exists
languageSchema.pre('save', async function(this: ILanguage, next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await (this.constructor as ILanguageModel).updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

export const Language = mongoose.model<ILanguage, ILanguageModel>('Language', languageSchema);
export default Language;