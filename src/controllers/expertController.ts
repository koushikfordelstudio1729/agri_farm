import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Expert } from '@/models/Expert';
import { User } from '@/models/User';
import { Diagnosis } from '@/models/Diagnosis';
import { CommunityPost } from '@/models/CommunityPost';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BadRequestError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetExpertsRequest,
  GetExpertRequest,
  CreateExpertProfileRequest,
  UpdateExpertProfileRequest,
  BookConsultationRequest,
  GetConsultationsRequest,
  UpdateConsultationRequest,
  CancelConsultationRequest,
  GetExpertStatsRequest,
  SearchExpertsRequest,
  GetExpertReviewsRequest,
  AddExpertReviewRequest,
  GetExpertAvailabilityRequest,
  SetExpertAvailabilityRequest,
  GetConsultationHistoryRequest,
  ApproveExpertRequest,
  RejectExpertRequest,
  ExpertResponse,
  ConsultationResponse,
  ExpertStatsResponse,
  ReviewResponse,
  AvailabilityResponse,
  GetExpertsController,
  GetExpertController,
  CreateExpertProfileController,
  UpdateExpertProfileController,
  BookConsultationController,
  GetConsultationsController,
  UpdateConsultationController,
  CancelConsultationController,
  GetExpertStatsController,
  SearchExpertsController,
  GetExpertReviewsController,
  AddExpertReviewController,
  GetExpertAvailabilityController,
  SetExpertAvailabilityController,
  GetConsultationHistoryController,
  ApproveExpertController,
  RejectExpertController,
} from './expertController.types';

export class ExpertController {
  public getExperts: GetExpertsController = async (req, res, next) => {
    try {
      const {
        specialization,
        location,
        rating,
        availability,
        priceRange,
        experience,
        language,
        page = '1',
        limit = '10',
        sortBy = 'rating',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        status: 'approved',
        isAvailable: true,
      };

      if (specialization) {
        filterQuery.specializations = { $in: [specialization] };
      }

      if (rating) {
        filterQuery.averageRating = { $gte: parseFloat(rating as string) };
      }

      if (experience) {
        filterQuery.experience = { $gte: parseInt(experience as string, 10) };
      }

      if (language) {
        filterQuery.languages = { $in: [language] };
      }

      if (location) {
        const [lat, lng] = (location as string).split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          filterQuery.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 100000, // 100km radius
            },
          };
        }
      }

      if (priceRange) {
        const [min, max] = (priceRange as string).split(',').map(Number);
        filterQuery.consultationFee = {};
        if (!isNaN(min)) filterQuery.consultationFee.$gte = min;
        if (!isNaN(max)) filterQuery.consultationFee.$lte = max;
      }

      if (availability === 'now') {
        // Check current availability
        const now = new Date();
        const currentDay = now.toLocaleDateString('en', { weekday: 'lowercase' });
        const currentTime = now.toTimeString().slice(0, 5);

        filterQuery[`availability.${currentDay}.isAvailable`] = true;
        filterQuery[`availability.${currentDay}.timeSlots`] = {
          $elemMatch: {
            start: { $lte: currentTime },
            end: { $gte: currentTime },
            isBooked: false,
          }
        };
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [experts, total] = await Promise.all([
        Expert.find(filterQuery)
          .populate('user', 'firstName lastName profileImage')
          .select('-reviews') // Don't load reviews in list view
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Expert.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Experts retrieved', {
        userId: req.user?.id || 'anonymous',
        filters: { specialization, location, rating, availability },
        resultCount: experts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse[]> = {
        success: true,
        message: 'Experts retrieved successfully',
        data: experts as ExpertResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getExpert: GetExpertController = async (req, res, next) => {
    try {
      const { expertId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId)
        .populate('user', 'firstName lastName profileImage')
        .populate({
          path: 'reviews',
          populate: {
            path: 'user',
            select: 'firstName lastName profileImage',
          },
          options: {
            sort: { createdAt: -1 },
            limit: 10,
          },
        })
        .lean();

      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      if (expert.status !== 'approved') {
        throw new NotFoundError('Expert profile not available', createErrorContext(req));
      }

      // Calculate additional stats
      const consultationCount = await Expert.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(expertId) }
        },
        {
          $lookup: {
            from: 'consultations',
            localField: '_id',
            foreignField: 'expert',
            as: 'consultations'
          }
        },
        {
          $project: {
            totalConsultations: { $size: '$consultations' },
            completedConsultations: {
              $size: {
                $filter: {
                  input: '$consultations',
                  cond: { $eq: ['$$this.status', 'completed'] }
                }
              }
            }
          }
        }
      ]);

      const expertWithStats = {
        ...expert,
        statistics: {
          totalConsultations: consultationCount[0]?.totalConsultations || 0,
          completedConsultations: consultationCount[0]?.completedConsultations || 0,
          responseTime: expert.averageResponseTime || '< 1 hour',
          successRate: expert.successRate || 95,
        },
      };

      logger.info('Expert details retrieved', {
        expertId,
        userId: req.user?.id || 'anonymous',
        expertName: `${expert.user.firstName} ${expert.user.lastName}`,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse> = {
        success: true,
        message: 'Expert details retrieved successfully',
        data: expertWithStats as ExpertResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createExpertProfile: CreateExpertProfileController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        specializations,
        credentials,
        experience,
        education,
        certifications,
        consultationFee,
        languages,
        bio,
        location,
        availability,
      } = req.body;

      // Check if user already has an expert profile
      const existingExpert = await Expert.findOne({ user: userId });
      if (existingExpert) {
        throw new ValidationError('Expert profile already exists', {
          user: ['You already have an expert profile. Please update your existing profile.'],
        }, createErrorContext(req));
      }

      // Create expert profile
      const expert = new Expert({
        user: userId,
        specializations,
        credentials,
        experience,
        education,
        certifications,
        consultationFee,
        languages,
        bio,
        location: location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        } : undefined,
        availability: availability || this.getDefaultAvailability(),
        status: 'pending', // Requires admin approval
        isAvailable: false, // Will be enabled after approval
        averageRating: 0,
        totalReviews: 0,
        createdAt: new Date(),
      });

      await expert.save();

      // Update user role to expert
      await User.findByIdAndUpdate(userId, {
        role: 'expert',
        expertProfile: expert._id,
      });

      // Populate for response
      const populatedExpert = await Expert.findById(expert._id)
        .populate('user', 'firstName lastName profileImage email');

      logger.info('Expert profile created', {
        expertId: expert._id.toString(),
        userId,
        specializations,
        experience,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse> = {
        success: true,
        message: 'Expert profile created successfully. Pending admin approval.',
        data: populatedExpert?.toObject() as ExpertResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateExpertProfile: UpdateExpertProfileController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId);
      if (!expert) {
        throw new NotFoundError('Expert profile not found', createErrorContext(req));
      }

      // Check ownership
      if (expert.user.toString() !== userId) {
        throw new AuthorizationError('You can only update your own expert profile', createErrorContext(req));
      }

      // Update profile
      const updatedExpert = await Expert.findByIdAndUpdate(
        expertId,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      ).populate('user', 'firstName lastName profileImage email');

      logger.info('Expert profile updated', {
        expertId,
        userId,
        updatedFields: Object.keys(updateData),
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse> = {
        success: true,
        message: 'Expert profile updated successfully',
        data: updatedExpert?.toObject() as ExpertResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public bookConsultation: BookConsultationController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        expertId,
        type,
        scheduledDate,
        timeSlot,
        problem,
        urgency = 'medium',
        attachments = [],
        consultationFee,
      } = req.body;

      // Validate expert exists and is available
      const expert = await Expert.findById(expertId)
        .populate('user', 'firstName lastName profileImage');

      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      if (expert.status !== 'approved' || !expert.isAvailable) {
        throw new BadRequestError('Expert is not available for consultations');
      }

      // Check if the time slot is available
      const scheduledDateTime = new Date(scheduledDate as string);
      const dayOfWeek = scheduledDateTime.toLocaleDateString('en', { weekday: 'lowercase' });
      
      if (type === 'scheduled') {
        const dayAvailability = expert.availability[dayOfWeek as keyof typeof expert.availability];
        
        if (!dayAvailability?.isAvailable) {
          throw new BadRequestError('Expert is not available on the selected day');
        }

        const timeSlotAvailable = dayAvailability.timeSlots?.some(slot => 
          slot.start === timeSlot && !slot.isBooked
        );

        if (!timeSlotAvailable) {
          throw new BadRequestError('Selected time slot is not available');
        }
      }

      // Create consultation (this would typically be in a Consultation model)
      const consultation = new Expert({
        type: 'consultation',
        user: userId,
        expert: expertId,
        consultationType: type,
        scheduledDate: type === 'scheduled' ? scheduledDateTime : undefined,
        timeSlot: type === 'scheduled' ? timeSlot : undefined,
        problem,
        urgency,
        attachments,
        consultationFee: consultationFee || expert.consultationFee,
        status: type === 'instant' ? 'active' : 'scheduled',
        paymentStatus: 'pending',
        createdAt: new Date(),
      });

      await consultation.save();

      // Mark time slot as booked if scheduled
      if (type === 'scheduled' && timeSlot) {
        await Expert.findOneAndUpdate(
          {
            _id: expertId,
            [`availability.${dayOfWeek}.timeSlots.start`]: timeSlot
          },
          {
            $set: { [`availability.${dayOfWeek}.timeSlots.$.isBooked`]: true }
          }
        );
      }

      // TODO: Send notification to expert
      // TODO: Create payment intent/session

      logger.info('Consultation booked', {
        consultationId: consultation._id.toString(),
        userId,
        expertId,
        type,
        urgency,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ConsultationResponse> = {
        success: true,
        message: 'Consultation booked successfully',
        data: {
          id: consultation._id.toString(),
          expert: expert,
          type,
          scheduledDate: scheduledDateTime,
          timeSlot,
          problem,
          urgency,
          consultationFee: consultation.consultationFee,
          status: consultation.status,
          paymentStatus: consultation.paymentStatus,
          createdAt: consultation.createdAt,
        } as ConsultationResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getConsultations: GetConsultationsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const {
        status,
        type,
        startDate,
        endDate,
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        type: 'consultation',
      };

      // Filter by user role
      if (userRole === 'expert') {
        // Get expert's consultations
        const expert = await Expert.findOne({ user: userId });
        if (expert) {
          filterQuery.expert = expert._id;
        }
      } else {
        // Get user's consultations
        filterQuery.user = userId;
      }

      if (status) filterQuery.status = status;
      if (type) filterQuery.consultationType = type;

      if (startDate || endDate) {
        filterQuery.createdAt = {};
        if (startDate) filterQuery.createdAt.$gte = new Date(startDate as string);
        if (endDate) filterQuery.createdAt.$lte = new Date(endDate as string);
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query (this would be from Consultation model in real implementation)
      const [consultations, total] = await Promise.all([
        Expert.find(filterQuery)
          .populate('user', 'firstName lastName profileImage')
          .populate('expert', 'user specializations averageRating')
          .populate('expert.user', 'firstName lastName profileImage')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Expert.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Consultations retrieved', {
        userId,
        userRole,
        filters: { status, type },
        resultCount: consultations.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ConsultationResponse[]> = {
        success: true,
        message: 'Consultations retrieved successfully',
        data: consultations as ConsultationResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public updateConsultation: UpdateConsultationController = async (req, res, next) => {
    try {
      const { consultationId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { status, notes, rating, review } = req.body;

      if (!mongoose.Types.ObjectId.isValid(consultationId)) {
        throw new ValidationError('Invalid consultation ID');
      }

      // This would be from Consultation model
      const consultation = await Expert.findOne({
        _id: consultationId,
        type: 'consultation',
      });

      if (!consultation) {
        throw new NotFoundError('Consultation not found', createErrorContext(req));
      }

      // Check permissions
      const canUpdate = consultation.user?.toString() === userId || 
                       (userRole === 'expert' && consultation.expert?.toString() === userId);

      if (!canUpdate) {
        throw new AuthorizationError('You do not have permission to update this consultation', createErrorContext(req));
      }

      // Update consultation
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (status) updateData.status = status;
      if (notes) updateData.notes = notes;
      
      // Handle completion
      if (status === 'completed') {
        updateData.completedAt = new Date();
        
        // Add rating and review if provided by user
        if (consultation.user?.toString() === userId && rating) {
          updateData.rating = rating;
          updateData.review = review;
          
          // Update expert's average rating
          await this.updateExpertRating(consultation.expert?.toString(), rating);
        }
      }

      const updatedConsultation = await Expert.findByIdAndUpdate(
        consultationId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('user', 'firstName lastName profileImage')
        .populate('expert', 'user specializations');

      logger.info('Consultation updated', {
        consultationId,
        userId,
        userRole,
        status,
        rating: rating || null,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ConsultationResponse> = {
        success: true,
        message: 'Consultation updated successfully',
        data: updatedConsultation?.toObject() as ConsultationResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public cancelConsultation: CancelConsultationController = async (req, res, next) => {
    try {
      const { consultationId } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(consultationId)) {
        throw new ValidationError('Invalid consultation ID');
      }

      const consultation = await Expert.findOne({
        _id: consultationId,
        type: 'consultation',
      });

      if (!consultation) {
        throw new NotFoundError('Consultation not found', createErrorContext(req));
      }

      // Check if user can cancel
      if (consultation.user?.toString() !== userId) {
        throw new AuthorizationError('You can only cancel your own consultations', createErrorContext(req));
      }

      // Check if cancellation is allowed
      if (['completed', 'cancelled'].includes(consultation.status)) {
        throw new BadRequestError('Cannot cancel completed or already cancelled consultation');
      }

      // Cancel consultation
      consultation.status = 'cancelled';
      consultation.cancellationReason = reason;
      consultation.cancelledAt = new Date();
      consultation.cancelledBy = userId;
      await consultation.save();

      // Free up time slot if it was scheduled
      if (consultation.consultationType === 'scheduled' && consultation.scheduledDate && consultation.timeSlot) {
        const dayOfWeek = consultation.scheduledDate.toLocaleDateString('en', { weekday: 'lowercase' });
        
        await Expert.findOneAndUpdate(
          {
            _id: consultation.expert,
            [`availability.${dayOfWeek}.timeSlots.start`]: consultation.timeSlot
          },
          {
            $set: { [`availability.${dayOfWeek}.timeSlots.$.isBooked`]: false }
          }
        );
      }

      // TODO: Process refund if applicable

      logger.info('Consultation cancelled', {
        consultationId,
        userId,
        reason,
        consultationType: consultation.consultationType,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Consultation cancelled successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getExpertStats: GetExpertStatsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Check if user is an expert
      const expert = await Expert.findOne({ user: userId });
      if (!expert) {
        throw new NotFoundError('Expert profile not found', createErrorContext(req));
      }

      let days: number;
      switch (period) {
        case '7d':
          days = 7;
          break;
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '1y':
          days = 365;
          break;
        default:
          days = 30;
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get consultation statistics (would be from Consultation model)
      const stats = await Expert.aggregate([
        {
          $match: {
            expert: expert._id,
            type: 'consultation',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalConsultations: { $sum: 1 },
            completedConsultations: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledConsultations: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentStatus', 'completed'] },
                  '$consultationFee',
                  0
                ]
              }
            },
            averageRating: { $avg: '$rating' },
          }
        }
      ]);

      const expertStats: ExpertStatsResponse = {
        period: period as string,
        overview: stats[0] || {
          totalConsultations: 0,
          completedConsultations: 0,
          cancelledConsultations: 0,
          totalEarnings: 0,
          averageRating: expert.averageRating || 0,
        },
        profile: {
          totalReviews: expert.totalReviews || 0,
          averageRating: expert.averageRating || 0,
          responseTime: expert.averageResponseTime || '< 1 hour',
          completionRate: stats[0] ? 
            Math.round((stats[0].completedConsultations / stats[0].totalConsultations) * 100) : 0,
        },
        earnings: {
          total: stats[0]?.totalEarnings || 0,
          average: stats[0]?.totalConsultations ? 
            Math.round((stats[0].totalEarnings / stats[0].totalConsultations) * 100) / 100 : 0,
          currency: 'USD',
        },
      };

      logger.info('Expert statistics retrieved', {
        expertId: expert._id.toString(),
        userId,
        period,
        totalConsultations: expertStats.overview.totalConsultations,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertStatsResponse> = {
        success: true,
        message: 'Expert statistics retrieved successfully',
        data: expertStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public searchExperts: SearchExpertsController = async (req, res, next) => {
    try {
      const {
        q,
        specialization,
        location,
        minRating,
        maxPrice,
        availability,
        page = '1',
        limit = '10',
        sortBy = 'rating',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {
        status: 'approved',
        isAvailable: true,
      };

      if (q) {
        searchQuery.$or = [
          { bio: new RegExp(q as string, 'i') },
          { specializations: { $in: [new RegExp(q as string, 'i')] } },
          { 'credentials.title': new RegExp(q as string, 'i') },
        ];
      }

      if (specialization) {
        searchQuery.specializations = { $in: [specialization] };
      }

      if (minRating) {
        searchQuery.averageRating = { $gte: parseFloat(minRating as string) };
      }

      if (maxPrice) {
        searchQuery.consultationFee = { $lte: parseFloat(maxPrice as string) };
      }

      if (location) {
        const [lat, lng] = (location as string).split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          searchQuery.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 100000,
            },
          };
        }
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'relevance' && q) {
        sortObj.score = { $meta: 'textScore' };
      } else {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute search
      const [experts, total] = await Promise.all([
        Expert.find(searchQuery)
          .populate('user', 'firstName lastName profileImage')
          .select('-reviews')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Expert.countDocuments(searchQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Experts searched', {
        query: q,
        filters: { specialization, location, minRating, maxPrice },
        resultCount: experts.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse[]> = {
        success: true,
        message: 'Expert search completed successfully',
        data: experts as ExpertResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getExpertReviews: GetExpertReviewsController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const { page = '1', limit = '10', rating } = req.query;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const expert = await Expert.findById(expertId);
      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      let reviewQuery: any = {};
      if (rating) {
        reviewQuery.rating = parseInt(rating as string, 10);
      }

      // Get reviews (would be from Consultation model with reviews)
      const reviews = expert.reviews || [];
      const filteredReviews = rating ? 
        reviews.filter((review: any) => review.rating === parseInt(rating as string, 10)) : 
        reviews;

      const paginatedReviews = filteredReviews.slice(skip, skip + limitNum);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total: filteredReviews.length,
        totalPages: Math.ceil(filteredReviews.length / limitNum),
        hasNextPage: pageNum < Math.ceil(filteredReviews.length / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Expert reviews retrieved', {
        expertId,
        userId: req.user?.id || 'anonymous',
        reviewCount: paginatedReviews.length,
        rating: rating || 'all',
        requestId: (req as any).id,
      });

      const response: ApiResponse<ReviewResponse[]> = {
        success: true,
        message: 'Expert reviews retrieved successfully',
        data: paginatedReviews as ReviewResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public addExpertReview: AddExpertReviewController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const userId = req.user.id;
      const { rating, review, consultationId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId);
      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      // Check if user had a consultation with this expert
      const consultation = await Expert.findOne({
        _id: consultationId,
        type: 'consultation',
        user: userId,
        expert: expertId,
        status: 'completed',
      });

      if (!consultation) {
        throw new ValidationError('You can only review experts after completing a consultation');
      }

      // Check if review already exists
      const existingReview = expert.reviews?.find((r: any) => 
        r.user.toString() === userId && r.consultation?.toString() === consultationId
      );

      if (existingReview) {
        throw new ValidationError('You have already reviewed this consultation');
      }

      // Add review
      const newReview = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(userId),
        consultation: new mongoose.Types.ObjectId(consultationId),
        rating,
        review,
        createdAt: new Date(),
      };

      expert.reviews = expert.reviews || [];
      expert.reviews.push(newReview as any);

      // Update expert's average rating
      const totalReviews = expert.reviews.length;
      const totalRating = expert.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
      expert.averageRating = totalRating / totalReviews;
      expert.totalReviews = totalReviews;

      await expert.save();

      // Populate the new review for response
      const populatedExpert = await Expert.findById(expertId)
        .populate({
          path: 'reviews',
          populate: {
            path: 'user',
            select: 'firstName lastName profileImage',
          },
          match: { _id: newReview._id },
        });

      const addedReview = populatedExpert?.reviews?.find((r: any) => 
        r._id.toString() === newReview._id.toString()
      );

      logger.info('Expert review added', {
        expertId,
        userId,
        consultationId,
        rating,
        newAverageRating: expert.averageRating,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ReviewResponse> = {
        success: true,
        message: 'Review added successfully',
        data: addedReview?.toObject() as ReviewResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getExpertAvailability: GetExpertAvailabilityController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const { date } = req.query;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId);
      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      let availability = expert.availability;

      // If specific date requested, filter for that day
      if (date) {
        const requestedDate = new Date(date as string);
        const dayOfWeek = requestedDate.toLocaleDateString('en', { weekday: 'lowercase' });
        
        availability = {
          [dayOfWeek]: expert.availability[dayOfWeek as keyof typeof expert.availability]
        } as any;
      }

      logger.info('Expert availability retrieved', {
        expertId,
        userId: req.user?.id || 'anonymous',
        date: date || 'all',
        requestId: (req as any).id,
      });

      const response: ApiResponse<AvailabilityResponse> = {
        success: true,
        message: 'Expert availability retrieved successfully',
        data: {
          expertId,
          availability,
          lastUpdated: expert.updatedAt || expert.createdAt,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public setExpertAvailability: SetExpertAvailabilityController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const userId = req.user.id;
      const { availability } = req.body;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId);
      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      // Check ownership
      if (expert.user.toString() !== userId) {
        throw new AuthorizationError('You can only update your own availability', createErrorContext(req));
      }

      // Update availability
      expert.availability = availability;
      expert.updatedAt = new Date();
      await expert.save();

      logger.info('Expert availability updated', {
        expertId,
        userId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<AvailabilityResponse> = {
        success: true,
        message: 'Availability updated successfully',
        data: {
          expertId,
          availability: expert.availability,
          lastUpdated: expert.updatedAt,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getConsultationHistory: GetConsultationHistoryController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const filterQuery: any = {
        type: 'consultation',
        status: 'completed',
      };

      if (userRole === 'expert') {
        const expert = await Expert.findOne({ user: userId });
        if (expert) {
          filterQuery.expert = expert._id;
        }
      } else {
        filterQuery.user = userId;
      }

      // Execute query (would be from Consultation model)
      const [consultations, total] = await Promise.all([
        Expert.find(filterQuery)
          .populate('user', 'firstName lastName profileImage')
          .populate('expert', 'user specializations')
          .populate('expert.user', 'firstName lastName profileImage')
          .sort({ completedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Expert.countDocuments(filterQuery),
      ]);

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Consultation history retrieved', {
        userId,
        userRole,
        count: consultations.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ConsultationResponse[]> = {
        success: true,
        message: 'Consultation history retrieved successfully',
        data: consultations as ConsultationResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public approveExpert: ApproveExpertController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const { notes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId)
        .populate('user', 'firstName lastName email');

      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      if (expert.status !== 'pending') {
        throw new BadRequestError('Expert is not pending approval');
      }

      // Approve expert
      expert.status = 'approved';
      expert.isAvailable = true;
      expert.approvedAt = new Date();
      expert.approvedBy = req.user.id;
      expert.approvalNotes = notes;
      await expert.save();

      // TODO: Send approval notification to expert

      logger.info('Expert approved', {
        expertId,
        expertName: `${expert.user.firstName} ${expert.user.lastName}`,
        approvedBy: req.user.id,
        requestId: (req as any).id,
      });

      const response: ApiResponse<ExpertResponse> = {
        success: true,
        message: 'Expert approved successfully',
        data: expert.toObject() as ExpertResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public rejectExpert: RejectExpertController = async (req, res, next) => {
    try {
      const { expertId } = req.params;
      const { reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new ValidationError('Invalid expert ID');
      }

      const expert = await Expert.findById(expertId)
        .populate('user', 'firstName lastName email');

      if (!expert) {
        throw new NotFoundError('Expert not found', createErrorContext(req));
      }

      if (expert.status !== 'pending') {
        throw new BadRequestError('Expert is not pending approval');
      }

      // Reject expert
      expert.status = 'rejected';
      expert.isAvailable = false;
      expert.rejectedAt = new Date();
      expert.rejectedBy = req.user.id;
      expert.rejectionReason = reason;
      await expert.save();

      // TODO: Send rejection notification to expert

      logger.info('Expert rejected', {
        expertId,
        expertName: `${expert.user.firstName} ${expert.user.lastName}`,
        rejectedBy: req.user.id,
        reason,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Expert application rejected',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private getDefaultAvailability(): any {
    const defaultTimeSlots = [
      { start: '09:00', end: '10:00', isBooked: false },
      { start: '10:00', end: '11:00', isBooked: false },
      { start: '11:00', end: '12:00', isBooked: false },
      { start: '14:00', end: '15:00', isBooked: false },
      { start: '15:00', end: '16:00', isBooked: false },
      { start: '16:00', end: '17:00', isBooked: false },
    ];

    return {
      monday: { isAvailable: true, timeSlots: defaultTimeSlots },
      tuesday: { isAvailable: true, timeSlots: defaultTimeSlots },
      wednesday: { isAvailable: true, timeSlots: defaultTimeSlots },
      thursday: { isAvailable: true, timeSlots: defaultTimeSlots },
      friday: { isAvailable: true, timeSlots: defaultTimeSlots },
      saturday: { isAvailable: false, timeSlots: [] },
      sunday: { isAvailable: false, timeSlots: [] },
    };
  }

  private async updateExpertRating(expertId: string, newRating: number): Promise<void> {
    const expert = await Expert.findById(expertId);
    if (!expert) return;

    // This is a simplified calculation - in production you'd want more sophisticated rating management
    const totalReviews = expert.totalReviews || 0;
    const currentAverage = expert.averageRating || 0;
    
    const newTotal = totalReviews + 1;
    const newAverage = ((currentAverage * totalReviews) + newRating) / newTotal;
    
    expert.averageRating = Math.round(newAverage * 10) / 10; // Round to 1 decimal
    expert.totalReviews = newTotal;
    
    await expert.save();
  }
}

export default new ExpertController();