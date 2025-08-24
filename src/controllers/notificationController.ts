import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  createErrorContext,
} from '@/utils/errors';
import { ApiResponse, PaginationResponse } from '@/types/common.types';
import {
  AuthenticatedRequest,
  GetNotificationsRequest,
  GetNotificationRequest,
  MarkNotificationReadRequest,
  MarkAllNotificationsReadRequest,
  DeleteNotificationRequest,
  GetNotificationStatsRequest,
  UpdateNotificationPreferencesRequest,
  GetNotificationPreferencesRequest,
  SendBulkNotificationRequest,
  SubscribeToTopicRequest,
  UnsubscribeFromTopicRequest,
  TestNotificationRequest,
  NotificationResponse,
  NotificationStatsResponse,
  NotificationPreferencesResponse,
  GetNotificationsController,
  GetNotificationController,
  MarkNotificationReadController,
  MarkAllNotificationsReadController,
  DeleteNotificationController,
  GetNotificationStatsController,
  UpdateNotificationPreferencesController,
  GetNotificationPreferencesController,
  SendBulkNotificationController,
  SubscribeToTopicController,
  UnsubscribeFromTopicController,
  TestNotificationController,
} from './notificationController.types';

export class NotificationController {
  public getNotifications: GetNotificationsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        type,
        category,
        isRead,
        priority,
        startDate,
        endDate,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filterQuery: any = {
        recipient: userId,
        isDeleted: false,
      };

      if (type) filterQuery.type = type;
      if (category) filterQuery.category = category;
      if (isRead !== undefined) filterQuery.isRead = isRead === 'true';
      if (priority) filterQuery.priority = priority;

      if (startDate || endDate) {
        filterQuery.createdAt = {};
        if (startDate) filterQuery.createdAt.$gte = new Date(startDate as string);
        if (endDate) filterQuery.createdAt.$lte = new Date(endDate as string);
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [notifications, total] = await Promise.all([
        Notification.find(filterQuery)
          .populate('sender', 'firstName lastName profileImage')
          .populate('relatedEntity.crop', 'name scientificName')
          .populate('relatedEntity.diagnosis', 'status confidence')
          .populate('relatedEntity.post', 'title type')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notification.countDocuments(filterQuery),
      ]);

      // Mark as delivered if not already
      await Notification.updateMany(
        {
          recipient: userId,
          deliveryStatus: 'pending',
          _id: { $in: notifications.map(n => n._id) }
        },
        {
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
        }
      );

      const pagination: PaginationResponse = {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      };

      logger.info('Notifications retrieved', {
        userId,
        filters: { type, category, isRead, priority },
        resultCount: notifications.length,
        unreadCount: notifications.filter(n => !n.isRead).length,
        requestId: (req as any).id,
      });

      const response: ApiResponse<NotificationResponse[]> = {
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications as NotificationResponse[],
      };

      res.json({ ...response, pagination });
    } catch (error) {
      next(error);
    }
  };

  public getNotification: GetNotificationController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ValidationError('Invalid notification ID');
      }

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
        isDeleted: false,
      })
        .populate('sender', 'firstName lastName profileImage')
        .populate('relatedEntity.crop', 'name scientificName image')
        .populate('relatedEntity.diagnosis', 'status confidence results')
        .populate('relatedEntity.post', 'title content type author')
        .populate('relatedEntity.expert', 'user specializations')
        .lean();

      if (!notification) {
        throw new NotFoundError('Notification not found', createErrorContext(req));
      }

      // Mark as read if not already
      if (!notification.isRead) {
        await Notification.findByIdAndUpdate(notificationId, {
          isRead: true,
          readAt: new Date(),
        });
        notification.isRead = true;
        notification.readAt = new Date();
      }

      logger.info('Notification details retrieved', {
        notificationId,
        userId,
        type: notification.type,
        category: notification.category,
        wasUnread: !notification.isRead,
        requestId: (req as any).id,
      });

      const response: ApiResponse<NotificationResponse> = {
        success: true,
        message: 'Notification retrieved successfully',
        data: notification as NotificationResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public markNotificationRead: MarkNotificationReadController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;
      const { isRead = true } = req.body;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ValidationError('Invalid notification ID');
      }

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
        isDeleted: false,
      });

      if (!notification) {
        throw new NotFoundError('Notification not found', createErrorContext(req));
      }

      // Update read status
      notification.isRead = isRead;
      if (isRead) {
        notification.readAt = new Date();
      } else {
        notification.readAt = undefined;
      }
      await notification.save();

      logger.info('Notification read status updated', {
        notificationId,
        userId,
        isRead,
        type: notification.type,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ isRead: boolean; readAt?: Date }> = {
        success: true,
        message: `Notification marked as ${isRead ? 'read' : 'unread'}`,
        data: {
          isRead: notification.isRead,
          readAt: notification.readAt,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public markAllNotificationsRead: MarkAllNotificationsReadController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { category, type } = req.body;

      const filterQuery: any = {
        recipient: userId,
        isRead: false,
        isDeleted: false,
      };

      if (category) filterQuery.category = category;
      if (type) filterQuery.type = type;

      const result = await Notification.updateMany(
        filterQuery,
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      logger.info('Bulk notifications marked as read', {
        userId,
        filters: { category, type },
        updatedCount: result.modifiedCount,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ updatedCount: number }> = {
        success: true,
        message: 'All notifications marked as read',
        data: {
          updatedCount: result.modifiedCount,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteNotification: DeleteNotificationController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ValidationError('Invalid notification ID');
      }

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
      });

      if (!notification) {
        throw new NotFoundError('Notification not found', createErrorContext(req));
      }

      // Soft delete
      notification.isDeleted = true;
      notification.deletedAt = new Date();
      await notification.save();

      logger.info('Notification deleted', {
        notificationId,
        userId,
        type: notification.type,
        category: notification.category,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{}> = {
        success: true,
        message: 'Notification deleted successfully',
        data: {},
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getNotificationStats: GetNotificationStatsController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

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
        default:
          days = 30;
      }

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Notification.aggregate([
        {
          $match: {
            recipient: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            isDeleted: false,
          }
        },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            unreadNotifications: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            },
            highPriorityNotifications: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            },
            deliveredNotifications: {
              $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] }
            },
          }
        }
      ]);

      const categoryStats = await Notification.aggregate([
        {
          $match: {
            recipient: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            isDeleted: false,
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const typeStats = await Notification.aggregate([
        {
          $match: {
            recipient: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            isDeleted: false,
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const notificationStats: NotificationStatsResponse = {
        period: period as string,
        overview: stats[0] || {
          totalNotifications: 0,
          unreadNotifications: 0,
          highPriorityNotifications: 0,
          deliveredNotifications: 0,
        },
        byCategory: categoryStats,
        byType: typeStats,
        deliveryRate: stats[0] ? 
          Math.round((stats[0].deliveredNotifications / stats[0].totalNotifications) * 100) : 0,
        readRate: stats[0] ? 
          Math.round(((stats[0].totalNotifications - stats[0].unreadNotifications) / stats[0].totalNotifications) * 100) : 0,
      };

      logger.info('Notification statistics retrieved', {
        userId,
        period,
        totalNotifications: notificationStats.overview.totalNotifications,
        unreadCount: notificationStats.overview.unreadNotifications,
        requestId: (req as any).id,
      });

      const response: ApiResponse<NotificationStatsResponse> = {
        success: true,
        message: 'Notification statistics retrieved successfully',
        data: notificationStats,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateNotificationPreferences: UpdateNotificationPreferencesController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Update notification preferences
      const updateFields: any = {};
      
      if (preferences.push !== undefined) {
        Object.keys(preferences.push).forEach(key => {
          updateFields[`notificationPreferences.push.${key}`] = preferences.push[key];
        });
      }

      if (preferences.email !== undefined) {
        Object.keys(preferences.email).forEach(key => {
          updateFields[`notificationPreferences.email.${key}`] = preferences.email[key];
        });
      }

      if (preferences.sms !== undefined) {
        Object.keys(preferences.sms).forEach(key => {
          updateFields[`notificationPreferences.sms.${key}`] = preferences.sms[key];
        });
      }

      if (preferences.inApp !== undefined) {
        Object.keys(preferences.inApp).forEach(key => {
          updateFields[`notificationPreferences.inApp.${key}`] = preferences.inApp[key];
        });
      }

      if (preferences.quietHours !== undefined) {
        updateFields['notificationPreferences.quietHours'] = preferences.quietHours;
      }

      if (preferences.timezone !== undefined) {
        updateFields['notificationPreferences.timezone'] = preferences.timezone;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true }
      ).select('notificationPreferences');

      logger.info('Notification preferences updated', {
        userId,
        updatedCategories: Object.keys(preferences),
        requestId: (req as any).id,
      });

      const response: ApiResponse<NotificationPreferencesResponse> = {
        success: true,
        message: 'Notification preferences updated successfully',
        data: updatedUser?.notificationPreferences as NotificationPreferencesResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getNotificationPreferences: GetNotificationPreferencesController = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('notificationPreferences');
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      logger.info('Notification preferences retrieved', {
        userId,
        requestId: (req as any).id,
      });

      const response: ApiResponse<NotificationPreferencesResponse> = {
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: user.notificationPreferences as NotificationPreferencesResponse,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public sendBulkNotification: SendBulkNotificationController = async (req, res, next) => {
    try {
      const {
        recipients,
        title,
        message,
        type = 'announcement',
        category = 'general',
        priority = 'medium',
        channels = ['push'],
        scheduledFor,
        relatedEntity,
      } = req.body;

      // Validate recipients
      if (!recipients || recipients.length === 0) {
        throw new ValidationError('Recipients are required');
      }

      const recipientUsers = await User.find({
        _id: { $in: recipients },
        isActive: true,
      }).select('_id notificationPreferences');

      if (recipientUsers.length === 0) {
        throw new ValidationError('No valid recipients found');
      }

      // Create notifications for each recipient
      const notifications = recipientUsers.map(user => ({
        recipient: user._id,
        sender: req.user.id,
        type,
        category,
        title,
        message,
        priority,
        channels,
        relatedEntity,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        deliveryStatus: scheduledFor ? 'scheduled' : 'pending',
        createdAt: new Date(),
      }));

      const createdNotifications = await Notification.insertMany(notifications);

      // TODO: Trigger actual notification delivery based on channels
      // this.triggerNotificationDelivery(createdNotifications, channels);

      logger.info('Bulk notification sent', {
        senderId: req.user.id,
        recipientCount: recipientUsers.length,
        type,
        category,
        priority,
        channels,
        scheduledFor: scheduledFor || 'immediate',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ 
        notificationIds: string[];
        recipientCount: number;
        scheduledFor?: Date;
      }> = {
        success: true,
        message: 'Bulk notification sent successfully',
        data: {
          notificationIds: createdNotifications.map(n => n._id.toString()),
          recipientCount: recipientUsers.length,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public subscribeToTopic: SubscribeToTopicController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { topic, deviceToken } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Add topic to user's subscribed topics
      const subscriptions = user.notificationSubscriptions || [];
      const existingSubscription = subscriptions.find(sub => sub.topic === topic);

      if (existingSubscription) {
        // Update device token if provided
        if (deviceToken) {
          existingSubscription.deviceTokens = existingSubscription.deviceTokens || [];
          if (!existingSubscription.deviceTokens.includes(deviceToken)) {
            existingSubscription.deviceTokens.push(deviceToken);
          }
        }
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
      } else {
        subscriptions.push({
          topic,
          deviceTokens: deviceToken ? [deviceToken] : [],
          isActive: true,
          subscribedAt: new Date(),
        });
      }

      await User.findByIdAndUpdate(userId, {
        notificationSubscriptions: subscriptions,
      });

      // TODO: Subscribe to topic using FCM or other push service
      // await this.fcmService.subscribeToTopic(deviceToken, topic);

      logger.info('User subscribed to notification topic', {
        userId,
        topic,
        deviceToken: deviceToken ? 'provided' : 'none',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ topic: string; subscribed: boolean }> = {
        success: true,
        message: `Subscribed to topic: ${topic}`,
        data: {
          topic,
          subscribed: true,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public unsubscribeFromTopic: UnsubscribeFromTopicController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { topic, deviceToken } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', createErrorContext(req));
      }

      // Remove topic or device token from subscriptions
      const subscriptions = user.notificationSubscriptions || [];
      const subscriptionIndex = subscriptions.findIndex(sub => sub.topic === topic);

      if (subscriptionIndex === -1) {
        throw new ValidationError('Not subscribed to this topic');
      }

      if (deviceToken) {
        // Remove specific device token
        const subscription = subscriptions[subscriptionIndex];
        subscription.deviceTokens = subscription.deviceTokens?.filter(token => token !== deviceToken) || [];
        
        if (subscription.deviceTokens.length === 0) {
          subscription.isActive = false;
        }
      } else {
        // Unsubscribe completely
        subscriptions[subscriptionIndex].isActive = false;
        subscriptions[subscriptionIndex].unsubscribedAt = new Date();
      }

      await User.findByIdAndUpdate(userId, {
        notificationSubscriptions: subscriptions,
      });

      // TODO: Unsubscribe from topic using FCM or other push service
      // await this.fcmService.unsubscribeFromTopic(deviceToken, topic);

      logger.info('User unsubscribed from notification topic', {
        userId,
        topic,
        deviceToken: deviceToken ? 'specific' : 'all',
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ topic: string; subscribed: boolean }> = {
        success: true,
        message: `Unsubscribed from topic: ${topic}`,
        data: {
          topic,
          subscribed: false,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public testNotification: TestNotificationController = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        type = 'test',
        title = 'Test Notification',
        message = 'This is a test notification to verify your notification settings.',
        channels = ['push'],
      } = req.body;

      // Create test notification
      const notification = new Notification({
        recipient: userId,
        sender: userId,
        type,
        category: 'test',
        title,
        message,
        priority: 'low',
        channels,
        deliveryStatus: 'pending',
        isTest: true,
        createdAt: new Date(),
      });

      await notification.save();

      // TODO: Trigger immediate delivery
      // await this.notificationService.deliverNotification(notification);

      // Mark as delivered for testing
      notification.deliveryStatus = 'delivered';
      notification.deliveredAt = new Date();
      await notification.save();

      logger.info('Test notification sent', {
        userId,
        notificationId: notification._id.toString(),
        channels,
        requestId: (req as any).id,
      });

      const response: ApiResponse<{ 
        notificationId: string;
        deliveryStatus: string;
        channels: string[];
      }> = {
        success: true,
        message: 'Test notification sent successfully',
        data: {
          notificationId: notification._id.toString(),
          deliveryStatus: notification.deliveryStatus,
          channels,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // Helper method to create notification
  public async createNotification(data: {
    recipient: string;
    sender?: string;
    type: string;
    category: string;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high';
    channels?: string[];
    relatedEntity?: any;
    scheduledFor?: Date;
  }): Promise<any> {
    const notification = new Notification({
      ...data,
      deliveryStatus: data.scheduledFor ? 'scheduled' : 'pending',
      createdAt: new Date(),
    });

    await notification.save();

    // TODO: Trigger delivery if not scheduled
    if (!data.scheduledFor) {
      // await this.deliverNotification(notification);
    }

    return notification;
  }
}

export default new NotificationController();