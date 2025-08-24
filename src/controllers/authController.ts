import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NextFunction } from 'express';
import { User } from '@/models/User';
import logger from '@/utils/logger';
import { OtpService } from '@/services/otpService';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  createErrorContext,
  ERROR_MESSAGES,
} from '@/utils/errors';
import {
  RegisterController,
  LoginController,
  PhoneAuthController,
  VerifyOtpController,
  RefreshTokenController,
  LogoutController,
  PasswordResetEmailController,
  PasswordResetConfirmController,
  ChangePasswordController,
  EmailVerificationController,
  ResendVerificationController,
} from './authController.types';
import { AuthTokens, AuthTokenPayload } from '@/types';

// Services
const otpService = new OtpService();

// JWT Helper functions
const generateTokens = (userId: string, email: string, role: string): AuthTokens => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  const payload: AuthTokenPayload = {
    userId,
    email,
    role: role as any,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  const accessToken = (jwt.sign as any)(
    payload,
    jwtSecret
  );

  const tokenId = crypto.randomBytes(16).toString('hex');
  const refreshToken = (jwt.sign as any)(
    { 
      userId,
      tokenId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    },
    refreshSecret
  );

  return {
    accessToken,
    refreshToken,
    tokenId,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
    refreshExpiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    tokenType: 'Bearer',
  };
};

// Smart refresh token management with device/session tracking
const manageRefreshTokenAndSetCookies = async (
  user: any,
  req: any,
  res: any
): Promise<any> => {
  const currentTime = new Date();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || 'unknown';
  
  // Initialize refresh tokens array if it doesn't exist
  user.refreshTokens = user.refreshTokens || [];
  
  // Clean up expired tokens first
  user.refreshTokens = user.refreshTokens.filter((tokenData: any) => 
    new Date(tokenData.expiresAt) > currentTime
  );
  
  // Check if there's an existing valid token for this device/IP combination
  const existingToken = user.refreshTokens.find((tokenData: any) => 
    tokenData.deviceInfo?.userAgent === userAgent && 
    tokenData.deviceInfo?.ip === ip &&
    new Date(tokenData.expiresAt) > new Date(Date.now() + (24 * 60 * 60 * 1000)) // At least 24 hours remaining
  );
  
  let tokens;
  
  if (existingToken) {
    // Reuse existing token if it has enough time left
    tokens = {
      accessToken: generateAccessToken(user._id.toString(), user.email, user.role),
      refreshToken: existingToken.token,
      tokenId: existingToken.tokenId,
      expiresIn: 24 * 60 * 60, // 24 hours
      refreshExpiresIn: Math.floor((new Date(existingToken.expiresAt).getTime() - Date.now()) / 1000),
      tokenType: 'Bearer',
    };
    
    // Update last used time
    existingToken.lastUsed = currentTime;
  } else {
    // Generate new tokens
    tokens = generateTokens(user._id.toString(), user.email, user.role);
    
    // Create new refresh token entry
    const refreshTokenData = {
      token: tokens.refreshToken,
      tokenId: tokens.tokenId,
      createdAt: currentTime,
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      lastUsed: currentTime,
      deviceInfo: {
        userAgent,
        ip,
      },
    };
    
    // Add new token
    user.refreshTokens.push(refreshTokenData);
    
    // Keep only the 3 most recent tokens per user (reduced from 5)
    if (user.refreshTokens.length > 3) {
      user.refreshTokens.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      user.refreshTokens = user.refreshTokens.slice(0, 3);
    }
  }
  
  // Save user with updated tokens
  await user.save();
  
  // Set HTTP-only cookies
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Access token cookie (always fresh)
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: tokens.expiresIn * 1000, // 24 hours
    path: '/',
  });
  
  // Refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: tokens.refreshExpiresIn * 1000,
    path: '/',
  });
  
  return tokens;
};

// Helper function to generate only access token
const generateAccessToken = (userId: string, email: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    userId,
    email,
    role: role as any,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  return (jwt.sign as any)(payload, jwtSecret);
};

// Register new user
export const register: RegisterController = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      countryCode,
      preferredLanguage = 'en',
      acceptTerms,
      acceptPrivacy,
      marketingConsent = false,
    } = req.body;

    // Validate required consents
    if (!acceptTerms || !acceptPrivacy) {
      throw new ValidationError('Terms and privacy policy acceptance is required', {
        acceptTerms: !acceptTerms ? ['Terms acceptance is required'] : [],
        acceptPrivacy: !acceptPrivacy ? ['Privacy policy acceptance is required'] : [],
      });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        isDeleted: false,
      }).maxTimeMS(5000); // 5 second timeout
    } catch (dbError: any) {
      if (dbError.name === 'MongooseError' && dbError.message.includes('buffering timed out')) {
        throw new Error('Database connection timeout. Please try again later.');
      }
      throw dbError;
    }

    if (existingUser) {
      throw new ConflictError(
        ERROR_MESSAGES.USER.EMAIL_EXISTS,
        createErrorContext({
          ip: req.ip,
          headers: req.headers,
          id: (req as any).id,
          originalUrl: req.originalUrl,
          method: req.method,
        })
      );
    }

    // Check phone number if provided
    if (phone && countryCode) {
      let existingPhone;
      try {
        existingPhone = await User.findOne({
          phone,
          countryCode,
          isDeleted: false,
        }).maxTimeMS(5000); // 5 second timeout
      } catch (dbError: any) {
        if (dbError.name === 'MongooseError' && dbError.message.includes('buffering timed out')) {
          throw new Error('Database connection timeout. Please try again later.');
        }
        throw dbError;
      }

      if (existingPhone) {
        throw new ConflictError(
          ERROR_MESSAGES.USER.PHONE_EXISTS,
          createErrorContext({
          ip: req.ip,
          headers: req.headers,
          id: (req as any).id,
          originalUrl: req.originalUrl,
          method: req.method,
        })
        );
      }
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      countryCode,
      preferredLanguage,
      consents: [
        {
          type: 'terms',
          granted: acceptTerms,
          version: '1.0',
          timestamp: new Date(),
          ipAddress: req.ip,
        },
        {
          type: 'privacy',
          granted: acceptPrivacy,
          version: '1.0',
          timestamp: new Date(),
          ipAddress: req.ip,
        },
        {
          type: 'marketing',
          granted: marketingConsent,
          version: '1.0',
          timestamp: new Date(),
          ipAddress: req.ip,
        },
      ],
    });

    // Save user with timeout handling
    try {
      await user.save();
      
      // Generate email verification token
      const emailVerificationToken = user.generateEmailVerificationToken();
      await user.save();
    } catch (dbError: any) {
      if (dbError.name === 'MongooseError' && dbError.message.includes('buffering timed out')) {
        throw new Error('Database connection timeout. Please try again later.');
      }
      throw dbError;
    }

    // Send email verification OTP
    try {
      await otpService.generateAndSendOtp({
        identifier: user.email,
        method: 'email',
        type: 'verification',
        language: preferredLanguage,
      });
    } catch (otpError) {
      logger.warn('Failed to send email verification OTP', {
        userId: user._id.toString(),
        email: user.email,
        error: otpError instanceof Error ? otpError.message : 'Unknown error',
      });
      // Don't fail registration if OTP sending fails
    }

    // Manage refresh tokens and set cookies
    const tokens = await manageRefreshTokenAndSetCookies(user, req, res);

    logger.info('User registered successfully', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          profileImage: user.profileImage,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
        },
      },
    });
  } catch (error) {
    try {
      logger.logError(error as Error, createErrorContext({
        ip: req.ip,
        headers: req.headers,
        id: (req as any)?.id,
        originalUrl: req?.originalUrl,
        method: req?.method,
      }));
    } catch (logError) {
      console.error('Logger error:', logError);
      console.error('Original error:', error);
    }
    
    if (error instanceof ValidationError || error instanceof ConflictError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
        ...(error instanceof ValidationError && error.errors && { errors: error.errors }),
      });
    } else {
      // Handle unexpected errors safely
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = (error as any)?.statusCode || 500;
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: 'InternalServerError',
      });
    }
  }
};

// Login user
export const login: LoginController = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Find user
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
        createErrorContext({
          ip: req.ip,
          headers: req.headers,
          id: (req as any).id,
          originalUrl: req.originalUrl,
          method: req.method,
        })
      );
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED,
        createErrorContext({
          ip: req.ip,
          headers: req.headers,
          id: (req as any).id,
          originalUrl: req.originalUrl,
          method: req.method,
        })
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      
      logger.warn('Invalid login attempt', {
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      throw new AuthenticationError(
        ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
        createErrorContext({
          ip: req.ip,
          headers: req.headers,
          id: (req as any).id,
          originalUrl: req.originalUrl,
          method: req.method,
        })
      );
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLoginAt = new Date();
    
    // Manage refresh tokens and set cookies (this will save the user)
    const tokens = await manageRefreshTokenAndSetCookies(user, req, res);

    logger.info('User logged in successfully', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
      rememberMe,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          profileImage: user.profileImage,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
        },
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));
    
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: 'InternalServerError',
      });
    }
  }
};

// Refresh access token
export const refreshToken: RefreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT refresh secret not configured');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;
    const userId = decoded.userId;

    // Find user
    const user = await User.findActiveById(userId);
    if (!user) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    logger.info('Tokens refreshed successfully', {
      userId: user._id.toString(),
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: 'AuthenticationError',
      });
    } else {
      res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
    }
  }
};

// Logout user
export const logout: LogoutController = async (req, res) => {
  try {
    const { allDevices = false } = req.body;
    const userId = req.user.id;

    // In a production app, you would maintain a blacklist of tokens
    // or store refresh tokens in database and remove them here

    logger.info('User logged out', {
      userId,
      allDevices,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: allDevices ? 'Logged out from all devices' : 'Logged out successfully',
      data: {
        message: allDevices ? 'Logged out from all devices' : 'Logged out successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Request password reset
export const requestPasswordReset: PasswordResetEmailController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (!user) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent.',
        data: { message: 'Password reset email sent if account exists' },
      });
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info('Password reset requested', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email',
      data: { message: 'Password reset link sent to your email' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Confirm password reset
export const confirmPasswordReset: PasswordResetConfirmController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isDeleted: false,
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;
    await user.save();

    logger.info('Password reset successfully', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: { message: 'Password reset successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Change password (authenticated user)
export const changePassword: ChangePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('Password changed successfully', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: { message: 'Password changed successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Verify email
export const verifyEmail: EmailVerificationController = async (req, res) => {
  try {
    const { token } = req.body;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
      isDeleted: false,
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined as any;
    user.emailVerificationExpires = undefined as any;
    await user.save();

    logger.info('Email verified successfully', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { message: 'Email verified successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Resend verification
export const resendVerification: ResendVerificationController = async (req, res) => {
  try {
    const { email, phone, countryCode, type } = req.body;

    let user;
    
    if (type === 'email' && email) {
      user = await User.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });
    } else if (type === 'phone' && phone && countryCode) {
      user = await User.findOne({
        phone,
        countryCode,
        isDeleted: false,
      });
    } else {
      throw new ValidationError('Invalid request parameters');
    }

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (type === 'email') {
      if (user.isEmailVerified) {
        throw new ValidationError('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // TODO: Send verification email
      // await emailService.sendVerificationEmail(user.email, verificationToken);
    } else if (type === 'phone') {
      if (user.isPhoneVerified) {
        throw new ValidationError('Phone number is already verified');
      }

      // Generate new phone verification token
      const verificationToken = user.generatePhoneVerificationToken();
      await user.save();

      // TODO: Send verification SMS
      // await smsService.sendVerificationSMS(user.phone, user.countryCode, verificationToken);
    }

    logger.info(`${type} verification resent`, {
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      type,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'SMS'} verification sent`,
      data: {
        message: `${type === 'email' ? 'Email' : 'SMS'} verification sent`,
        resendAvailableAt: new Date(Date.now() + 60000), // 1 minute
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: 'InternalServerError',
    });
  }
};

// Phone authentication with OTP
export const phoneAuth: PhoneAuthController = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;

    // Find user by phone number
    const user = await User.findOne({
      phone,
      countryCode,
      isDeleted: false,
    });

    if (!user) {
      throw new NotFoundError('No account found with this phone number');
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    user.phoneOtp = otp;
    user.phoneOtpExpires = otpExpires;
    await user.save();

    // TODO: Send OTP via SMS
    // await smsService.sendOTP(phone, countryCode, otp);

    logger.info('OTP sent for phone authentication', {
      userId: user._id.toString(),
      phone,
      countryCode,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'OTP sent to your phone number',
      data: {
        message: 'OTP sent to your phone number',
        otpSent: true,
      },
    });
  } catch (error) {
    logger.error('Phone auth failed', error as Error);
    
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Phone authentication failed',
        error: 'InternalServerError',
      });
    }
  }
};

// Verify OTP
export const verifyOtp: VerifyOtpController = async (req, res) => {
  try {
    const { phone, countryCode, otp } = req.body;

    // Find user with valid OTP
    const user = await User.findOne({
      phone,
      countryCode,
      phoneOtp: otp,
      phoneOtpExpires: { $gt: Date.now() },
      isDeleted: false,
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    // Clear OTP
    user.phoneOtp = undefined as any;
    user.phoneOtpExpires = undefined as any;
    user.isPhoneVerified = true;
    await user.save();

    // Generate auth tokens
    const tokens = generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    logger.info('OTP verified successfully', {
      userId: user._id.toString(),
      phone,
      countryCode,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Phone verification successful',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          profileImage: user.profileImage,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error('OTP verification failed', error as Error);
    
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: 'InternalServerError',
      });
    }
  }
};

// Send OTP for email verification
export const sendEmailOtp = async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
      });
    }

    // Send OTP
    const result = await otpService.generateAndSendOtp({
      identifier: email.toLowerCase(),
      method: 'email',
      type: 'verification',
      language: user.preferredLanguage || 'en',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP');
    }

    logger.info('Email verification OTP sent', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Verification OTP sent to your email',
      data: {
        expiryTime: result.expiryTime,
        method: result.method,
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP',
        error: 'InternalServerError',
      });
    }
  }
};

// Verify email OTP
export const verifyEmailOtp = async (req: any, res: any) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP are required');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
      });
    }

    // Verify OTP
    const result = await otpService.verifyOtp({
      identifier: email.toLowerCase(),
      otp,
      method: 'email',
      type: 'verification',
    });

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Invalid or expired OTP');
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    logger.info('Email verified successfully via OTP', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        isEmailVerified: true,
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to verify email',
        error: 'InternalServerError',
      });
    }
  }
};

// Send phone verification OTP
export const sendPhoneOtp = async (req: any, res: any) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone || !countryCode) {
      throw new ValidationError('Phone number and country code are required');
    }

    // Find user
    const user = await User.findOne({ 
      phone, 
      countryCode, 
      isDeleted: false 
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isPhoneVerified) {
      return res.status(200).json({
        success: true,
        message: 'Phone number is already verified',
      });
    }

    // Send OTP
    const result = await otpService.generateAndSendOtp({
      identifier: `${countryCode}${phone}`,
      method: 'sms',
      type: 'verification',
      language: user.preferredLanguage || 'en',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP');
    }

    logger.info('Phone verification OTP sent', {
      userId: user._id.toString(),
      phone: `${countryCode}${phone}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Verification OTP sent to your phone',
      data: {
        expiryTime: result.expiryTime,
        method: result.method,
        phone: `${countryCode.slice(0, 2)}***${phone.slice(-2)}`, // Masked phone
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP',
        error: 'InternalServerError',
      });
    }
  }
};

// Verify phone OTP
export const verifyPhoneOtp = async (req: any, res: any) => {
  try {
    const { phone, countryCode, otp } = req.body;

    if (!phone || !countryCode || !otp) {
      throw new ValidationError('Phone number, country code, and OTP are required');
    }

    // Find user
    const user = await User.findOne({ 
      phone, 
      countryCode, 
      isDeleted: false 
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isPhoneVerified) {
      return res.status(200).json({
        success: true,
        message: 'Phone number is already verified',
      });
    }

    // Verify OTP
    const result = await otpService.verifyOtp({
      identifier: `${countryCode}${phone}`,
      otp,
      method: 'sms',
      type: 'verification',
    });

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Invalid or expired OTP');
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    await user.save();

    logger.info('Phone verified successfully via OTP', {
      userId: user._id.toString(),
      phone: `${countryCode}${phone}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        isPhoneVerified: true,
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to verify phone',
        error: 'InternalServerError',
      });
    }
  }
};

// Phone-based login
export const loginWithPhone = async (req: any, res: any) => {
  try {
    const { phone, countryCode, otp } = req.body;

    if (!phone || !countryCode || !otp) {
      throw new ValidationError('Phone number, country code, and OTP are required');
    }

    // Find user
    const user = await User.findOne({ 
      phone, 
      countryCode, 
      isDeleted: false,
      isActive: true,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify OTP
    const result = await otpService.verifyOtp({
      identifier: `${countryCode}${phone}`,
      otp,
      method: 'sms',
      type: 'login',
    });

    if (!result.success) {
      throw new AuthenticationError(result.error || 'Invalid or expired OTP');
    }

    // Reset login attempts
    if (user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLoginAt = new Date();

    // Generate tokens and set cookies
    const tokens = await manageRefreshTokenAndSetCookies(user, req, res);

    logger.info('User logged in successfully via phone OTP', {
      userId: user._id.toString(),
      phone: `${countryCode}${phone}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          profileImage: user.profileImage,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
        },
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: 'InternalServerError',
      });
    }
  }
};

// Request OTP for phone login
export const requestPhoneLoginOtp = async (req: any, res: any) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone || !countryCode) {
      throw new ValidationError('Phone number and country code are required');
    }

    // Find user
    const user = await User.findOne({ 
      phone, 
      countryCode, 
      isDeleted: false,
      isActive: true,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Send OTP
    const result = await otpService.generateAndSendOtp({
      identifier: `${countryCode}${phone}`,
      method: 'sms',
      type: 'login',
      language: user.preferredLanguage || 'en',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP');
    }

    logger.info('Phone login OTP sent', {
      userId: user._id.toString(),
      phone: `${countryCode}${phone}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Login OTP sent to your phone',
      data: {
        expiryTime: result.expiryTime,
        method: result.method,
        phone: `${countryCode.slice(0, 2)}***${phone.slice(-2)}`, // Masked phone
      },
    });
  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send login OTP',
        error: 'InternalServerError',
      });
    }
  }
};

// Google OAuth Sign-In
export const googleAuthCallback = async (req: any, res: any): Promise<void> => {
  try {
    const { user: googleUser, accessToken, refreshToken: googleRefreshToken } = req.user;
    
    if (!googleUser || !googleUser.email) {
      throw new ValidationError('Invalid Google authentication data');
    }

    logger.info('Google OAuth callback received', {
      email: googleUser.email,
      providerId: googleUser.id,
      ip: req.ip,
    });

    // Check if user already exists
    let user = await User.findOne({ 
      email: googleUser.email.toLowerCase().trim(),
      isDeleted: false 
    });

    if (user) {
      // Update existing user's Google account info
      const existingGoogleAccount = user.socialAccounts?.find(
        account => account.provider === 'google'
      );

      if (!existingGoogleAccount) {
        // Add Google account to existing user
        user.socialAccounts = user.socialAccounts || [];
        user.socialAccounts.push({
          provider: 'google',
          providerId: googleUser.id,
          email: googleUser.email,
          connectedAt: new Date(),
        });
        user.isEmailVerified = true; // Google emails are pre-verified
        await user.save();
      }

      logger.info('Existing user signed in with Google', {
        userId: user._id.toString(),
        email: user.email,
        ip: req.ip,
      });
    } else {
      // Create new user from Google data
      const userData = {
        email: googleUser.email.toLowerCase().trim(),
        firstName: googleUser.name?.givenName || googleUser.displayName?.split(' ')[0] || 'User',
        lastName: googleUser.name?.familyName || googleUser.displayName?.split(' ').slice(1).join(' ') || '',
        profileImage: googleUser.photos?.[0]?.value || undefined,
        isEmailVerified: true, // Google emails are pre-verified
        role: 'farmer' as const,
        preferredLanguage: 'en' as const,
        isActive: true,
        socialAccounts: [{
          provider: 'google' as const,
          providerId: googleUser.id,
          email: googleUser.email,
          connectedAt: new Date(),
        }],
        consents: [
          {
            type: 'terms' as const,
            granted: true,
            version: '1.0',
            timestamp: new Date(),
            ipAddress: req.ip,
          },
          {
            type: 'privacy' as const,
            granted: true,
            version: '1.0',
            timestamp: new Date(),
            ipAddress: req.ip,
          }
        ],
      };

      user = new User(userData);
      await user.save();

      logger.info('New user created via Google OAuth', {
        userId: user._id.toString(),
        email: user.email,
        ip: req.ip,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokenPayload: AuthTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const { accessToken: jwtAccessToken, refreshToken: jwtRefreshToken } = await manageRefreshTokenAndSetCookies(
      user,
      req,
      res,
      tokenPayload,
      false // rememberMe defaults to false for social login
    );

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?success=true&token=${encodeURIComponent(jwtAccessToken)}`;
    
    res.redirect(redirectUrl);

  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;
    
    res.redirect(redirectUrl);
  }
};

// Mobile Google Sign-In (for mobile apps using Google ID tokens)
export const mobileGoogleSignIn = async (req: any, res: any): Promise<void> => {
  try {
    const { idToken, rememberMe = false } = req.body;

    if (!idToken) {
      throw new ValidationError('Google ID token is required');
    }

    // Verify Google ID token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      throw new ValidationError('Invalid Google ID token');
    }

    logger.info('Mobile Google Sign-In received', {
      email: payload.email,
      sub: payload.sub,
      ip: req.ip,
    });

    // Check if user already exists
    let user = await User.findOne({ 
      email: payload.email.toLowerCase().trim(),
      isDeleted: false 
    });

    if (user) {
      // Update existing user's Google account info
      const existingGoogleAccount = user.socialAccounts?.find(
        account => account.provider === 'google'
      );

      if (!existingGoogleAccount) {
        // Add Google account to existing user
        user.socialAccounts = user.socialAccounts || [];
        user.socialAccounts.push({
          provider: 'google',
          providerId: payload.sub!,
          email: payload.email!,
          connectedAt: new Date(),
        });
        user.isEmailVerified = true; // Google emails are pre-verified
        await user.save();
      }

      logger.info('Existing user signed in via mobile Google', {
        userId: user._id.toString(),
        email: user.email,
        ip: req.ip,
      });
    } else {
      // Create new user from Google data
      const userData = {
        email: payload.email!.toLowerCase().trim(),
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
        lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        profileImage: payload.picture || undefined,
        isEmailVerified: true, // Google emails are pre-verified
        role: 'farmer' as const,
        preferredLanguage: 'en' as const,
        isActive: true,
        socialAccounts: [{
          provider: 'google' as const,
          providerId: payload.sub!,
          email: payload.email!,
          connectedAt: new Date(),
        }],
        consents: [
          {
            type: 'terms' as const,
            granted: true,
            version: '1.0',
            timestamp: new Date(),
            ipAddress: req.ip,
          },
          {
            type: 'privacy' as const,
            granted: true,
            version: '1.0',
            timestamp: new Date(),
            ipAddress: req.ip,
          }
        ],
      };

      user = new User(userData);
      await user.save();

      logger.info('New user created via mobile Google OAuth', {
        userId: user._id.toString(),
        email: user.email,
        ip: req.ip,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokenPayload: AuthTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const { accessToken: jwtAccessToken, refreshToken: jwtRefreshToken } = await manageRefreshTokenAndSetCookies(
      user,
      req,
      res,
      tokenPayload,
      rememberMe
    );

    res.json({
      success: true,
      message: 'Google Sign-In successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
          role: user.role,
        },
        tokens: {
          accessToken: jwtAccessToken,
          refreshToken: jwtRefreshToken,
        },
      },
    });

  } catch (error) {
    logger.logError(error as Error, createErrorContext({
      ip: req.ip,
      headers: req.headers,
      id: (req as any).id,
      originalUrl: req.originalUrl,
      method: req.method,
    }));

    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.name,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Google Sign-In failed',
        error: 'InternalServerError',
      });
    }
  }
};

export default {
  register,
  login,
  phoneAuth,
  verifyOtp,
  refreshToken,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  verifyEmail,
  resendVerification,
  // New OTP-based verification
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  loginWithPhone,
  requestPhoneLoginOtp,
  // Google OAuth
  googleAuthCallback,
  mobileGoogleSignIn,
};