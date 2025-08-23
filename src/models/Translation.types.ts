import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface ITranslation extends Document {
  _id: DatabaseId;
  key: string; // Translation key (e.g., 'common.submit')
  namespace: string; // Namespace (e.g., 'common', 'auth', 'crops')
  sourceLanguage: string;
  translations: {
    language: string;
    value: string;
    isVerified: boolean;
    translatedBy: 'auto' | 'human';
    translatorId?: DatabaseId;
    lastModified: Date;
  }[];
  context?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranslationMethods {
  addTranslation(language: string, value: string, translatedBy: 'auto' | 'human', translatorId?: DatabaseId): Promise<void>;
  updateTranslation(language: string, value: string, translatorId?: DatabaseId): Promise<void>;
  verifyTranslation(language: string, verifiedBy: DatabaseId): Promise<void>;
  getTranslation(language: string): string | null;
}

export interface ITranslationStatics {
  findByNamespace(namespace: string, language?: string): Promise<ITranslation[]>;
  findByKey(key: string): Promise<ITranslation | null>;
  findMissingTranslations(language: string): Promise<ITranslation[]>;
  bulkImport(translations: any[], namespace: string): Promise<number>;
  exportTranslations(language: string, namespace?: string): Promise<Record<string, string>>;
}