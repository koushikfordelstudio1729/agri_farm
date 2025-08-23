"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const auth_1 = require("@/middleware/auth");
const authController_1 = __importDefault(require("@/controllers/authController"));
const errors_1 = require("@/utils/errors");
const auth_types_1 = require("./auth.types");
const router = (0, express_1.Router)();
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = {};
        errors.array().forEach(error => {
            const field = error.type === 'field' ? error.path : 'unknown';
            if (!validationErrors[field]) {
                validationErrors[field] = [];
            }
            validationErrors[field].push(error.msg);
        });
        throw new errors_1.ValidationError('Validation failed', validationErrors);
    }
    next();
};
// Rate limiting configurations
const authRateLimits = {
    register: (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 registration attempts per 15 minutes
        message: {
            success: false,
            message: 'Too many registration attempts, please try again later.',
            error: 'RateLimitExceeded',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),
    login: (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 login attempts per 15 minutes
        message: {
            success: false,
            message: 'Too many login attempts, please try again later.',
            error: 'RateLimitExceeded',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),
    passwordReset: (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset attempts per hour
        message: {
            success: false,
            message: 'Too many password reset attempts, please try again later.',
            error: 'RateLimitExceeded',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),
    emailResend: (0, express_rate_limit_1.default)({
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 3, // 3 email resend attempts per 10 minutes
        message: {
            success: false,
            message: 'Too many email resend attempts, please try again later.',
            error: 'RateLimitExceeded',
        },
        standardHeaders: true,
        legacyHeaders: false,
    }),
};
// Validation rules
const registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    (0, express_validator_1.body)('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('First name can only contain letters and spaces'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Last name can only contain letters and spaces'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('countryCode')
        .optional()
        .matches(/^\+\d{1,4}$/)
        .withMessage('Please provide a valid country code (e.g., +1, +91)'),
    (0, express_validator_1.body)('preferredLanguage')
        .optional()
        .isIn(['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'])
        .withMessage('Please provide a valid language code'),
    (0, express_validator_1.body)('acceptTerms')
        .isBoolean()
        .custom(value => value === true)
        .withMessage('You must accept the terms and conditions'),
    (0, express_validator_1.body)('acceptPrivacy')
        .isBoolean()
        .custom(value => value === true)
        .withMessage('You must accept the privacy policy'),
    (0, express_validator_1.body)('marketingConsent')
        .optional()
        .isBoolean()
        .withMessage('Marketing consent must be a boolean value'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
    (0, express_validator_1.body)('rememberMe')
        .optional()
        .isBoolean()
        .withMessage('Remember me must be a boolean value'),
];
const phoneAuthValidation = [
    (0, express_validator_1.body)('phone')
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('countryCode')
        .matches(/^\+\d{1,4}$/)
        .withMessage('Please provide a valid country code'),
];
const otpValidation = [
    (0, express_validator_1.body)('phone')
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('countryCode')
        .matches(/^\+\d{1,4}$/)
        .withMessage('Please provide a valid country code'),
    (0, express_validator_1.body)('otp')
        .isLength({ min: 4, max: 8 })
        .isNumeric()
        .withMessage('Please provide a valid OTP'),
    (0, express_validator_1.body)('verificationType')
        .isIn(['registration', 'login', 'phone_update', 'password_reset'])
        .withMessage('Please provide a valid verification type'),
];
const refreshTokenValidation = [
    (0, express_validator_1.body)('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required'),
];
const passwordResetValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];
const passwordResetConfirmValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];
const changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];
const emailVerificationValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Verification token is required'),
];
const resendVerificationValidation = [
    (0, express_validator_1.body)('type')
        .isIn(['email', 'phone'])
        .withMessage('Type must be either email or phone'),
    (0, express_validator_1.body)('email')
        .if((0, express_validator_1.body)('type').equals('email'))
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('phone')
        .if((0, express_validator_1.body)('type').equals('phone'))
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('countryCode')
        .if((0, express_validator_1.body)('type').equals('phone'))
        .matches(/^\+\d{1,4}$/)
        .withMessage('Please provide a valid country code'),
];
// Routes
// Public routes
router.post(auth_types_1.AUTH_ROUTES.REGISTER, authRateLimits.register, registerValidation, handleValidationErrors, authController_1.default.register);
router.post(auth_types_1.AUTH_ROUTES.LOGIN, authRateLimits.login, loginValidation, handleValidationErrors, authController_1.default.login);
router.post(auth_types_1.AUTH_ROUTES.REFRESH, refreshTokenValidation, handleValidationErrors, authController_1.default.refreshToken);
router.post(auth_types_1.AUTH_ROUTES.PASSWORD_RESET, authRateLimits.passwordReset, passwordResetValidation, handleValidationErrors, authController_1.default.requestPasswordReset);
router.post(auth_types_1.AUTH_ROUTES.PASSWORD_RESET_CONFIRM, passwordResetConfirmValidation, handleValidationErrors, authController_1.default.confirmPasswordReset);
router.post(auth_types_1.AUTH_ROUTES.EMAIL_VERIFY, emailVerificationValidation, handleValidationErrors, authController_1.default.verifyEmail);
router.post(auth_types_1.AUTH_ROUTES.EMAIL_RESEND, authRateLimits.emailResend, resendVerificationValidation, handleValidationErrors, authController_1.default.resendVerification);
// Protected routes
router.post(auth_types_1.AUTH_ROUTES.LOGOUT, auth_1.authenticate, authController_1.default.logout);
router.post(auth_types_1.AUTH_ROUTES.PASSWORD_CHANGE, auth_1.authenticate, changePasswordValidation, handleValidationErrors, authController_1.default.changePassword);
// Phone authentication routes (if implemented)
// router.post(
//   AUTH_ROUTES.PHONE_AUTH,
//   authRateLimit(5),
//   phoneAuthValidation,
//   handleValidationErrors,
//   authController.initiatePhoneAuth
// );
// router.post(
//   AUTH_ROUTES.VERIFY_OTP,
//   authRateLimit(10),
//   otpValidation,
//   handleValidationErrors,
//   authController.verifyOtp
// );
// Social auth routes (if implemented)
// router.get(AUTH_ROUTES.GOOGLE_AUTH, passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get(AUTH_ROUTES.GOOGLE_CALLBACK, passport.authenticate('google'), authController.socialAuthCallback);
// Get current user info
router.get(auth_types_1.AUTH_ROUTES.ME, auth_1.authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'User information retrieved successfully',
        data: {
            user: req.user,
        },
    });
});
// Get user sessions (if implemented)
// router.get(
//   AUTH_ROUTES.SESSIONS,
//   authenticate,
//   authController.getUserSessions
// );
exports.default = router;
//# sourceMappingURL=auth.js.map