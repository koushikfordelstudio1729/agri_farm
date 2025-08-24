import { Request, Response } from 'express';
import { 
  GetTranslationsRequest,
  SetLanguagePreferencesRequest,
  LanguagePreferencesResponse,
  LocalizedContentRequest,
  TranslationFeedbackRequest,
  SubmitTranslationRequest,
  AddLanguageRequest,
  UpdateLanguageRequest,
  AddTranslationKeyRequest,
  UpdateTranslationKeyRequest,
  UpdateTranslationRequest,
  ImportTranslationsRequest,
  AssignTranslatorRequest
} from '@/controllers/languageController.types';

// Route parameter types
export interface LanguageParams {
  language: string;
}

export interface TranslationKeyParams {
  language: string;
  key: string;
}

export interface TranslationParams {
  translationId: string;
}

export interface KeyParams {
  keyId: string;
}

export interface LanguageCodeParams {
  languageCode: string;
}

export interface TranslatorParams {
  translatorId: string;
  language: string;
}

export interface FeedbackParams {
  feedbackId: string;
}

export interface ContentTypeParams {
  contentType: 'crops' | 'diseases' | 'treatments' | 'general';
}

// Query parameter types
export interface GetTranslationsQuery {
  language?: string;
  namespace?: string;
  keys?: string[];
}

export interface GetTranslationCompletenessQuery {
  includeStats?: string;
}

export interface GetLocalizedContentQuery {
  language?: string;
  search?: string;
  category?: string;
}

export interface GetPendingTranslationsQuery {
  language?: string;
  namespace?: string;
  page?: string;
  limit?: string;
}

export interface GetTranslatorStatsQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export interface GetAllLanguagesQuery {
  includeStats?: string;
}

export interface GetAllKeysQuery {
  namespace?: string;
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: 'key' | 'namespace' | 'lastModified';
  sortOrder?: 'asc' | 'desc';
}

export interface GetTranslationAnalyticsQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
  language?: string;
}

export interface GetTranslatorsQuery {
  language?: string;
  active?: string;
  page?: string;
  limit?: string;
}

export interface GetTranslationFeedbackQuery {
  status?: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  language?: string;
  page?: string;
  limit?: string;
}

export interface ExportTranslationsQuery {
  format?: 'json' | 'csv' | 'xlsx' | 'po';
  namespace?: string;
}

// Express request types
export interface GetPublicTranslationsRequestHandler extends Request<LanguageParams, any, {}, GetTranslationsQuery> {}
export interface GetAvailableLanguagesRequestHandler extends Request<{}, any> {}

export interface GetUserTranslationsRequestHandler extends Request<{}, any, {}, GetTranslationsQuery> {}
export interface GetTranslationByKeyRequestHandler extends Request<TranslationKeyParams, any> {}

export interface SetUserLanguagePreferencesRequestHandler extends Request<{}, LanguagePreferencesResponse, SetLanguagePreferencesRequest> {}
export interface GetUserLanguagePreferencesRequestHandler extends Request<{}, LanguagePreferencesResponse> {}

export interface GetLocalizedContentRequestHandler extends Request<ContentTypeParams, any, {}, GetLocalizedContentQuery> {}
export interface SubmitTranslationFeedbackRequestHandler extends Request<{}, any, TranslationFeedbackRequest> {}
export interface GetTranslationCompletenessRequestHandler extends Request<LanguageParams, any> {}

export interface GetPendingTranslationsRequestHandler extends Request<{}, any[], {}, GetPendingTranslationsQuery> {}
export interface SubmitTranslationRequestHandler extends Request<TranslationParams, any, SubmitTranslationRequest> {}
export interface GetTranslatorStatisticsRequestHandler extends Request<{}, any, {}, GetTranslatorStatsQuery> {}

export interface GetAllLanguagesWithStatusRequestHandler extends Request<{}, any[], {}, GetAllLanguagesQuery> {}
export interface AddLanguageRequestHandler extends Request<{}, any, AddLanguageRequest> {}
export interface UpdateLanguageRequestHandler extends Request<LanguageCodeParams, any, UpdateLanguageRequest> {}
export interface DeleteLanguageRequestHandler extends Request<LanguageCodeParams, any> {}

export interface GetAllTranslationKeysRequestHandler extends Request<{}, any[], {}, GetAllKeysQuery> {}
export interface AddTranslationKeyRequestHandler extends Request<{}, any, AddTranslationKeyRequest> {}
export interface UpdateTranslationKeyRequestHandler extends Request<KeyParams, any, UpdateTranslationKeyRequest> {}
export interface DeleteTranslationKeyRequestHandler extends Request<KeyParams, any> {}

export interface GetKeyTranslationsRequestHandler extends Request<KeyParams, any[]> {}
export interface UpdateTranslationRequestHandler extends Request<TranslationParams, any, UpdateTranslationRequest> {}

export interface ImportTranslationsRequestHandler extends Request<{}, any, ImportTranslationsRequest> {}
export interface ExportTranslationsRequestHandler extends Request<LanguageParams, any, {}, ExportTranslationsQuery> {}

export interface GetTranslationAnalyticsRequestHandler extends Request<{}, any, {}, GetTranslationAnalyticsQuery> {}

export interface GetTranslatorsRequestHandler extends Request<{}, any[], {}, GetTranslatorsQuery> {}
export interface AssignTranslatorRequestHandler extends Request<{}, any, AssignTranslatorRequest> {}
export interface RemoveTranslatorRequestHandler extends Request<TranslatorParams, any> {}

export interface GetTranslationFeedbackRequestHandler extends Request<{}, any[], {}, GetTranslationFeedbackQuery> {}
export interface UpdateFeedbackStatusRequestHandler extends Request<FeedbackParams, any, { status: string; reviewNotes?: string }> {}

export interface AutoTranslateMissingKeysRequestHandler extends Request<{}, any, { targetLanguages: string[]; namespace?: string; provider?: string }> {}
export interface BulkApproveTranslationsRequestHandler extends Request<{}, any, { translationIds: string[] }> {}
export interface BulkRejectTranslationsRequestHandler extends Request<{}, any, { translationIds: string[]; reason?: string }> {}
export interface BulkCleanupTranslationsRequestHandler extends Request<{}, any, { languages?: string[]; olderThanDays?: number }> {}

// Response types with Express
export interface TranslationResponseHandler extends Response<any> {}
export interface TranslationsListResponseHandler extends Response<any[]> {}
export interface LanguagePreferencesResponseHandler extends Response<LanguagePreferencesResponse> {}
export interface TranslationActionResponseHandler extends Response<any> {}