"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerification = exports.verifyEmail = exports.changePassword = exports.confirmPasswordReset = exports.requestPasswordReset = exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = require("@/models/User");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
// JWT Helper functions
const generateTokens = (userId, email, role) => {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtSecret || !refreshSecret) {
        throw new Error('JWT secrets not configured');
    }
    const payload = {
        userId,
        email,
        role: role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRE || '24h',
    });
    const refreshToken = jsonwebtoken_1.default.sign({
        userId,
        tokenId: crypto_1.default.randomBytes(16).toString('hex'),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    }, refreshSecret, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
    return {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
        tokenType: 'Bearer',
    };
};
// Register new user
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, countryCode, preferredLanguage = 'en', acceptTerms, acceptPrivacy, marketingConsent = false, } = req.body;
        // Validate required consents
        if (!acceptTerms || !acceptPrivacy) {
            throw new errors_1.ValidationError('Terms and privacy policy acceptance is required', {
                acceptTerms: !acceptTerms ? ['Terms acceptance is required'] : [],
                acceptPrivacy: !acceptPrivacy ? ['Privacy policy acceptance is required'] : [],
            });
        }
        // Check if user already exists
        const existingUser = await User_1.User.findOne({
            email: email.toLowerCase(),
            isDeleted: false,
        });
        if (existingUser) {
            throw new errors_1.ConflictError(errors_1.ERROR_MESSAGES.USER.EMAIL_EXISTS, (0, errors_1.createErrorContext)({
                ip: req.ip,
                headers: req.headers,
                id: req.id,
                originalUrl: req.originalUrl,
                method: req.method,
            }));
        }
        // Check phone number if provided
        if (phone && countryCode) {
            const existingPhone = await User_1.User.findOne({
                phone,
                countryCode,
                isDeleted: false,
            });
            if (existingPhone) {
                throw new errors_1.ConflictError(errors_1.ERROR_MESSAGES.USER.PHONE_EXISTS, (0, errors_1.createErrorContext)({
                    ip: req.ip,
                    headers: req.headers,
                    id: req.id,
                    originalUrl: req.originalUrl,
                    method: req.method,
                }));
            }
        }
        // Create user
        const user = new User_1.User({
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
        await user.save();
        // Generate email verification token
        const emailVerificationToken = user.generateEmailVerificationToken();
        await user.save();
        // TODO: Send verification email
        // await emailService.sendVerificationEmail(user.email, emailVerificationToken);
        // Generate auth tokens
        const tokens = generateTokens(user._id.toString(), user.email, user.role);
        logger_1.logger.info('User registered successfully', {
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
                tokens,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Registration failed', error, (0, errors_1.createErrorContext)({
            ip: req.ip,
            headers: req.headers,
            id: req.id,
            originalUrl: req.originalUrl,
            method: req.method,
        }));
        if (error instanceof errors_1.ValidationError || error instanceof errors_1.ConflictError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.name,
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Registration failed',
                error: 'InternalServerError',
            });
        }
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        const { email, password, rememberMe = false } = req.body;
        // Find user
        const user = await User_1.User.findByEmail(email.toLowerCase());
        if (!user) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, (0, errors_1.createErrorContext)({
                ip: req.ip,
                headers: req.headers,
                id: req.id,
                originalUrl: req.originalUrl,
                method: req.method,
            }));
        }
        // Check if account is locked
        if (user.isLocked()) {
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED, (0, errors_1.createErrorContext)({
                ip: req.ip,
                headers: req.headers,
                id: req.id,
                originalUrl: req.originalUrl,
                method: req.method,
            }));
        }
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await user.incrementLoginAttempts();
            logger_1.logger.warn('Invalid login attempt', {
                email: user.email,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
            throw new errors_1.AuthenticationError(errors_1.ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS, (0, errors_1.createErrorContext)({
                ip: req.ip,
                headers: req.headers,
                id: req.id,
                originalUrl: req.originalUrl,
                method: req.method,
            }));
        }
        // Reset login attempts on successful login
        await user.resetLoginAttempts();
        // Generate auth tokens
        const tokens = generateTokens(user._id.toString(), user.email, user.role);
        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
        logger_1.logger.info('User logged in successfully', {
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
                tokens,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login failed', error, (0, errors_1.createErrorContext)({
            ip: req.ip,
            headers: req.headers,
            id: req.id,
            originalUrl: req.originalUrl,
            method: req.method,
        }));
        if (error instanceof errors_1.AuthenticationError || error instanceof errors_1.NotFoundError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.name,
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: 'InternalServerError',
            });
        }
    }
};
exports.login = login;
// Refresh access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new errors_1.AuthenticationError('Refresh token is required');
        }
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!refreshSecret) {
            throw new Error('JWT refresh secret not configured');
        }
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        const userId = decoded.userId;
        // Find user
        const user = await User_1.User.findActiveById(userId);
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid refresh token');
        }
        // Generate new tokens
        const tokens = generateTokens(user._id.toString(), user.email, user.role);
        logger_1.logger.info('Tokens refreshed successfully', {
            userId: user._id.toString(),
            email: user.email,
        });
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: tokens,
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                error: 'AuthenticationError',
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'An error occurred',
                error: 'InternalServerError',
            });
        }
    }
};
exports.refreshToken = refreshToken;
// Logout user
const logout = async (req, res) => {
    try {
        const { allDevices = false } = req.body;
        const userId = req.user.id;
        // In a production app, you would maintain a blacklist of tokens
        // or store refresh tokens in database and remove them here
        logger_1.logger.info('User logged out', {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.logout = logout;
// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.User.findOne({
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
        logger_1.logger.info('Password reset requested', {
            userId: user._id.toString(),
            email: user.email,
            ip: req.ip,
        });
        res.json({
            success: true,
            message: 'Password reset link sent to your email',
            data: { message: 'Password reset link sent to your email' },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.requestPasswordReset = requestPasswordReset;
// Confirm password reset
const confirmPasswordReset = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // Hash token
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find user with valid reset token
        const user = await User_1.User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
            isDeleted: false,
        });
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid or expired password reset token');
        }
        // Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        logger_1.logger.info('Password reset successfully', {
            userId: user._id.toString(),
            email: user.email,
            ip: req.ip,
        });
        res.json({
            success: true,
            message: 'Password reset successfully',
            data: { message: 'Password reset successfully' },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.confirmPasswordReset = confirmPasswordReset;
// Change password (authenticated user)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        // Find user
        const user = await User_1.User.findById(userId).select('+password');
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw new errors_1.AuthenticationError('Current password is incorrect');
        }
        // Update password
        user.password = newPassword;
        await user.save();
        logger_1.logger.info('Password changed successfully', {
            userId: user._id.toString(),
            email: user.email,
            ip: req.ip,
        });
        res.json({
            success: true,
            message: 'Password changed successfully',
            data: { message: 'Password changed successfully' },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.changePassword = changePassword;
// Verify email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        // Hash token
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find user with valid verification token
        const user = await User_1.User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() },
            isDeleted: false,
        });
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid or expired verification token');
        }
        // Mark email as verified
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        logger_1.logger.info('Email verified successfully', {
            userId: user._id.toString(),
            email: user.email,
            ip: req.ip,
        });
        res.json({
            success: true,
            message: 'Email verified successfully',
            data: { message: 'Email verified successfully' },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.verifyEmail = verifyEmail;
// Resend verification
const resendVerification = async (req, res) => {
    try {
        const { email, phone, countryCode, type } = req.body;
        let user;
        if (type === 'email' && email) {
            user = await User_1.User.findOne({
                email: email.toLowerCase(),
                isDeleted: false,
            });
        }
        else if (type === 'phone' && phone && countryCode) {
            user = await User_1.User.findOne({
                phone,
                countryCode,
                isDeleted: false,
            });
        }
        else {
            throw new errors_1.ValidationError('Invalid request parameters');
        }
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        if (type === 'email') {
            if (user.isEmailVerified) {
                throw new errors_1.ValidationError('Email is already verified');
            }
            // Generate new verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save();
            // TODO: Send verification email
            // await emailService.sendVerificationEmail(user.email, verificationToken);
        }
        else if (type === 'phone') {
            if (user.isPhoneVerified) {
                throw new errors_1.ValidationError('Phone number is already verified');
            }
            // Generate new phone verification token
            const verificationToken = user.generatePhoneVerificationToken();
            await user.save();
            // TODO: Send verification SMS
            // await smsService.sendVerificationSMS(user.phone, user.countryCode, verificationToken);
        }
        logger_1.logger.info(`${type} verification resent`, {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred',
            error: 'InternalServerError',
        });
    }
};
exports.resendVerification = resendVerification;
exports.default = {
    register: exports.register,
    login: exports.login,
    refreshToken: exports.refreshToken,
    logout: exports.logout,
    requestPasswordReset: exports.requestPasswordReset,
    confirmPasswordReset: exports.confirmPasswordReset,
    changePassword: exports.changePassword,
    verifyEmail: exports.verifyEmail,
    resendVerification: exports.resendVerification,
};
//# sourceMappingURL=authController.js.map