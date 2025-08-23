"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = __importDefault(require("@/models/User"));
const imageService_1 = require("@/services/imageService");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
class UserController {
    getProfile = async (req, res, next) => {
        try {
            const user = await User_1.default.findById(req.user.id)
                .select('-password -tokenVersion')
                .lean();
            if (!user) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            logger_1.logger.info('User profile retrieved', {
                userId: req.user.id,
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Profile retrieved successfully',
                data: user,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    getUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const user = await User_1.default.findById(userId)
                .select('firstName lastName profileImage role farmingType farmingExperience reputation followersCount followingCount postsCount createdAt location.country location.state')
                .lean();
            if (!user) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            // Check if current user follows this user (if authenticated)
            let isFollowing = false;
            let mutualFollowers = 0;
            if (req.user) {
                // This would require a Follow model implementation
                // isFollowing = await Follow.exists({ followerId: req.user.id, followingId: userId });
                // mutualFollowers = await getMutualFollowersCount(req.user.id, userId);
            }
            const userProfile = {
                ...user,
                canFollow: req.user?.id !== userId,
                isFollowing,
                mutualFollowers,
            };
            logger_1.logger.info('Public user profile retrieved', {
                requesterId: req.user?.id,
                targetUserId: userId,
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'User profile retrieved successfully',
                data: userProfile,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const updateData = req.body;
            const userId = req.user.id;
            // Validate phone uniqueness if provided
            if (updateData.phone) {
                const existingUser = await User_1.default.findOne({
                    phone: updateData.phone,
                    countryCode: updateData.countryCode,
                    _id: { $ne: userId },
                });
                if (existingUser) {
                    throw new errors_1.ConflictError('Phone number already in use', (0, errors_1.createErrorContext)(req));
                }
            }
            const updatedUser = await User_1.default.findByIdAndUpdate(userId, { ...updateData, updatedAt: new Date() }, { new: true, runValidators: true }).select('-password -tokenVersion');
            if (!updatedUser) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            logger_1.logger.info('User profile updated', {
                userId,
                updatedFields: Object.keys(updateData),
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser.toSafeObject(),
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    uploadProfileImage = async (req, res, next) => {
        try {
            const userId = req.user.id;
            if (!req.file) {
                throw new errors_1.ValidationError('No image file provided', {
                    file: ['Image file is required'],
                }, (0, errors_1.createErrorContext)(req));
            }
            // Process and upload image
            const uploadResults = await imageService_1.ImageService.processUploadedImages([req.file], {
                generateThumbnails: true,
                uploadToCloud: true,
                processOptions: {
                    width: 400,
                    height: 400,
                    quality: 85,
                    fit: 'cover',
                },
            });
            if (uploadResults.length === 0) {
                throw new errors_1.ValidationError('Image processing failed', {
                    file: ['Unable to process the uploaded image'],
                }, (0, errors_1.createErrorContext)(req));
            }
            const uploadedImage = uploadResults[0];
            // Update user profile
            const updatedUser = await User_1.default.findByIdAndUpdate(userId, {
                profileImage: uploadedImage.url,
                updatedAt: new Date(),
            }, { new: true }).select('-password -tokenVersion');
            if (!updatedUser) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            logger_1.logger.info('Profile image uploaded', {
                userId,
                imageUrl: uploadedImage.url,
                imageSize: uploadedImage.size,
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Profile image updated successfully',
                data: { profileImage: uploadedImage.url },
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    changePassword = async (req, res, next) => {
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            const userId = req.user.id;
            if (newPassword !== confirmPassword) {
                throw new errors_1.ValidationError('Password confirmation does not match', {
                    confirmPassword: ['Password confirmation must match new password'],
                }, (0, errors_1.createErrorContext)(req));
            }
            const user = await User_1.default.findById(userId).select('+password');
            if (!user) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            // Verify current password
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                throw new errors_1.AuthenticationError('Current password is incorrect', (0, errors_1.createErrorContext)(req));
            }
            // Update password
            user.password = newPassword;
            user.tokenVersion += 1; // Invalidate existing tokens
            await user.save();
            logger_1.logger.info('Password changed successfully', {
                userId,
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Password changed successfully',
                data: {},
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    updatePreferences = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const preferences = req.body;
            const user = await User_1.default.findById(userId);
            if (!user) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            // Update preferences (assuming they're stored in the user document)
            const updateFields = {};
            if (preferences.notifications) {
                Object.keys(preferences.notifications).forEach(key => {
                    updateFields[`preferences.notifications.${key}`] = preferences.notifications[key];
                });
            }
            if (preferences.privacy) {
                Object.keys(preferences.privacy).forEach(key => {
                    updateFields[`preferences.privacy.${key}`] = preferences.privacy[key];
                });
            }
            if (preferences.display) {
                Object.keys(preferences.display).forEach(key => {
                    updateFields[`preferences.display.${key}`] = preferences.display[key];
                });
            }
            if (preferences.ai) {
                Object.keys(preferences.ai).forEach(key => {
                    updateFields[`preferences.ai.${key}`] = preferences.ai[key];
                });
            }
            const updatedUser = await User_1.default.findByIdAndUpdate(userId, updateFields, { new: true }).select('-password -tokenVersion');
            logger_1.logger.info('User preferences updated', {
                userId,
                updatedPreferences: Object.keys(preferences),
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Preferences updated successfully',
                data: updatedUser?.toSafeObject(),
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    searchUsers = async (req, res, next) => {
        try {
            const { q, role, verified, country, state, city, farmingType, subscriptionTier, dateFrom, dateTo, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;
            // Build search query
            const searchQuery = {
                isActive: true,
                deletedAt: { $exists: false },
            };
            if (q) {
                searchQuery.$text = { $search: q };
            }
            if (role) {
                searchQuery.role = role;
            }
            if (verified === 'true') {
                searchQuery.isEmailVerified = true;
            }
            else if (verified === 'false') {
                searchQuery.isEmailVerified = false;
            }
            if (country) {
                searchQuery['location.country'] = country;
            }
            if (state) {
                searchQuery['location.state'] = state;
            }
            if (city) {
                searchQuery['location.city'] = city;
            }
            if (farmingType) {
                searchQuery.farmingType = farmingType;
            }
            if (subscriptionTier) {
                searchQuery.subscriptionTier = subscriptionTier;
            }
            if (dateFrom || dateTo) {
                searchQuery.createdAt = {};
                if (dateFrom)
                    searchQuery.createdAt.$gte = new Date(dateFrom);
                if (dateTo)
                    searchQuery.createdAt.$lte = new Date(dateTo);
            }
            // Build sort object
            const sortObj = {};
            sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
            // Execute search
            const [users, total] = await Promise.all([
                User_1.default.find(searchQuery)
                    .select('firstName lastName profileImage role farmingType reputation followersCount createdAt location.country location.state')
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                User_1.default.countDocuments(searchQuery),
            ]);
            const pagination = {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPreviousPage: pageNum > 1,
            };
            logger_1.logger.info('Users searched', {
                query: q,
                filters: { role, verified, country, state, farmingType },
                resultCount: users.length,
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Users retrieved successfully',
                data: users,
            };
            res.json({ ...response, pagination });
        }
        catch (error) {
            next(error);
        }
    };
    getUserStats = async (req, res, next) => {
        try {
            const stats = await User_1.default.getUserStats();
            const response = {
                success: true,
                message: 'User statistics retrieved successfully',
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    // Additional controller methods would be implemented here:
    followUser = async (req, res, next) => {
        // Implementation would require a Follow model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    unfollowUser = async (req, res, next) => {
        // Implementation would require a Follow model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    getFollowers = async (req, res, next) => {
        // Implementation would require a Follow model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    getFollowing = async (req, res, next) => {
        // Implementation would require a Follow model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    blockUser = async (req, res, next) => {
        // Implementation would require a Block model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    unblockUser = async (req, res, next) => {
        // Implementation would require a Block model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    reportUser = async (req, res, next) => {
        // Implementation would require a UserReport model
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
    deleteAccount = async (req, res, next) => {
        try {
            const { password, reason, feedback } = req.body;
            const userId = req.user.id;
            const user = await User_1.default.findById(userId).select('+password');
            if (!user) {
                throw new errors_1.NotFoundError('User not found', (0, errors_1.createErrorContext)(req));
            }
            // Verify password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new errors_1.AuthenticationError('Password is incorrect', (0, errors_1.createErrorContext)(req));
            }
            // Soft delete the user
            user.isActive = false;
            user.deletedAt = new Date();
            await user.save();
            // Log deletion reason for analytics
            logger_1.logger.info('User account deleted', {
                userId,
                reason,
                feedback: feedback ? 'provided' : 'none',
                requestId: req.id,
            });
            const response = {
                success: true,
                message: 'Account deleted successfully',
                data: {},
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    };
    exportData = async (req, res, next) => {
        // Implementation would create and return user data export
        res.status(501).json({ success: false, message: 'Feature not implemented yet' });
    };
}
exports.UserController = UserController;
exports.default = new UserController();
//# sourceMappingURL=userController.js.map