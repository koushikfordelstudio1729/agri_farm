import { Response, NextFunction } from 'express';
import User from '@/models/User';
import { ImageService } from '@/services/imageService';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
  ConflictError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetUserRequest,
  UpdateProfileRequest,
  UploadProfileImageRequest,
  ChangePasswordRequest,
  UpdatePreferencesRequest,
  SearchUsersRequest,
  FollowUserRequest,
  GetFollowersRequest,
  GetFollowingRequest,
  BlockUserRequest,
  ReportUserRequest,
  DeleteAccountRequest,
  ExportDataRequest,
  UserProfileResponse,
  UserStatsResponse,
  FollowResponse,
  GetProfileController,
  GetUserController,
  UpdateProfileController,
  UploadProfileImageController,
  ChangePasswordController,
  UpdatePreferencesController,
  SearchUsersController,
  FollowUserController,
  UnfollowUserController,
  GetFollowersController,
  GetFollowingController,
  BlockUserController,
  UnblockUserController,
  ReportUserController,
  DeleteAccountController,
  ExportDataController,
  GetUserStatsController,
} from './userController.types';

export class UserController {
  public getProfile: GetProfileController = async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id)
        .select('-password -tokenVersion')
        .lean();

      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      logger.info('User profile retrieved', {
        userId: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user as UserProfileResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUser: GetUserController = async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('firstName lastName profileImage role farmingType farmingExperience reputation followersCount followingCount postsCount createdAt location.country location.state')
        .lean();

      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Check if current user follows this user (if authenticated)
      let isFollowing = false;
      let mutualFollowers = 0;
      
      if (req.user) {
        // This would require a Follow model implementation
        // isFollowing = await Follow.exists({ followerId: req.user.id, followingId: userId });
        // mutualFollowers = await getMutualFollowersCount(req.user.id, userId);
      }

      const userProfile: UserProfileResponse = {
        ...user,
        canFollow: req.user?.id !== userId,
        isFollowing,
        mutualFollowers,
      } as UserProfileResponse;

      logger.info('Public user profile retrieved', {
        requesterId: req.user?.id,
        targetUserId: userId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: 'User profile retrieved successfully',
        data: userProfile,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateProfile: UpdateProfileController = async (req, res, next) => {
    try {
      const updateData = req.body;
      const userId = req.user.id;

      // Validate phone uniqueness if provided
      if (updateData.phone) {
        const existingUser = await User.findOne({
          phone: updateData.phone,
          countryCode: updateData.countryCode,
          _id: { $ne: userId },
        });

        if (existingUser) {
          throw new ConflictError('Phone number already in use', createErrorContext(req));
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password -tokenVersion');

      if (!updatedUser) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser.toSafeObject() as UserProfileResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public uploadProfileImage: UploadProfileImageController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        throw new ValidationError('No image file provided', {
          file: ['Image file is required'],
        }, createErrorContext(req));
      }

      // Process and upload image
      const uploadResults = await ImageService.processUploadedImages([req.file], {
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
        throw new ValidationError('Image processing failed', {
          file: ['Unable to process the uploaded image'],
        }, createErrorContext(req));
      }

      const uploadedImage = uploadResults[0];
      
      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          profileImage: uploadedImage.url,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-password -tokenVersion');

      if (!updatedUser) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      logger.info('Profile image uploaded', {
        userId,
        imageUrl: uploadedImage.url,
        imageSize: uploadedImage.size,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ profileImage: string }> = {
        success: true,
        message: 'Profile image updated successfully',
        data: { profileImage: uploadedImage.url },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public changePassword: ChangePasswordController = async (req, res, next) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      if (newPassword !== confirmPassword) {
        throw new ValidationError('Password confirmation does not match', {
          confirmPassword: ['Password confirmation must match new password'],
        }, createErrorContext(req));
      }

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect', createErrorContext(req));
      }

      // Update password
      user.password = newPassword;
      user.tokenVersion += 1; // Invalidate existing tokens
      await user.save();

      logger.info('Password changed successfully', {
        userId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Password changed successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences: UpdatePreferencesController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Update preferences (assuming they're stored in the user document)
      const updateFields: any = {};
      
      if (preferences.notifications) {
        Object.keys(preferences.notifications).forEach(key => {
          updateFields[`preferences.notifications.${key}`] = preferences.notifications![key as keyof typeof preferences.notifications];
        });
      }

      if (preferences.privacy) {
        Object.keys(preferences.privacy).forEach(key => {
          updateFields[`preferences.privacy.${key}`] = preferences.privacy![key as keyof typeof preferences.privacy];
        });
      }

      if (preferences.display) {
        Object.keys(preferences.display).forEach(key => {
          updateFields[`preferences.display.${key}`] = preferences.display![key as keyof typeof preferences.display];
        });
      }

      if (preferences.ai) {
        Object.keys(preferences.ai).forEach(key => {
          updateFields[`preferences.ai.${key}`] = preferences.ai![key as keyof typeof preferences.ai];
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true }
      ).select('-password -tokenVersion');

      logger.info('User preferences updated', {
        userId,
        updatedPreferences: Object.keys(preferences),
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserProfileResponse> = {
        success: true,
        message: 'Preferences updated successfully',
        data: updatedUser?.toSafeObject() as UserProfileResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchUsers: SearchUsersController = async (req, res, next) => {
    try {
      const {
        q,
        role,
        verified,
        country,
        state,
        city,
        farmingType,
        subscriptionTier,
        dateFrom,
        dateTo,
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {
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
      } else if (verified === 'false') {
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
        if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute search
      const [users, total] = await Promise.all([
        User.find(searchQuery)
          .select('firstName lastName profileImage role farmingType reputation followersCount createdAt location.country location.state')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Users searched', {
        query: q,
        filters: { role, verified, country, state, farmingType },
        resultCount: users.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserProfileResponse[]> = {
        success: true,
        message: 'Users retrieved successfully',
        data: users as UserProfileResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getUserStats: GetUserStatsController = async (req, res, next) => {
    try {
      const stats = await User.getUserStats();

      const response: ApiResponse<UserStatsResponse> = {
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Additional controller methods would be implemented here:
  public followUser: FollowUserController = async (req, res, next) => {
    // Implementation would require a Follow model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public unfollowUser: UnfollowUserController = async (req, res, next) => {
    // Implementation would require a Follow model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public getFollowers: GetFollowersController = async (req, res, next) => {
    // Implementation would require a Follow model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public getFollowing: GetFollowingController = async (req, res, next) => {
    // Implementation would require a Follow model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public blockUser: BlockUserController = async (req, res, next) => {
    // Implementation would require a Block model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public unblockUser: UnblockUserController = async (req, res, next) => {
    // Implementation would require a Block model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public reportUser: ReportUserController = async (req, res, next) => {
    // Implementation would require a UserReport model
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };

  public deleteAccount: DeleteAccountController = async (req, res, next) => {
    try {
      const { password, reason, feedback } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Password is incorrect', createErrorContext(req));
      }

      // Soft delete the user
      user.isActive = false;
      user.deletedAt = new Date();
      await user.save();

      // Log deletion reason for analytics
      logger.info('User account deleted', {
        userId,
        reason,
        feedback: feedback ? 'provided' : 'none',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Account deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public exportData: ExportDataController = async (req, res, next) => {
    // Implementation would create and return user data export
    res.status(501).json({ success: false, message: 'Feature not implemented yet' });
  };
}

export default new UserController();