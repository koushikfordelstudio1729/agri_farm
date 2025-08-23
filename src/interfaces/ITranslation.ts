import { Document, Model } from 'mongoose';
import { LanguageCode, TranslationStatus, TranslationContext } from '@/types';

export interface ITranslation extends Document {
  key: string;
  namespace: string;
  language: LanguageCode;
  value: string;
  pluralValue?: string;
  context: TranslationContext;
  description?: string;
  maxLength?: number;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    description?: string;
    required: boolean;
  }>;
  status: TranslationStatus;
  quality: {
    score?: number;
    automated: boolean;
    reviewedBy?: string;
    reviewedAt?: Date;
    comments?: string;
  };
  metadata: {
    originalValue?: string;
    sourceLanguage: LanguageCode;
    translatedBy?: string;
    translatedAt?: Date;
    lastModifiedBy?: string;
    version: number;
    isAutomated: boolean;
    confidence?: number;
  };
  tags: string[];
  usage: {
    count: number;
    lastUsed?: Date;
    platforms: Array<'web' | 'mobile' | 'api' | 'email'>;
  };
  fallback: {
    language?: LanguageCode;
    value?: string;
  };
  isActive: boolean;
  isDeprecated: boolean;
  deprecationReason?: string;
  replacementKey?: string;

  // Virtuals
  fullKey: string;
  completionPercentage: number;
  hasPlurals: boolean;

  // Instance methods
  updateStatus(status: TranslationStatus, updatedBy?: string, comments?: string): Promise<void>;
  updateValue(value: string, updatedBy?: string, pluralValue?: string): Promise<void>;
  markAsUsed(platform?: 'web' | 'mobile' | 'api' | 'email'): Promise<void>;
  deprecate(reason: string, replacementKey?: string): Promise<void>;
  activate(): Promise<void>;
  setQualityScore(score: number, reviewedBy?: string, comments?: string): Promise<void>;
}

export interface ITranslationStatics {
  findByKey(namespace: string, key: string, language: LanguageCode): Promise<ITranslation | null>;
  findByNamespace(namespace: string, language?: LanguageCode): Promise<ITranslation[]>;
  getTranslationsByLanguage(language: LanguageCode, status?: TranslationStatus): Promise<ITranslation[]>;
  searchTranslations(query: string, language?: LanguageCode, context?: TranslationContext): Promise<ITranslation[]>;
  getTranslationStats(language?: LanguageCode): Promise<Array<{
    language?: LanguageCode;
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    approved: number;
    rejected: number;
    completionPercentage: number;
    averageQualityScore: number;
  }>>;
  getMissingTranslations(sourceLanguage: LanguageCode, targetLanguage: LanguageCode): Promise<string[]>;
  createTranslation(data: {
    key: string;
    namespace: string;
    language: LanguageCode;
    value: string;
    pluralValue?: string;
    context?: TranslationContext;
    description?: string;
    translatedBy?: string;
  }): Promise<ITranslation>;
  bulkUpdateStatus(ids: string[], status: TranslationStatus, updatedBy?: string): Promise<number>;
}

export interface ITranslationModel extends Model<ITranslation>, ITranslationStatics {}