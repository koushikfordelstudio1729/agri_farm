import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { authenticate, authRateLimit } from '@/middleware/auth';
import authController from '@/controllers/authController';
import { ValidationError } from '@/utils/errors';
import { AUTH_ROUTES } from './auth.types';
import passport from 'passport';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors: Record<string, string[]> = {};
    errors.array().forEach(error => {
      const field = error.type === 'field' ? (error as any).path : 'unknown';
      if (!validationErrors[field]) {
        validationErrors[field] = [];
      }
      validationErrors[field].push(error.msg);
    });
    
    throw new ValidationError('Validation failed', validationErrors);
  }
  next();
};

// Rate limiting configurations
const authRateLimits = {
  register: rateLimit({
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
  
  login: rateLimit({
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
  
  passwordReset: rateLimit({
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
  
  emailResend: rateLimit({
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
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('countryCode')
    .optional()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Please provide a valid country code (e.g., +1, +91)'),
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'es', 'fr', 'pt', 'hi', 'bn', 'id', 'vi'])
    .withMessage('Please provide a valid language code'),
  body('acceptTerms')
    .isBoolean()
    .custom(value => value === true)
    .withMessage('You must accept the terms and conditions'),
  body('acceptPrivacy')
    .isBoolean()
    .custom(value => value === true)
    .withMessage('You must accept the privacy policy'),
  body('marketingConsent')
    .optional()
    .isBoolean()
    .withMessage('Marketing consent must be a boolean value'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value'),
];

const phoneAuthValidation = [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('countryCode')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Please provide a valid country code'),
];

const otpValidation = [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('countryCode')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Please provide a valid country code'),
  body('otp')
    .isLength({ min: 4, max: 8 })
    .isNumeric()
    .withMessage('Please provide a valid OTP'),
  body('verificationType')
    .isIn(['registration', 'login', 'phone_update', 'password_reset'])
    .withMessage('Please provide a valid verification type'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

const passwordResetConfirmValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

const emailVerificationValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
];

const resendVerificationValidation = [
  body('type')
    .isIn(['email', 'phone'])
    .withMessage('Type must be either email or phone'),
  body('email')
    .if(body('type').equals('email'))
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .if(body('type').equals('phone'))
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('countryCode')
    .if(body('type').equals('phone'))
    .matches(/^\+\d{1,4}$/)
    .withMessage('Please provide a valid country code'),
];

// Routes

// Public routes
router.post(
  AUTH_ROUTES.REGISTER,
  authRateLimits.register,
  registerValidation,
  handleValidationErrors,
  authController.register
);

router.post(
  AUTH_ROUTES.LOGIN,
  authRateLimits.login,
  loginValidation,
  handleValidationErrors,
  authController.login
);

router.post(
  AUTH_ROUTES.REFRESH,
  refreshTokenValidation,
  handleValidationErrors,
  authController.refreshToken
);

router.post(
  AUTH_ROUTES.PASSWORD_RESET,
  authRateLimits.passwordReset,
  passwordResetValidation,
  handleValidationErrors,
  authController.requestPasswordReset
);

router.post(
  AUTH_ROUTES.PASSWORD_RESET_CONFIRM,
  passwordResetConfirmValidation,
  handleValidationErrors,
  authController.confirmPasswordReset
);

router.post(
  AUTH_ROUTES.EMAIL_VERIFY,
  emailVerificationValidation,
  handleValidationErrors,
  authController.verifyEmail
);

router.post(
  AUTH_ROUTES.EMAIL_RESEND,
  authRateLimits.emailResend,
  resendVerificationValidation,
  handleValidationErrors,
  authController.resendVerification
);

// Protected routes
router.post(
  AUTH_ROUTES.LOGOUT,
  authenticate,
  authController.logout
);

router.post(
  AUTH_ROUTES.PASSWORD_CHANGE,
  authenticate,
  changePasswordValidation,
  handleValidationErrors,
  authController.changePassword
);

// OTP verification routes
const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per 5 minutes
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later.',
    error: 'RateLimitExceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 verification attempts per 10 minutes
  message: {
    success: false,
    message: 'Too many verification attempts, please try again later.',
    error: 'RateLimitExceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email OTP routes
router.post(
  '/otp/email/send',
  otpRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ],
  handleValidationErrors,
  authController.sendEmailOtp
);

router.post(
  '/otp/email/verify',
  otpVerifyRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('otp')
      .isLength({ min: 4, max: 8 })
      .isNumeric()
      .withMessage('Please provide a valid OTP'),
  ],
  handleValidationErrors,
  authController.verifyEmailOtp
);

// Phone OTP routes
router.post(
  '/otp/phone/send',
  otpRateLimit,
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('countryCode')
      .optional()
      .matches(/^\+\d{1,4}$/)
      .withMessage('Please provide a valid country code'),
  ],
  handleValidationErrors,
  authController.sendPhoneOtp
);

router.post(
  '/otp/phone/verify',
  otpVerifyRateLimit,
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('countryCode')
      .optional()
      .matches(/^\+\d{1,4}$/)
      .withMessage('Please provide a valid country code'),
    body('otp')
      .isLength({ min: 4, max: 8 })
      .isNumeric()
      .withMessage('Please provide a valid OTP'),
  ],
  handleValidationErrors,
  authController.verifyPhoneOtp
);

// Phone-based login routes
router.post(
  '/login/phone/request',
  otpRateLimit,
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('countryCode')
      .optional()
      .matches(/^\+\d{1,4}$/)
      .withMessage('Please provide a valid country code'),
  ],
  handleValidationErrors,
  authController.requestPhoneLoginOtp
);

router.post(
  '/login/phone/verify',
  otpVerifyRateLimit,
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('countryCode')
      .optional()
      .matches(/^\+\d{1,4}$/)
      .withMessage('Please provide a valid country code'),
    body('otp')
      .isLength({ min: 4, max: 8 })
      .isNumeric()
      .withMessage('Please provide a valid OTP'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean value'),
  ],
  handleValidationErrors,
  authController.loginWithPhone
);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login?error=oauth_failed`,
    session: false 
  }),
  authController.googleAuthCallback
);

// Mobile Google Sign-In endpoint
router.post(
  '/google/mobile',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Google ID token is required'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean value'),
  ],
  handleValidationErrors,
  authController.mobileGoogleSignIn
);

// Get current user info
router.get(
  AUTH_ROUTES.ME,
  authenticate,
  (req: any, res: any) => {
    res.json({
      success: true,
      message: 'User information retrieved successfully',
      data: {
        user: req.user,
      },
    });
  }
);

// Get user sessions (if implemented)
// router.get(
//   AUTH_ROUTES.SESSIONS,
//   authenticate,
//   authController.getUserSessions
// );

export default router;