import { Document, Model } from 'mongoose';
import { LanguageCode } from '@/types';

export interface ILanguage extends Document {
  code: LanguageCode;
  name: string;
  nativeName: string;
  englishName: string;
  isRTL: boolean;
  isActive: boolean;
  isDefault: boolean;
  flag?: string;
  locale: string;
  translationProgress: {
    total: number;
    completed: number;
    percentage: number;
    lastUpdated: Date;
  };
  regions: string[];
  countries: Array<{
    code: string;
    name: string;
  }>;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimalSeparator: string;
    thousandSeparator: string;
  };
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  fallbackLanguage: LanguageCode;
  supportedFeatures: {
    voice: boolean;
    speechToText: boolean;
    textToSpeech: boolean;
    ocr: boolean;
  };

  // Virtuals
  isComplete: boolean;
  completionColor: string;

  // Instance methods
  updateProgress(completed: number, total: number): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  setAsDefault(): Promise<void>;
  addCountry(countryCode: string, countryName: string): Promise<void>;
  removeCountry(countryCode: string): Promise<void>;
}

export interface ILanguageStatics {
  findByCode(code: LanguageCode): Promise<ILanguage | null>;
  getActiveLanguages(): Promise<ILanguage[]>;
  getDefaultLanguage(): Promise<ILanguage | null>;
  findByCountry(countryCode: string): Promise<ILanguage[]>;
  getTranslationStats(): Promise<{
    overview: {
      totalLanguages: number;
      completedLanguages: number;
      averageProgress: number;
      totalTranslations: number;
      completedTranslations: number;
    };
    byLanguage: Array<{
      code: LanguageCode;
      name: string;
      translationProgress: ILanguage['translationProgress'];
    }>;
  }>;
  createLanguage(languageData: {
    code: LanguageCode;
    name: string;
    nativeName: string;
    englishName: string;
    locale: string;
    isRTL?: boolean;
    countries?: Array<{ code: string; name: string; }>;
  }): Promise<ILanguage>;
  searchLanguages(query: string): Promise<ILanguage[]>;
}

export interface ILanguageModel extends Model<ILanguage>, ILanguageStatics {}