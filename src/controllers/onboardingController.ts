import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { OnboardingStep } from '@/models/OnboardingStep';
import { OnboardingProgress } from '@/models/OnboardingProgress';
import { OnboardingTutorial } from '@/models/OnboardingTutorial';
import { User } from '@/models/User';
import { UserPreferences } from '@/models/UserPreferences';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  StartOnboardingRequest,
  GetOnboardingStepsRequest,
  UpdateOnboardingStepRequest,
  GetOnboardingProgressRequest,
  CompleteOnboardingRequest,
  SkipOnboardingRequest,
  RestartOnboardingRequest,
  GetOnboardingTutorialsRequest,
  MarkTutorialCompletedRequest,
  GetOnboardingStatsRequest,
  UpdateOnboardingFlowRequest,
  GetUserOnboardingDataRequest,
  OnboardingStepResponse,
  OnboardingProgressResponse,
  OnboardingTutorialResponse,
  OnboardingStatsResponse,
  UserOnboardingDataResponse,
  StartOnboardingController,
  GetOnboardingStepsController,
  UpdateOnboardingStepController,
  GetOnboardingProgressController,
  CompleteOnboardingController,
  SkipOnboardingController,
  RestartOnboardingController,
  GetOnboardingTutorialsController,
  MarkTutorialCompletedController,
  GetOnboardingStatsController,
  UpdateOnboardingFlowController,
  GetUserOnboardingDataController,
} from './onboardingController.types';

export class OnboardingController {
  public startOnboarding: StartOnboardingController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { deviceInfo, referralCode, source } = req.body;

      // Check if onboarding already exists
      let existingOnboarding = await OnboardingProgress.findOne({ user: userId });
      
      if (existingOnboarding && existingOnboarding.isCompleted) {
        throw new ValidationError('Onboarding already completed for this user');
      }

      // Get user type to determine applicable steps
      const user = await User.findById(userId).select('userType');
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Get onboarding steps for user type
      const steps = await OnboardingStep.find({
        userTypes: { $in: [user.userType] },
        isActive: true,
      }).sort({ order: 1 });

      if (steps.length === 0) {
        throw new ValidationError('No onboarding steps configured for this user type');
      }

      // Create or update onboarding progress
      const onboardingData = {
        user: userId,
        totalSteps: steps.length,
        currentStepId: steps[0].stepId,
        steps: steps.map(step => ({
          stepId: step.stepId,
          isCompleted: false,
          data: {},
        })),
        deviceInfo,
        referralCode,
        source,
        isStarted: true,
        startedAt: new Date(),
        lastActiveAt: new Date(),
      };

      const onboardingProgress = existingOnboarding 
        ? await OnboardingProgress.findByIdAndUpdate(
            existingOnboarding._id,
            onboardingData,
            { new: true, runValidators: true }
          )
        : await OnboardingProgress.create(onboardingData);

      // Build response with step details
      const progressResponse = await this.buildProgressResponse(onboardingProgress, steps);

      logger.info('Onboarding started', {
        userId,
        totalSteps: steps.length,
        userType: user.userType,
        deviceInfo,
        referralCode,
        source,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingProgressResponse> = {
        success: true,
        message: 'Onboarding started successfully',
        data: progressResponse,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getOnboardingSteps: GetOnboardingStepsController = async (req, res, next) => {
    try {
      const { userType } = req.query;
      const currentUserType = userType || req.user.userType;

      const steps = await OnboardingStep.find({
        userTypes: { $in: [currentUserType] },
        isActive: true,
      }).sort({ order: 1 });

      // Get user's progress for these steps
      const userId = req.user.id;
      const progress = await OnboardingProgress.findOne({ user: userId });

      const stepsWithProgress = steps.map(step => {
        const userStepProgress = progress?.steps?.find(s => s.stepId === step.stepId);
        
        return {
          _id: step._id,
          stepId: step.stepId,
          title: step.title,
          description: step.description,
          order: step.order,
          isRequired: step.isRequired,
          userTypes: step.userTypes,
          fields: step.fields,
          isCompleted: userStepProgress?.isCompleted || false,
          data: userStepProgress?.data || {},
          completedAt: userStepProgress?.completedAt,
        } as OnboardingStepResponse;
      });

      logger.info('Onboarding steps retrieved', {
        userId,
        userType: currentUserType,
        stepCount: stepsWithProgress.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingStepResponse[]> = {
        success: true,
        message: 'Onboarding steps retrieved successfully',
        data: stepsWithProgress,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateOnboardingStep: UpdateOnboardingStepController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { stepId } = req.params;
      const { data, isCompleted = false } = req.body;

      // Get onboarding progress
      const progress = await OnboardingProgress.findOne({ 
        user: userId,
        isCompleted: false,
      });

      if (!progress) {
        throw new NotFoundError('Onboarding progress not found', createErrorContext(req));
      }

      // Validate step exists and is applicable to user
      const step = await OnboardingStep.findOne({
        stepId,
        userTypes: { $in: [req.user.userType] },
        isActive: true,
      });

      if (!step) {
        throw new NotFoundError('Onboarding step not found', createErrorContext(req));
      }

      // Validate step data against field requirements
      const validationResult = this.validateStepData(step, data);
      if (!validationResult.isValid) {
        throw new ValidationError('Invalid step data', validationResult.errors, createErrorContext(req));
      }

      // Update step in progress
      const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
      if (stepIndex === -1) {
        throw new NotFoundError('Step not found in user progress', createErrorContext(req));
      }

      progress.steps[stepIndex].data = data;
      progress.steps[stepIndex].isCompleted = isCompleted;
      if (isCompleted) {
        progress.steps[stepIndex].completedAt = new Date();
        progress.completedSteps = progress.steps.filter(s => s.isCompleted).length;
        progress.progressPercentage = Math.round((progress.completedSteps / progress.totalSteps) * 100);
      }
      
      progress.lastActiveAt = new Date();
      
      // Update current step if this step is completed and there's a next step
      if (isCompleted) {
        const nextStep = await OnboardingStep.findOne({
          userTypes: { $in: [req.user.userType] },
          order: { $gt: step.order },
          isActive: true,
        }).sort({ order: 1 });

        if (nextStep) {
          progress.currentStepId = nextStep.stepId;
        }
      }

      await progress.save();

      // Build step response
      const stepResponse: OnboardingStepResponse = {
        _id: step._id,
        stepId: step.stepId,
        title: step.title,
        description: step.description,
        order: step.order,
        isRequired: step.isRequired,
        userTypes: step.userTypes,
        fields: step.fields,
        isCompleted,
        data,
        completedAt: isCompleted ? new Date() : undefined,
      };

      logger.info('Onboarding step updated', {
        userId,
        stepId,
        isCompleted,
        progressPercentage: progress.progressPercentage,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingStepResponse> = {
        success: true,
        message: 'Onboarding step updated successfully',
        data: stepResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getOnboardingProgress: GetOnboardingProgressController = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const progress = await OnboardingProgress.findOne({ user: userId });
      
      if (!progress) {
        throw new NotFoundError('Onboarding progress not found', createErrorContext(req));
      }

      // Get step definitions
      const steps = await OnboardingStep.find({
        userTypes: { $in: [req.user.userType] },
        isActive: true,
      }).sort({ order: 1 });

      const progressResponse = await this.buildProgressResponse(progress, steps);

      logger.info('Onboarding progress retrieved', {
        userId,
        isCompleted: progress.isCompleted,
        progressPercentage: progress.progressPercentage,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingProgressResponse> = {
        success: true,
        message: 'Onboarding progress retrieved successfully',
        data: progressResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public completeOnboarding: CompleteOnboardingController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { preferences, profile, interests } = req.body;

      // Get onboarding progress
      const progress = await OnboardingProgress.findOne({ 
        user: userId,
        isCompleted: false,
      });

      if (!progress) {
        throw new NotFoundError('Onboarding progress not found', createErrorContext(req));
      }

      // Check if all required steps are completed
      const requiredSteps = await OnboardingStep.find({
        userTypes: { $in: [req.user.userType] },
        isRequired: true,
        isActive: true,
      });

      const completedRequiredSteps = progress.steps.filter(step => 
        step.isCompleted && requiredSteps.some(req => req.stepId === step.stepId)
      );

      if (completedRequiredSteps.length < requiredSteps.length) {
        throw new ValidationError('Not all required onboarding steps are completed');
      }

      // Update user profile with onboarding data
      await User.findByIdAndUpdate(userId, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        farmSize: profile.farmSize,
        farmLocation: profile.farmLocation,
        cropsOfInterest: profile.cropsOfInterest,
        experienceLevel: profile.experienceLevel,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      });

      // Create/update user preferences
      await UserPreferences.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          notifications: preferences.notifications,
          language: preferences.language,
          units: preferences.units,
          theme: preferences.theme,
          interests,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Complete onboarding progress
      const completedAt = new Date();
      const timeToComplete = this.calculateTimeToComplete(progress.startedAt, completedAt);

      progress.isCompleted = true;
      progress.completedAt = completedAt;
      progress.completedSteps = progress.totalSteps;
      progress.progressPercentage = 100;
      progress.timeToComplete = timeToComplete;
      await progress.save();

      logger.info('Onboarding completed', {
        userId,
        timeToComplete,
        totalSteps: progress.totalSteps,
        preferences,
        interests,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{
        isCompleted: boolean;
        completedAt: Date;
        timeToComplete: string;
      }> = {
        success: true,
        message: 'Onboarding completed successfully',
        data: {
          isCompleted: true,
          completedAt,
          timeToComplete,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public skipOnboarding: SkipOnboardingController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { reason } = req.body;

      // Get onboarding progress
      const progress = await OnboardingProgress.findOne({ 
        user: userId,
        isCompleted: false,
      });

      if (!progress) {
        throw new NotFoundError('Onboarding progress not found', createErrorContext(req));
      }

      // Mark as skipped
      progress.isSkipped = true;
      progress.skipReason = reason;
      progress.skippedAt = new Date();
      progress.isCompleted = true; // Consider skipped as completed
      progress.completedAt = new Date();
      await progress.save();

      // Update user
      await User.findByIdAndUpdate(userId, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingSkipped: true,
      });

      logger.info('Onboarding skipped', {
        userId,
        reason,
        completedSteps: progress.completedSteps,
        totalSteps: progress.totalSteps,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ isSkipped: boolean; reason?: string }> = {
        success: true,
        message: 'Onboarding skipped successfully',
        data: {
          isSkipped: true,
          reason,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public restartOnboarding: RestartOnboardingController = async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Delete existing progress
      await OnboardingProgress.findOneAndDelete({ user: userId });

      // Reset user onboarding flags
      await User.findByIdAndUpdate(userId, {
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        onboardingSkipped: false,
      });

      // Start fresh onboarding
      const startRequest = {
        ...req,
        body: {},
      } as StartOnboardingRequest;

      return this.startOnboarding(startRequest, res, next);
    } catch (error) {
      next(error);
    }
  };

  public getOnboardingTutorials: GetOnboardingTutorialsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { category, feature } = req.query;

      const filterQuery: any = { isActive: true };
      if (category) filterQuery.category = category;
      if (feature) filterQuery.feature = feature;

      const tutorials = await OnboardingTutorial.find(filterQuery)
        .sort({ category: 1, order: 1 })
        .lean();

      // Get user's completion status for tutorials
      const user = await User.findById(userId).select('completedTutorials');
      const completedTutorialIds = user?.completedTutorials || [];

      const tutorialsWithProgress: OnboardingTutorialResponse[] = tutorials.map(tutorial => ({
        _id: tutorial._id,
        tutorialId: tutorial.tutorialId,
        title: tutorial.title,
        description: tutorial.description,
        category: tutorial.category,
        feature: tutorial.feature,
        order: tutorial.order,
        duration: tutorial.duration,
        mediaUrl: tutorial.mediaUrl,
        content: tutorial.content,
        isCompleted: completedTutorialIds.includes(tutorial.tutorialId),
        completedAt: completedTutorialIds.includes(tutorial.tutorialId) ? new Date() : undefined,
      }));

      logger.info('Onboarding tutorials retrieved', {
        userId,
        category,
        feature,
        tutorialCount: tutorials.length,
        completedCount: tutorialsWithProgress.filter(t => t.isCompleted).length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingTutorialResponse[]> = {
        success: true,
        message: 'Onboarding tutorials retrieved successfully',
        data: tutorialsWithProgress,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public markTutorialCompleted: MarkTutorialCompletedController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { tutorialId } = req.params;

      // Verify tutorial exists
      const tutorial = await OnboardingTutorial.findOne({ 
        tutorialId,
        isActive: true,
      });

      if (!tutorial) {
        throw new NotFoundError('Tutorial not found', createErrorContext(req));
      }

      // Update user's completed tutorials
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      if (!user.completedTutorials) {
        user.completedTutorials = [];
      }

      if (!user.completedTutorials.includes(tutorialId)) {
        user.completedTutorials.push(tutorialId);
        await user.save();
      }

      const completedAt = new Date();

      logger.info('Tutorial marked as completed', {
        userId,
        tutorialId,
        tutorialTitle: tutorial.title,
        completedAt,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ isCompleted: boolean; completedAt: Date }> = {
        success: true,
        message: 'Tutorial marked as completed successfully',
        data: {
          isCompleted: true,
          completedAt,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getOnboardingStats: GetOnboardingStatsController = async (req, res, next) => {
    try {
      const { period = '30d', userType } = req.query;

      // Calculate date range
      const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Build user filter
      const userFilter: any = { createdAt: { $gte: startDate } };
      if (userType) userFilter.userType = userType;

      // Get users in period
      const users = await User.find(userFilter).select('_id userType createdAt onboardingCompleted onboardingSkipped');
      const userIds = users.map(u => u._id);

      // Get onboarding progress data
      const progressData = await OnboardingProgress.find({
        user: { $in: userIds },
      });

      // Calculate overview stats
      const totalUsers = users.length;
      const startedOnboarding = progressData.filter(p => p.isStarted).length;
      const completedOnboarding = progressData.filter(p => p.isCompleted && !p.isSkipped).length;
      const skippedOnboarding = progressData.filter(p => p.isSkipped).length;
      const completionRate = startedOnboarding > 0 ? Math.round((completedOnboarding / startedOnboarding) * 100) : 0;
      
      // Calculate average time to complete
      const completedWithTime = progressData.filter(p => p.isCompleted && p.timeToComplete);
      const avgTimeToComplete = this.calculateAverageTimeToComplete(completedWithTime);

      // Stats by user type
      const userTypes = [...new Set(users.map(u => u.userType))];
      const byUserType = userTypes.map(type => {
        const typeUsers = users.filter(u => u.userType === type);
        const typeProgress = progressData.filter(p => 
          typeUsers.some(u => u._id.toString() === p.user.toString())
        );
        const typeStarted = typeProgress.filter(p => p.isStarted).length;
        const typeCompleted = typeProgress.filter(p => p.isCompleted && !p.isSkipped).length;

        return {
          userType: type,
          started: typeStarted,
          completed: typeCompleted,
          completionRate: typeStarted > 0 ? Math.round((typeCompleted / typeStarted) * 100) : 0,
        };
      });

      // Get step stats
      const steps = await OnboardingStep.find({ isActive: true });
      const byStep = steps.map(step => {
        const stepStarted = progressData.filter(p => 
          p.steps.some(s => s.stepId === step.stepId)
        ).length;
        const stepCompleted = progressData.filter(p => 
          p.steps.some(s => s.stepId === step.stepId && s.isCompleted)
        ).length;
        const dropOffRate = stepStarted > 0 ? Math.round(((stepStarted - stepCompleted) / stepStarted) * 100) : 0;

        return {
          stepId: step.stepId,
          stepTitle: step.title,
          started: stepStarted,
          completed: stepCompleted,
          dropOffRate,
        };
      });

      // Calculate drop-off points (steps with highest abandon rates)
      const dropOffPoints = byStep
        .filter(s => s.dropOffRate > 0)
        .sort((a, b) => b.dropOffRate - a.dropOffRate)
        .slice(0, 5)
        .map(s => ({
          stepId: s.stepId,
          stepTitle: s.stepTitle,
          dropOffCount: s.started - s.completed,
          dropOffRate: s.dropOffRate,
        }));

      // Generate daily trends
      const daily = [];
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayStarted = progressData.filter(p => 
          p.startedAt && p.startedAt >= dayStart && p.startedAt <= dayEnd
        ).length;
        const dayCompleted = progressData.filter(p => 
          p.completedAt && p.completedAt >= dayStart && p.completedAt <= dayEnd && !p.isSkipped
        ).length;

        daily.push({
          date: dateStr,
          started: dayStarted,
          completed: dayCompleted,
        });
      }

      const stats: OnboardingStatsResponse = {
        period,
        overview: {
          totalUsers,
          startedOnboarding,
          completedOnboarding,
          skippedOnboarding,
          completionRate,
          averageTimeToComplete: avgTimeToComplete,
        },
        byUserType,
        byStep,
        dropOffPoints,
        trends: { daily },
      };

      logger.info('Onboarding statistics retrieved', {
        period,
        userType,
        totalUsers,
        completionRate,
        requestId: (req as any).id,
      });

      const response: ApiResponse<OnboardingStatsResponse> = {
        success: true,
        message: 'Onboarding statistics retrieved successfully',
        data: stats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateOnboardingFlow: UpdateOnboardingFlowController = async (req, res, next) => {
    try {
      const { steps } = req.body;

      // Validate admin permissions
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        throw new AuthorizationError('Insufficient permissions to update onboarding flow');
      }

      // Delete existing steps
      await OnboardingStep.deleteMany({});

      // Create new steps
      const newSteps = steps.map(step => ({
        ...step,
        createdBy: req.user.id,
        createdAt: new Date(),
        isActive: true,
      }));

      await OnboardingStep.insertMany(newSteps);

      logger.info('Onboarding flow updated', {
        updatedBy: req.user.id,
        stepCount: steps.length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ updatedSteps: number }> = {
        success: true,
        message: 'Onboarding flow updated successfully',
        data: {
          updatedSteps: steps.length,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getUserOnboardingData: GetUserOnboardingDataController = async (req, res, next) => {
    try {
      const { userId } = req.params;

      // Validate admin permissions or own data access
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.id !== userId) {
        throw new AuthorizationError('Insufficient permissions to access this user data');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID');
      }

      // Get user data
      const user = await User.findById(userId)
        .select('firstName lastName email userType profileImage farmSize farmLocation cropsOfInterest experienceLevel')
        .lean();

      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Get onboarding progress
      const progress = await OnboardingProgress.findOne({ user: userId });
      const steps = await OnboardingStep.find({
        userTypes: { $in: [user.userType] },
        isActive: true,
      }).sort({ order: 1 });

      // Get preferences
      const preferences = await UserPreferences.findOne({ user: userId }) || {
        notifications: { push: true, email: true, sms: false },
        language: 'en',
        units: 'metric',
        theme: 'light',
        interests: {
          diagnostics: true,
          community: true,
          marketplace: true,
          weather: true,
          expertConsultation: true,
        },
      };

      const onboardingData: OnboardingProgressResponse = progress 
        ? await this.buildProgressResponse(progress, steps)
        : {
            userId: user._id,
            isStarted: false,
            isCompleted: false,
            totalSteps: steps.length,
            completedSteps: 0,
            progressPercentage: 0,
            steps: [],
          };

      const userOnboardingData: UserOnboardingDataResponse = {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          profileImage: user.profileImage,
        },
        onboarding: onboardingData,
        profile: {
          farmSize: user.farmSize,
          farmLocation: user.farmLocation,
          cropsOfInterest: user.cropsOfInterest,
          experienceLevel: user.experienceLevel,
        },
        preferences: {
          notifications: preferences.notifications,
          language: preferences.language,
          units: preferences.units,
          theme: preferences.theme,
        },
        interests: preferences.interests,
      };

      logger.info('User onboarding data retrieved', {
        requestedUserId: userId,
        requestedBy: req.user.id,
        isCompleted: onboardingData.isCompleted,
        requestId: (req as any).id,
      });

      const response: ApiResponse<UserOnboardingDataResponse> = {
        success: true,
        message: 'User onboarding data retrieved successfully',
        data: userOnboardingData,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private validateStepData(step: any, data: any): { isValid: boolean; errors: any } {
    const errors: any = {};
    
    for (const field of step.fields) {
      const value = data[field.name];
      
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = [`${field.label} is required`];
        continue;
      }

      if (value !== undefined && field.validation) {
        const validation = field.validation;
        
        if (validation.min && typeof value === 'number' && value < validation.min) {
          errors[field.name] = [`${field.label} must be at least ${validation.min}`];
        }
        
        if (validation.max && typeof value === 'number' && value > validation.max) {
          errors[field.name] = [`${field.label} must be at most ${validation.max}`];
        }
        
        if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
          errors[field.name] = [validation.message || `${field.label} has invalid format`];
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private async buildProgressResponse(
    progress: any, 
    stepDefinitions: any[]
  ): Promise<OnboardingProgressResponse> {
    const steps = stepDefinitions.map(stepDef => {
      const userStep = progress.steps?.find((s: any) => s.stepId === stepDef.stepId);
      
      return {
        _id: stepDef._id,
        stepId: stepDef.stepId,
        title: stepDef.title,
        description: stepDef.description,
        order: stepDef.order,
        isRequired: stepDef.isRequired,
        userTypes: stepDef.userTypes,
        fields: stepDef.fields,
        isCompleted: userStep?.isCompleted || false,
        data: userStep?.data || {},
        completedAt: userStep?.completedAt,
      } as OnboardingStepResponse;
    });

    return {
      userId: progress.user,
      isStarted: progress.isStarted,
      isCompleted: progress.isCompleted,
      currentStepId: progress.currentStepId,
      totalSteps: progress.totalSteps,
      completedSteps: progress.completedSteps,
      progressPercentage: progress.progressPercentage,
      steps,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      lastActiveAt: progress.lastActiveAt,
      deviceInfo: progress.deviceInfo,
      source: progress.source,
      referralCode: progress.referralCode,
      timeToComplete: progress.timeToComplete,
    };
  }

  private calculateTimeToComplete(startedAt: Date, completedAt: Date): string {
    const diffMs = completedAt.getTime() - startedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  private calculateAverageTimeToComplete(progressData: any[]): string {
    if (progressData.length === 0) return '0m';

    const totalMinutes = progressData.reduce((sum, p) => {
      if (!p.timeToComplete) return sum;
      
      // Parse time string like "1d 2h 30m" or "2h 30m" or "30m"
      const timeStr = p.timeToComplete;
      let minutes = 0;
      
      const dayMatch = timeStr.match(/(\d+)d/);
      const hourMatch = timeStr.match(/(\d+)h/);
      const minuteMatch = timeStr.match(/(\d+)m/);
      
      if (dayMatch) minutes += parseInt(dayMatch[1]) * 24 * 60;
      if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
      if (minuteMatch) minutes += parseInt(minuteMatch[1]);
      
      return sum + minutes;
    }, 0);

    const avgMinutes = Math.round(totalMinutes / progressData.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

export default new OnboardingController();