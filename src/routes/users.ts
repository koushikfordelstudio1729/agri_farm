import { Router } from 'express';
import userController from '@/controllers/userController';
import { authenticate, authorize } from '@/middleware/auth';
import { ValidationMiddleware, validateId, validatePagination } from '@/middleware/validation';
import UploadMiddleware from '@/middleware/upload';
import { rateLimit } from '@/middleware/rateLimit';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
  countryCode: Joi.string().pattern(/^\+\d{1,4}$/),
  language: Joi.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
  timezone: Joi.string(),
  farmingExperience: Joi.number().min(0).max(100),
  farmSize: Joi.number().min(0),
  primaryCrops: Joi.array().items(Joi.string()),
  farmingType: Joi.string().valid('organic', 'conventional', 'sustainable', 'mixed'),
  location: Joi.object({
    address: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }),
  }),
  units: Joi.object({
    temperature: Joi.string().valid('celsius', 'fahrenheit'),
    area: Joi.string().valid('hectares', 'acres'),
    weight: Joi.string().valid('kg', 'pounds'),
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const updatePreferencesSchema = Joi.object({
  notifications: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    sms: Joi.boolean(),
    digestFrequency: Joi.string().valid('immediate', 'daily', 'weekly', 'never'),
    diagnosisResults: Joi.boolean(),
    weatherAlerts: Joi.boolean(),
    priceAlerts: Joi.boolean(),
    communityUpdates: Joi.boolean(),
    expertReplies: Joi.boolean(),
    marketingEmails: Joi.boolean(),
  }),
  privacy: Joi.object({
    showProfile: Joi.boolean(),
    showLocation: Joi.boolean(),
    showContactInfo: Joi.boolean(),
    allowDirectMessages: Joi.boolean(),
  }),
  display: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    language: Joi.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
    currency: Joi.string(),
    units: Joi.string().valid('metric', 'imperial'),
    timezone: Joi.string(),
  }),
  ai: Joi.object({
    saveImages: Joi.boolean(),
    shareAnonymous: Joi.boolean(),
    improveModel: Joi.boolean(),
  }),
});

const searchUsersSchema = Joi.object({
  q: Joi.string().min(2).max(100),
  role: Joi.string().valid('user', 'expert', 'admin', 'moderator'),
  verified: Joi.string().valid('true', 'false'),
  country: Joi.string(),
  state: Joi.string(),
  city: Joi.string(),
  farmingType: Joi.string().valid('organic', 'conventional', 'sustainable', 'mixed'),
  subscriptionTier: Joi.string().valid('free', 'premium', 'expert'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'firstName', 'lastName', 'reputation', 'followersCount'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const reportUserSchema = Joi.object({
  reason: Joi.string().valid('spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other').required(),
  description: Joi.string().max(500),
  evidence: Joi.array().items(Joi.string().uri()),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
  reason: Joi.string().valid('not_useful', 'too_expensive', 'privacy_concerns', 'switching_service', 'other'),
  feedback: Joi.string().max(1000),
});

const exportDataSchema = Joi.object({
  dataTypes: Joi.array().items(
    Joi.string().valid('profile', 'diagnoses', 'posts', 'messages', 'preferences')
  ).min(1).required(),
  format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
});

// Middleware setup
const imageUpload = UploadMiddleware.image({
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 1,
});

// Rate limiting for different endpoints
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 30,
});

// Routes

// Profile management
router.get('/profile', authenticate, userController.getProfile);

router.put(
  '/profile',
  authenticate,
  generalRateLimit,
  ValidationMiddleware.joi(updateProfileSchema),
  userController.updateProfile
);

router.post(
  '/profile/image',
  authenticate,
  uploadRateLimit,
  imageUpload.single('image'),
  UploadMiddleware.validateFiles({ required: true, maxFiles: 1 }),
  userController.uploadProfileImage
);

// Account security
router.put(
  '/password',
  authenticate,
  generalRateLimit,
  ValidationMiddleware.joi(changePasswordSchema),
  userController.changePassword
);

// Preferences
router.put(
  '/preferences',
  authenticate,
  generalRateLimit,
  ValidationMiddleware.joi(updatePreferencesSchema),
  userController.updatePreferences
);

// User discovery and search
router.get(
  '/search',
  searchRateLimit,
  ValidationMiddleware.joi(searchUsersSchema, { source: 'query' }),
  userController.searchUsers
);

router.get('/stats', 
  authenticate, 
  authorize(['admin', 'moderator']), 
  userController.getUserStats
);

// Individual user operations
router.get('/:userId', validateId, userController.getUser);

// Social features
router.post(
  '/:userId/follow',
  authenticate,
  validateId,
  generalRateLimit,
  userController.followUser
);

router.delete(
  '/:userId/follow',
  authenticate,
  validateId,
  generalRateLimit,
  userController.unfollowUser
);

router.get(
  '/:userId/followers',
  validateId,
  validatePagination,
  userController.getFollowers
);

router.get(
  '/:userId/following',
  validateId,
  validatePagination,
  userController.getFollowing
);

// Moderation
router.post(
  '/:userId/block',
  authenticate,
  validateId,
  generalRateLimit,
  userController.blockUser
);

router.delete(
  '/:userId/block',
  authenticate,
  validateId,
  generalRateLimit,
  userController.unblockUser
);

router.post(
  '/:userId/report',
  authenticate,
  validateId,
  ValidationMiddleware.joi(reportUserSchema),
  generalRateLimit,
  userController.reportUser
);

// Account management
router.post(
  '/export',
  authenticate,
  ValidationMiddleware.joi(exportDataSchema),
  generalRateLimit,
  userController.exportData
);

router.delete(
  '/account',
  authenticate,
  ValidationMiddleware.joi(deleteAccountSchema),
  rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 1, // Only one deletion attempt per day
  }),
  userController.deleteAccount
);

export default router;