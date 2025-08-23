import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface ILanguage extends Document {
  _id: DatabaseId;
  code: string; // ISO 639-1 code (e.g., 'en', 'es', 'hi')
  name: string; // English name
  nativeName: string; // Native name
  rtl: boolean; // Right-to-left
  isActive: boolean;
  isDefault: boolean;
  supportLevel: 'full' | 'partial' | 'limited';
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILanguageMethods {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  updateCompletion(): Promise<void>;
}

export interface ILanguageStatics {
  findActive(): Promise<ILanguage[]>;
  findByCode(code: string): Promise<ILanguage | null>;
  getDefault(): Promise<ILanguage | null>;
  getAvailableLanguages(): Promise<{ code: string; name: string; nativeName: string }[]>;
}