import express from 'express';
import languageController from '@/controllers/languageController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for i18n operations
const i18nRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 requests per window per user
  message: {
    error: 'Too many i18n requests. Please try again later.',
    retryAfter: 5 * 60,
  },
});

router.use(i18nRateLimit);

// Public routes (no authentication required)
router.get('/public/translations/:language', 
  validateRequest({
    params: { language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi' },
    query: {
      namespace: 'string',
      keys: 'array',
      'keys.*': 'string',
    },
  }),
  languageController.getPublicTranslations
);

router.get('/public/languages', languageController.getAvailableLanguages);

// Protected routes (authentication required)
router.use(authenticate);

// Get translations for user's preferred language
router.get('/translations', 
  validateRequest({
    query: {
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
      namespace: 'string',
      keys: 'array',
      'keys.*': 'string',
    },
  }),
  languageController.getUserTranslations
);

// Get specific translation by key
router.get('/translations/:language/:key', 
  validateRequest({
    params: {
      language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      key: 'required|string',
    },
  }),
  languageController.getTranslationByKey
);

// Set user's preferred language
router.put('/preferences', 
  validateRequest({
    body: {
      language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      region: 'string',
      timezone: 'string',
      dateFormat: 'string|in:DD/MM/YYYY,MM/DD/YYYY,YYYY-MM-DD',
      timeFormat: 'string|in:12,24',
      currency: 'string|length:3', // ISO currency code
    },
  }),
  languageController.setUserLanguagePreferences
);

// Get user's language preferences
router.get('/preferences', languageController.getUserLanguagePreferences);

// Get localized content
router.get('/content/:contentType', 
  validateRequest({
    params: { contentType: 'required|string|in:crops,diseases,treatments,general' },
    query: {
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
      search: 'string',
      category: 'string',
    },
  }),
  languageController.getLocalizedContent
);

// Submit translation feedback
router.post('/feedback', 
  validateRequest({
    body: {
      key: 'required|string',
      language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      currentTranslation: 'required|string',
      suggestedTranslation: 'string',
      feedbackType: 'required|string|in:incorrect,unclear,missing,improvement',
      description: 'string|max:1000',
    },
  }),
  languageController.submitTranslationFeedback
);

// Get translation completeness for language
router.get('/completeness/:language', 
  validateRequest({
    params: { language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi' },
  }),
  languageController.getTranslationCompleteness
);

// Translator routes (for authorized translators)
router.use('/translate', authorize(['translator', 'admin', 'super_admin']));

// Get pending translations
router.get('/translate/pending', 
  validateRequest({
    query: {
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
      namespace: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  languageController.getPendingTranslations
);

// Submit translation
router.post('/translate/:translationId', 
  validateRequest({
    params: { translationId: 'required|string|mongoId' },
    body: {
      translatedText: 'required|string|max:5000',
      notes: 'string|max:500',
      confidence: 'number|between:0,1',
    },
  }),
  languageController.submitTranslation
);

// Get translator's work statistics
router.get('/translate/statistics', 
  validateRequest({
    query: {
      period: 'string|in:week,month,quarter,year',
    },
  }),
  languageController.getTranslatorStatistics
);

// Admin routes
router.use('/admin', authorize(['admin', 'super_admin']));

// Get all languages with translation status
router.get('/admin/languages', 
  validateRequest({
    query: {
      includeStats: 'boolean',
    },
  }),
  languageController.getAllLanguagesWithStatus
);

// Add new language
router.post('/admin/languages', 
  validateRequest({
    body: {
      code: 'required|string|length:2',
      name: 'required|string|min:2|max:50',
      nativeName: 'required|string|min:2|max:50',
      isRTL: 'boolean',
      isActive: 'boolean',
      fallbackLanguage: 'string|length:2',
    },
  }),
  languageController.addLanguage
);

// Update language settings
router.put('/admin/languages/:languageCode', 
  validateRequest({
    params: { languageCode: 'required|string|length:2' },
    body: {
      name: 'string|min:2|max:50',
      nativeName: 'string|min:2|max:50',
      isRTL: 'boolean',
      isActive: 'boolean',
      fallbackLanguage: 'string|length:2',
    },
  }),
  languageController.updateLanguage
);

// Delete language
router.delete('/admin/languages/:languageCode', 
  validateRequest({
    params: { languageCode: 'required|string|length:2' },
  }),
  languageController.deleteLanguage
);

// Get all translation keys
router.get('/admin/keys', 
  validateRequest({
    query: {
      namespace: 'string',
      search: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
      sortBy: 'string|in:key,namespace,lastModified',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  languageController.getAllTranslationKeys
);

// Add new translation key
router.post('/admin/keys', 
  validateRequest({
    body: {
      key: 'required|string|min:1|max:200',
      namespace: 'required|string',
      description: 'string|max:1000',
      tags: 'array',
      'tags.*': 'string',
      context: 'string|max:500',
      pluralizable: 'boolean',
      variables: 'array',
      'variables.*': 'string',
    },
  }),
  languageController.addTranslationKey
);

// Update translation key
router.put('/admin/keys/:keyId', 
  validateRequest({
    params: { keyId: 'required|string|mongoId' },
  }),
  languageController.updateTranslationKey
);

// Delete translation key
router.delete('/admin/keys/:keyId', 
  validateRequest({
    params: { keyId: 'required|string|mongoId' },
  }),
  languageController.deleteTranslationKey
);

// Get translations for specific key across all languages
router.get('/admin/keys/:keyId/translations', 
  validateRequest({
    params: { keyId: 'required|string|mongoId' },
  }),
  languageController.getKeyTranslations
);

// Update translation for specific key and language
router.put('/admin/translations/:translationId', 
  validateRequest({
    params: { translationId: 'required|string|mongoId' },
    body: {
      translatedText: 'required|string|max:5000',
      isApproved: 'boolean',
      notes: 'string|max:1000',
    },
  }),
  languageController.updateTranslation
);

// Import translations from file
router.post('/admin/import', 
  validateRequest({
    body: {
      language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      namespace: 'string',
      translations: 'required|object',
      overwrite: 'boolean',
    },
  }),
  languageController.importTranslations
);

// Export translations
router.get('/admin/export/:language', 
  validateRequest({
    params: { language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi' },
    query: {
      format: 'string|in:json,csv,xlsx,po',
      namespace: 'string',
    },
  }),
  languageController.exportTranslations
);

// Get translation analytics
router.get('/admin/analytics', 
  validateRequest({
    query: {
      period: 'string|in:week,month,quarter,year',
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
    },
  }),
  languageController.getTranslationAnalytics
);

// Get translator management data
router.get('/admin/translators', 
  validateRequest({
    query: {
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
      active: 'boolean',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  languageController.getTranslators
);

// Assign translator to language
router.post('/admin/translators/assign', 
  validateRequest({
    body: {
      translatorId: 'required|string|mongoId',
      languages: 'required|array|min:1',
      'languages.*': 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      canReview: 'boolean',
    },
  }),
  languageController.assignTranslator
);

// Remove translator from language
router.delete('/admin/translators/:translatorId/:language', 
  validateRequest({
    params: {
      translatorId: 'required|string|mongoId',
      language: 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
    },
  }),
  languageController.removeTranslator
);

// Review translation feedback
router.get('/admin/feedback', 
  validateRequest({
    query: {
      status: 'string|in:pending,reviewed,implemented,rejected',
      language: 'string|in:en,es,fr,pt,hi,bn,id,vi',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  languageController.getTranslationFeedback
);

// Update feedback status
router.put('/admin/feedback/:feedbackId', 
  validateRequest({
    params: { feedbackId: 'required|string|mongoId' },
    body: {
      status: 'required|string|in:pending,reviewed,implemented,rejected',
      reviewNotes: 'string|max:1000',
    },
  }),
  languageController.updateFeedbackStatus
);

// Auto-translate missing keys
router.post('/admin/auto-translate', 
  validateRequest({
    body: {
      targetLanguages: 'required|array|min:1',
      'targetLanguages.*': 'required|string|in:en,es,fr,pt,hi,bn,id,vi',
      namespace: 'string',
      provider: 'string|in:google,azure,amazon',
    },
  }),
  languageController.autoTranslateMissingKeys
);

// Bulk operations
router.post('/admin/bulk/approve', languageController.bulkApproveTranslations);
router.post('/admin/bulk/reject', languageController.bulkRejectTranslations);
router.delete('/admin/bulk/cleanup', languageController.bulkCleanupTranslations);

// Translation service health
router.get('/admin/health', languageController.getTranslationServiceHealth);

export default router;