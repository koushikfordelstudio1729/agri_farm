import type { 
  DatabaseId, 
  BaseDocument, 
  LanguageCode 
} from './common.types';

export interface Language extends BaseDocument {
  id: DatabaseId;
  code: LanguageCode;
  name: string;
  nativeName: string;
  region?: string;
  isRtl: boolean;
  isActive: boolean;
  isDefault: boolean;
  fallbackLanguage?: LanguageCode;
  metadata: {
    pluralRules: string[];
    dateFormat: string;
    timeFormat: string;
    numberFormat: {
      decimal: string;
      thousands: string;
      currency: string;
    };
    fontFamily?: string;
    fontWeight?: string;
  };
  translationProgress: {
    total: number;
    completed: number;
    reviewed: number;
    percentage: number;
  };
  contributors: {
    userId: DatabaseId;
    role: 'translator' | 'reviewer' | 'coordinator';
    contributionCount: number;
  }[];
  lastUpdated: Date;
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationKey extends BaseDocument {
  id: DatabaseId;
  key: string;
  namespace: string;
  category: 'ui' | 'content' | 'error' | 'validation' | 'notification' | 'email' | 'sms';
  context?: string;
  description: string;
  maxLength?: number;
  isPlural: boolean;
  placeholders: {
    name: string;
    type: 'string' | 'number' | 'date' | 'time' | 'currency' | 'percentage';
    description: string;
    example: string;
  }[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  isDeprecated: boolean;
  deprecationReason?: string;
  replacementKey?: string;
  usageCount: number;
  lastUsed?: Date;
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Translation extends BaseDocument {
  id: DatabaseId;
  keyId: DatabaseId;
  languageCode: LanguageCode;
  value: string;
  pluralForms?: {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
  };
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'needs_update';
  quality: {
    score: number;
    issues: {
      type: 'grammar' | 'spelling' | 'context' | 'length' | 'placeholder' | 'formatting';
      description: string;
      suggestion?: string;
    }[];
    lastChecked?: Date;
  };
  versions: {
    version: number;
    value: string;
    changeReason: string;
    translatedBy: DatabaseId;
    translatedAt: Date;
  }[];
  metadata: {
    translatedBy: DatabaseId;
    reviewedBy?: DatabaseId;
    approvedBy?: DatabaseId;
    translationMemory?: boolean;
    machineTranslated?: boolean;
    confidence?: number;
    reviewNotes?: string;
  };
  translatedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationProject extends BaseDocument {
  id: DatabaseId;
  name: string;
  description: string;
  sourceLanguage: LanguageCode;
  targetLanguages: LanguageCode[];
  keys: DatabaseId[];
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  budget?: {
    amount: number;
    currency: string;
    ratePerWord?: number;
  };
  team: {
    managerId: DatabaseId;
    translators: {
      userId: DatabaseId;
      languages: LanguageCode[];
      assignedKeys: DatabaseId[];
      rate?: number;
    }[];
    reviewers: {
      userId: DatabaseId;
      languages: LanguageCode[];
      assignedKeys: DatabaseId[];
      rate?: number;
    }[];
  };
  progress: {
    totalKeys: number;
    translatedKeys: number;
    reviewedKeys: number;
    approvedKeys: number;
    percentage: number;
    byLanguage: {
      language: LanguageCode;
      translated: number;
      reviewed: number;
      approved: number;
      percentage: number;
    }[];
  };
  workflow: {
    requireReview: boolean;
    requireApproval: boolean;
    allowMachineTranslation: boolean;
    qualityThreshold: number;
    autoApproveThreshold?: number;
  };
  deliverables: {
    formats: ('json' | 'po' | 'xliff' | 'csv' | 'properties')[];
    structure: 'flat' | 'nested' | 'namespaced';
    exportLocation: string;
    autoExport: boolean;
  };
  createdBy: DatabaseId;
  assignedTo?: DatabaseId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationMemory {
  id: DatabaseId;
  sourceText: string;
  targetText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  context?: string;
  domain: string;
  quality: number;
  usage_count: number;
  createdBy: DatabaseId;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlossaryTerm {
  id: DatabaseId;
  term: string;
  definition: Record<LanguageCode, string>;
  translations: Record<LanguageCode, {
    value: string;
    alternatives: string[];
    notes?: string;
    context?: string;
  }>;
  category: string;
  domain: 'agriculture' | 'technology' | 'business' | 'medical' | 'legal' | 'general';
  isPreferred: boolean;
  doNotTranslate: boolean;
  caseSensitive: boolean;
  tags: string[];
  usage_examples: {
    language: LanguageCode;
    example: string;
    translation?: Record<LanguageCode, string>;
  }[];
  createdBy: DatabaseId;
  lastModifiedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalizationConfig {
  id: DatabaseId;
  region: string;
  country: string;
  language: LanguageCode;
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
    decimals: number;
  };
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  dateFormat: {
    short: string;
    medium: string;
    long: string;
    time: string;
    datetime: string;
  };
  timezone: string;
  units: {
    measurement: 'metric' | 'imperial';
    temperature: 'celsius' | 'fahrenheit';
    area: 'hectares' | 'acres' | 'square_meters';
    weight: 'kg' | 'pounds' | 'tons';
    distance: 'km' | 'miles';
  };
  addressFormat: {
    order: string[];
    required: string[];
    postalCodeFormat?: string;
    phoneFormat?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTranslationKeyRequest {
  key: string;
  namespace: string;
  category: TranslationKey['category'];
  description: string;
  context?: string;
  isPlural?: boolean;
  maxLength?: number;
  placeholders?: TranslationKey['placeholders'];
  priority?: TranslationKey['priority'];
}

export interface CreateTranslationRequest {
  keyId: DatabaseId;
  languageCode: LanguageCode;
  value: string;
  pluralForms?: Translation['pluralForms'];
  context?: string;
}

export interface UpdateTranslationRequest {
  value?: string;
  pluralForms?: Translation['pluralForms'];
  status?: Translation['status'];
  reviewNotes?: string;
}

export interface TranslationSearchFilters {
  namespace?: string;
  category?: TranslationKey['category'];
  language?: LanguageCode;
  status?: Translation['status'];
  translatedBy?: DatabaseId;
  reviewedBy?: DatabaseId;
  hasIssues?: boolean;
  isPlural?: boolean;
  lastModifiedAfter?: Date;
  priority?: TranslationKey['priority'];
  tags?: string[];
}

export interface TranslationStats {
  totalKeys: number;
  totalTranslations: number;
  completionRate: {
    overall: number;
    byLanguage: {
      language: LanguageCode;
      total: number;
      completed: number;
      percentage: number;
    }[];
    byNamespace: {
      namespace: string;
      total: number;
      completed: number;
      percentage: number;
    }[];
  };
  qualityMetrics: {
    averageQuality: number;
    issueCount: number;
    reviewPending: number;
    rejectedCount: number;
  };
  productivity: {
    translationsThisWeek: number;
    translationsThisMonth: number;
    topTranslators: {
      userId: DatabaseId;
      name: string;
      count: number;
      quality: number;
    }[];
    topReviewers: {
      userId: DatabaseId;
      name: string;
      reviewCount: number;
    }[];
  };
  coverage: {
    missingTranslations: {
      language: LanguageCode;
      count: number;
      criticalCount: number;
    }[];
    outdatedTranslations: {
      language: LanguageCode;
      count: number;
    }[];
  };
}

export interface TranslationExport {
  id: DatabaseId;
  name: string;
  format: 'json' | 'po' | 'xliff' | 'csv' | 'properties' | 'xml' | 'yaml';
  structure: 'flat' | 'nested' | 'namespaced';
  languages: LanguageCode[];
  namespaces: string[];
  includeContext: boolean;
  includePlaceholders: boolean;
  onlyApproved: boolean;
  minQualityScore?: number;
  customFilters?: {
    field: string;
    operator: string;
    value: unknown;
  }[];
  generatedAt: Date;
  fileUrl: string;
  fileSize: number;
  downloadCount: number;
  expiresAt: Date;
  createdBy: DatabaseId;
  createdAt: Date;
}

export interface TranslationImport {
  id: DatabaseId;
  name: string;
  format: TranslationExport['format'];
  fileUrl: string;
  fileSize: number;
  mapping: {
    keyField: string;
    valueField: string;
    languageField?: string;
    contextField?: string;
    pluralFields?: Record<string, string>;
  };
  options: {
    overwriteExisting: boolean;
    createMissingKeys: boolean;
    autoApprove: boolean;
    requireReview: boolean;
    targetLanguage?: LanguageCode;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    totalRecords: number;
    processedRecords: number;
    createdTranslations: number;
    updatedTranslations: number;
    errors: number;
  };
  results?: {
    successful: number;
    failed: number;
    skipped: number;
    errors: {
      row: number;
      field: string;
      error: string;
    }[];
  };
  startedAt?: Date;
  completedAt?: Date;
  createdBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export type I18nFunction = (key: string, options?: {
  lng?: LanguageCode;
  ns?: string;
  defaultValue?: string;
  interpolation?: Record<string, unknown>;
  count?: number;
}) => string;

// Additional types needed by config/i18n.ts
export interface SupportedLanguage {
  code: LanguageCode;
  name: string;
  nativeName: string;
  rtl: boolean;
  enabled: boolean;
}

export interface TranslationNamespace {
  key: string;
  description: string;
}

export interface I18nConfig {
  defaultLanguage: LanguageCode;
  fallbackLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  enabledLanguages: LanguageCode[];
  namespaces: string[];
  autoDetectLanguage: boolean;
  cacheTranslations: boolean;
  loadPath: string;
  missingKeyHandler: 'log' | 'ignore';
  interpolation: {
    escapeValue: boolean;
    formatSeparator: string;
  };
}