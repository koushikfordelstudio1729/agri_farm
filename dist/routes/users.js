"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = __importDefault(require("@/controllers/userController"));
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const upload_1 = __importDefault(require("@/middleware/upload"));
const rateLimit_1 = require("@/middleware/rateLimit");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().trim().min(1).max(50),
    lastName: joi_1.default.string().trim().min(1).max(50),
    phone: joi_1.default.string().pattern(/^\+?[\d\s-()]+$/),
    countryCode: joi_1.default.string().pattern(/^\+\d{1,4}$/),
    language: joi_1.default.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
    timezone: joi_1.default.string(),
    farmingExperience: joi_1.default.number().min(0).max(100),
    farmSize: joi_1.default.number().min(0),
    primaryCrops: joi_1.default.array().items(joi_1.default.string()),
    farmingType: joi_1.default.string().valid('organic', 'conventional', 'sustainable', 'mixed'),
    location: joi_1.default.object({
        address: joi_1.default.string(),
        city: joi_1.default.string(),
        state: joi_1.default.string(),
        country: joi_1.default.string(),
        coordinates: joi_1.default.object({
            latitude: joi_1.default.number().min(-90).max(90).required(),
            longitude: joi_1.default.number().min(-180).max(180).required(),
        }),
    }),
    units: joi_1.default.object({
        temperature: joi_1.default.string().valid('celsius', 'fahrenheit'),
        area: joi_1.default.string().valid('hectares', 'acres'),
        weight: joi_1.default.string().valid('kg', 'pounds'),
    }),
});
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(8).max(128).required(),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref('newPassword')).required(),
});
const updatePreferencesSchema = joi_1.default.object({
    notifications: joi_1.default.object({
        email: joi_1.default.boolean(),
        push: joi_1.default.boolean(),
        sms: joi_1.default.boolean(),
        digestFrequency: joi_1.default.string().valid('immediate', 'daily', 'weekly', 'never'),
        diagnosisResults: joi_1.default.boolean(),
        weatherAlerts: joi_1.default.boolean(),
        priceAlerts: joi_1.default.boolean(),
        communityUpdates: joi_1.default.boolean(),
        expertReplies: joi_1.default.boolean(),
        marketingEmails: joi_1.default.boolean(),
    }),
    privacy: joi_1.default.object({
        showProfile: joi_1.default.boolean(),
        showLocation: joi_1.default.boolean(),
        showContactInfo: joi_1.default.boolean(),
        allowDirectMessages: joi_1.default.boolean(),
    }),
    display: joi_1.default.object({
        theme: joi_1.default.string().valid('light', 'dark', 'auto'),
        language: joi_1.default.string().valid('en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'),
        currency: joi_1.default.string(),
        units: joi_1.default.string().valid('metric', 'imperial'),
        timezone: joi_1.default.string(),
    }),
    ai: joi_1.default.object({
        saveImages: joi_1.default.boolean(),
        shareAnonymous: joi_1.default.boolean(),
        improveModel: joi_1.default.boolean(),
    }),
});
const searchUsersSchema = joi_1.default.object({
    q: joi_1.default.string().min(2).max(100),
    role: joi_1.default.string().valid('user', 'expert', 'admin', 'moderator'),
    verified: joi_1.default.string().valid('true', 'false'),
    country: joi_1.default.string(),
    state: joi_1.default.string(),
    city: joi_1.default.string(),
    farmingType: joi_1.default.string().valid('organic', 'conventional', 'sustainable', 'mixed'),
    subscriptionTier: joi_1.default.string().valid('free', 'premium', 'expert'),
    dateFrom: joi_1.default.date().iso(),
    dateTo: joi_1.default.date().iso().min(joi_1.default.ref('dateFrom')),
    page: joi_1.default.number().min(1).default(1),
    limit: joi_1.default.number().min(1).max(100).default(10),
    sortBy: joi_1.default.string().valid('createdAt', 'firstName', 'lastName', 'reputation', 'followersCount'),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
const reportUserSchema = joi_1.default.object({
    reason: joi_1.default.string().valid('spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other').required(),
    description: joi_1.default.string().max(500),
    evidence: joi_1.default.array().items(joi_1.default.string().uri()),
});
const deleteAccountSchema = joi_1.default.object({
    password: joi_1.default.string().required(),
    reason: joi_1.default.string().valid('not_useful', 'too_expensive', 'privacy_concerns', 'switching_service', 'other'),
    feedback: joi_1.default.string().max(1000),
});
const exportDataSchema = joi_1.default.object({
    dataTypes: joi_1.default.array().items(joi_1.default.string().valid('profile', 'diagnoses', 'posts', 'messages', 'preferences')).min(1).required(),
    format: joi_1.default.string().valid('json', 'csv', 'pdf').default('json'),
});
// Middleware setup
const imageUpload = upload_1.default.image({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
});
// Rate limiting for different endpoints
const generalRateLimit = (0, rateLimit_1.rateLimitMiddleware)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
});
const uploadRateLimit = (0, rateLimit_1.rateLimitMiddleware)({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
});
const searchRateLimit = (0, rateLimit_1.rateLimitMiddleware)({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
});
// Routes
// Profile management
router.get('/profile', auth_1.authenticate, userController_1.default.getProfile);
router.put('/profile', auth_1.authenticate, generalRateLimit, validation_1.ValidationMiddleware.joi(updateProfileSchema), userController_1.default.updateProfile);
router.post('/profile/image', auth_1.authenticate, uploadRateLimit, imageUpload.single('image'), upload_1.default.validateFiles({ required: true, maxFiles: 1 }), userController_1.default.uploadProfileImage);
// Account security
router.put('/password', auth_1.authenticate, generalRateLimit, validation_1.ValidationMiddleware.joi(changePasswordSchema), userController_1.default.changePassword);
// Preferences
router.put('/preferences', auth_1.authenticate, generalRateLimit, validation_1.ValidationMiddleware.joi(updatePreferencesSchema), userController_1.default.updatePreferences);
// User discovery and search
router.get('/search', searchRateLimit, validation_1.ValidationMiddleware.joi(searchUsersSchema, { source: 'query' }), userController_1.default.searchUsers);
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)(['admin', 'moderator']), userController_1.default.getUserStats);
// Individual user operations
router.get('/:userId', validation_1.validateId, userController_1.default.getUser);
// Social features
router.post('/:userId/follow', auth_1.authenticate, validation_1.validateId, generalRateLimit, userController_1.default.followUser);
router.delete('/:userId/follow', auth_1.authenticate, validation_1.validateId, generalRateLimit, userController_1.default.unfollowUser);
router.get('/:userId/followers', validation_1.validateId, validation_1.validatePagination, userController_1.default.getFollowers);
router.get('/:userId/following', validation_1.validateId, validation_1.validatePagination, userController_1.default.getFollowing);
// Moderation
router.post('/:userId/block', auth_1.authenticate, validation_1.validateId, generalRateLimit, userController_1.default.blockUser);
router.delete('/:userId/block', auth_1.authenticate, validation_1.validateId, generalRateLimit, userController_1.default.unblockUser);
router.post('/:userId/report', auth_1.authenticate, validation_1.validateId, validation_1.ValidationMiddleware.joi(reportUserSchema), generalRateLimit, userController_1.default.reportUser);
// Account management
router.post('/export', auth_1.authenticate, validation_1.ValidationMiddleware.joi(exportDataSchema), generalRateLimit, userController_1.default.exportData);
router.delete('/account', auth_1.authenticate, validation_1.ValidationMiddleware.joi(deleteAccountSchema), (0, rateLimit_1.rateLimitMiddleware)({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 1, // Only one deletion attempt per day
}), userController_1.default.deleteAccount);
exports.default = router;
//# sourceMappingURL=users.js.map