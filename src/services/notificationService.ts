import admin from 'firebase-admin';
import { logger } from '@/utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { UserPreferences } from '@/models/UserPreferences';
import {
  NotificationServiceConfig,
  NotificationPayload,
  SendNotificationOptions,
  SendNotificationResult,
  BulkNotificationOptions,
  BulkNotificationResult,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  PushNotificationData,
  NotificationTemplate,
} from './notificationService.types';

export class NotificationService {
  private config: NotificationServiceConfig;
  private firebaseApp?: admin.app.App;

  constructor() {
    this.config = {
      fcm: {
        serverKey: process.env.FCM_SERVER_KEY as string,
        senderId: process.env.FCM_SENDER_ID as string,
      },
      email: {
        enabled: !!process.env.EMAIL_SERVICE,
        service: process.env.EMAIL_SERVICE as string,
      },
      sms: {
        enabled: !!process.env.SMS_SERVICE,
        service: process.env.SMS_SERVICE as string,
      },
      defaultChannels: ['inApp', 'push'],
      batchSize: 100,
      retryAttempts: 3,
    };

    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (this.config.fcm.serverKey && process.env.FIREBASE_PROJECT_ID) {
        const serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        }, 'notifications');

        logger.info('Firebase initialized for notifications');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase for notifications', { error });
    }
  }

  public async sendNotification(
    userId: string | string[],
    payload: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<SendNotificationResult> {
    try {
      const userIds = Array.isArray(userId) ? userId : [userId];
      
      // Validate users exist
      const users = await User.find({ _id: { $in: userIds } }).select('_id email phoneNumber deviceTokens');
      if (users.length === 0) {
        return {
          success: false,
          error: 'No valid recipients found',
        };
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(userIds);
      
      // Store notification in database
      const notifications = await this.storeNotifications(users, payload, options);
      
      // Filter channels based on user preferences and options
      const effectiveChannels = options.channels || this.config.defaultChannels;
      const filteredChannels = await this.filterChannelsByPreferences(
        effectiveChannels,
        preferences,
        payload.type
      );

      // Send through each channel
      const results = await this.sendThroughChannels(
        users,
        payload,
        filteredChannels,
        options
      );

      // Update notification delivery status
      await this.updateDeliveryStatus(notifications, results);

      const totalSent = results.reduce((sum, result) => sum + (result.success ? 1 : 0), 0);

      logger.info('Notification sent', {
        recipients: userIds.length,
        channels: filteredChannels,
        type: payload.type,
        priority: payload.priority,
        totalSent,
      });

      return {
        success: totalSent > 0,
        notificationIds: notifications.map(n => n._id.toString()),
        deliveredChannels: filteredChannels,
        totalRecipients: users.length,
        successfulDeliveries: totalSent,
      };
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        payload: payload.title,
        recipients: Array.isArray(userId) ? userId.length : 1,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async sendBulkNotifications(options: BulkNotificationOptions): Promise<BulkNotificationResult> {
    try {
      const results: SendNotificationResult[] = [];
      const batchSize = options.batchSize || this.config.batchSize;

      // Process recipients in batches
      for (let i = 0; i < options.recipients.length; i += batchSize) {
        const batch = options.recipients.slice(i, i + batchSize);
        
        const batchPromises = batch.map(recipient => 
          this.sendNotification(recipient.userId, options.payload, {
            ...options.options,
            personalizedData: recipient.personalizedData,
          })
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason.message || 'Unknown error',
            });
          }
        });

        // Add delay between batches to avoid overwhelming services
        if (i + batchSize < options.recipients.length) {
          await this.delay(1000);
        }
      }

      const successfulDeliveries = results.filter(r => r.success).length;
      const failedDeliveries = results.filter(r => !r.success).length;

      logger.info('Bulk notification completed', {
        totalRecipients: options.recipients.length,
        successful: successfulDeliveries,
        failed: failedDeliveries,
        type: options.payload.type,
      });

      return {
        success: successfulDeliveries > 0,
        totalRecipients: options.recipients.length,
        successfulDeliveries,
        failedDeliveries,
        results,
      };
    } catch (error) {
      logger.error('Bulk notification failed', { error: error.message });
      return {
        success: false,
        totalRecipients: options.recipients.length,
        successfulDeliveries: 0,
        failedDeliveries: options.recipients.length,
        error: error.message,
        results: [],
      };
    }
  }

  public async sendPushNotification(
    deviceTokens: string[],
    payload: NotificationPayload,
    data?: PushNotificationData
  ): Promise<{ success: boolean; results: any[]; errors: any[] }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = this.firebaseApp.messaging();
      const validTokens = deviceTokens.filter(token => token && token.length > 0);

      if (validTokens.length === 0) {
        return { success: false, results: [], errors: ['No valid device tokens'] };
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.message,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          category: payload.category || 'general',
          priority: payload.priority || 'medium',
          actionUrl: payload.actionUrl || '',
          ...data,
        },
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channelId: this.getAndroidChannelId(payload.category || 'general'),
            priority: payload.priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: payload.category || 'general',
            },
          },
        },
      };

      let results: any[] = [];
      let errors: any[] = [];

      // Send to multiple tokens
      if (validTokens.length === 1) {
        try {
          const response = await messaging.send({
            ...message,
            token: validTokens[0],
          });
          results.push(response);
        } catch (error) {
          errors.push({ token: validTokens[0], error: error.message });
        }
      } else {
        try {
          const response = await messaging.sendMulticast({
            ...message,
            tokens: validTokens,
          });
          
          results = response.responses;
          
          // Collect errors
          response.responses.forEach((result, index) => {
            if (!result.success) {
              errors.push({
                token: validTokens[index],
                error: result.error?.message || 'Unknown error',
              });
            }
          });

          // Handle invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((result, index) => {
              if (result.error?.code === 'messaging/invalid-registration-token' ||
                  result.error?.code === 'messaging/registration-token-not-registered') {
                invalidTokens.push(validTokens[index]);
              }
            });

            if (invalidTokens.length > 0) {
              await this.removeInvalidTokens(invalidTokens);
            }
          }
        } catch (error) {
          errors.push({ error: error.message });
        }
      }

      const successCount = results.filter(r => r.success !== false).length;

      logger.info('Push notification sent', {
        totalTokens: validTokens.length,
        successful: successCount,
        failed: errors.length,
        title: payload.title,
      });

      return {
        success: successCount > 0,
        results,
        errors,
      };
    } catch (error) {
      logger.error('Push notification failed', { error: error.message });
      return {
        success: false,
        results: [],
        errors: [error.message],
      };
    }
  }

  public async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = this.firebaseApp.messaging();
      await messaging.subscribeToTopic([deviceToken], topic);

      logger.info('Subscribed to topic', { deviceToken: deviceToken.substring(0, 20) + '...', topic });
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to topic', { error: error.message, topic });
      return false;
    }
  }

  public async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = this.firebaseApp.messaging();
      await messaging.unsubscribeFromTopic([deviceToken], topic);

      logger.info('Unsubscribed from topic', { deviceToken: deviceToken.substring(0, 20) + '...', topic });
      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', { error: error.message, topic });
      return false;
    }
  }

  public async sendToTopic(topic: string, payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const messaging = this.firebaseApp.messaging();
      
      const message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.message,
        },
        data: {
          type: payload.type,
          category: payload.category || 'general',
          actionUrl: payload.actionUrl || '',
        },
      };

      const response = await messaging.send(message);
      logger.info('Topic notification sent', { topic, messageId: response });
      return true;
    } catch (error) {
      logger.error('Failed to send topic notification', { error: error.message, topic });
      return false;
    }
  }

  // Template-based notifications
  public async sendTemplateNotification(
    userId: string | string[],
    templateName: string,
    variables: Record<string, any> = {},
    options: SendNotificationOptions = {}
  ): Promise<SendNotificationResult> {
    try {
      const template = await this.getNotificationTemplate(templateName);
      if (!template) {
        throw new Error(`Notification template not found: ${templateName}`);
      }

      const payload = this.renderNotificationTemplate(template, variables);
      return this.sendNotification(userId, payload, options);
    } catch (error) {
      logger.error('Template notification failed', {
        error: error.message,
        template: templateName,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Predefined notification methods
  public async sendWelcomeNotification(userId: string): Promise<SendNotificationResult> {
    return this.sendTemplateNotification(userId, 'welcome', {}, {
      channels: ['inApp', 'push'],
    });
  }

  public async sendDiagnosisCompleteNotification(
    userId: string,
    diagnosisId: string,
    diseaseName: string
  ): Promise<SendNotificationResult> {
    return this.sendTemplateNotification(userId, 'diagnosis_complete', {
      diagnosisId,
      diseaseName,
      diagnosisUrl: `${process.env.FRONTEND_URL}/diagnosis/${diagnosisId}`,
    }, {
      channels: ['inApp', 'push', 'email'],
      priority: 'high',
    });
  }

  public async sendExpertConsultationNotification(
    expertId: string,
    consultationId: string,
    userProblem: string
  ): Promise<SendNotificationResult> {
    return this.sendTemplateNotification(expertId, 'expert_consultation', {
      consultationId,
      userProblem,
      consultationUrl: `${process.env.FRONTEND_URL}/consultation/${consultationId}`,
    }, {
      channels: ['inApp', 'push', 'email'],
      priority: 'high',
    });
  }

  public async sendPriceAlertNotification(
    userId: string,
    cropName: string,
    currentPrice: number,
    threshold: number
  ): Promise<SendNotificationResult> {
    return this.sendTemplateNotification(userId, 'price_alert', {
      cropName,
      currentPrice,
      threshold,
      changePercent: Math.round(((currentPrice - threshold) / threshold) * 100),
    }, {
      channels: ['inApp', 'push'],
      priority: 'medium',
    });
  }

  // Helper methods
  private async storeNotifications(
    users: any[],
    payload: NotificationPayload,
    options: SendNotificationOptions
  ): Promise<any[]> {
    const notifications = users.map(user => ({
      recipient: user._id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      category: payload.category || 'general',
      priority: payload.priority || 'medium',
      channels: options.channels || this.config.defaultChannels,
      data: payload.data,
      actionUrl: payload.actionUrl,
      scheduledFor: options.scheduleFor,
      createdAt: new Date(),
    }));

    return Notification.insertMany(notifications);
  }

  private async getUserPreferences(userIds: string[]): Promise<Record<string, any>> {
    const preferences = await UserPreferences.find({ user: { $in: userIds } });
    const preferencesMap: Record<string, any> = {};
    
    preferences.forEach(pref => {
      preferencesMap[pref.user.toString()] = pref;
    });

    return preferencesMap;
  }

  private async filterChannelsByPreferences(
    channels: NotificationChannel[],
    preferences: Record<string, any>,
    notificationType: NotificationType
  ): Promise<NotificationChannel[]> {
    // This would filter channels based on user preferences
    // For now, return all requested channels
    return channels;
  }

  private async sendThroughChannels(
    users: any[],
    payload: NotificationPayload,
    channels: NotificationChannel[],
    options: SendNotificationOptions
  ): Promise<Array<{ success: boolean; channel: NotificationChannel; error?: string }>> {
    const results: Array<{ success: boolean; channel: NotificationChannel; error?: string }> = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'push':
            const deviceTokens = users.flatMap(user => user.deviceTokens || []);
            const pushResult = await this.sendPushNotification(deviceTokens, payload);
            results.push({ success: pushResult.success, channel });
            break;

          case 'email':
            if (this.config.email.enabled) {
              for (const user of users) {
                if (user.email) {
                  const emailResult = await emailService.sendEmail({
                    to: user.email,
                    subject: payload.title,
                    html: `<h2>${payload.title}</h2><p>${payload.message}</p>`,
                    text: payload.message,
                  });
                  results.push({ success: emailResult.success, channel, error: emailResult.error });
                }
              }
            }
            break;

          case 'sms':
            if (this.config.sms.enabled) {
              for (const user of users) {
                if (user.phoneNumber) {
                  const smsResult = await smsService.sendSms({
                    to: user.phoneNumber,
                    message: `${payload.title}: ${payload.message}`,
                  });
                  results.push({ success: smsResult.success, channel, error: smsResult.error });
                }
              }
            }
            break;

          case 'inApp':
            // In-app notifications are stored in database, consider them successful
            results.push({ success: true, channel });
            break;
        }
      } catch (error) {
        results.push({ success: false, channel, error: error.message });
      }
    }

    return results;
  }

  private async updateDeliveryStatus(notifications: any[], results: any[]): Promise<void> {
    // Update notification delivery status in database
    const successfulDeliveries = results.filter(r => r.success).length;
    const deliveryStatus = successfulDeliveries > 0 ? 'delivered' : 'failed';

    await Notification.updateMany(
      { _id: { $in: notifications.map(n => n._id) } },
      {
        deliveryStatus,
        deliveredAt: successfulDeliveries > 0 ? new Date() : undefined,
        failedAt: successfulDeliveries === 0 ? new Date() : undefined,
        deliveryAttempts: 1,
      }
    );
  }

  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    // Remove invalid tokens from user documents
    await User.updateMany(
      { deviceTokens: { $in: tokens } },
      { $pullAll: { deviceTokens: tokens } }
    );

    logger.info('Removed invalid device tokens', { count: tokens.length });
  }

  private getAndroidChannelId(category: string): string {
    const channelMap: Record<string, string> = {
      diagnosis: 'diagnosis_alerts',
      expert: 'expert_notifications',
      community: 'community_updates',
      market: 'price_alerts',
      weather: 'weather_alerts',
      system: 'system_notifications',
    };

    return channelMap[category] || 'default_notifications';
  }

  private async getNotificationTemplate(templateName: string): Promise<NotificationTemplate | null> {
    // This would fetch templates from database or configuration
    const templates: Record<string, NotificationTemplate> = {
      welcome: {
        title: 'Welcome to Plantix!',
        message: 'Start your smart farming journey with AI-powered plant diagnosis.',
        type: 'system',
        category: 'welcome',
      },
      diagnosis_complete: {
        title: 'Your plant diagnosis is ready! 🌱',
        message: 'We found {{diseaseName}} with high confidence. Check your results now.',
        type: 'diagnosis',
        category: 'diagnosis',
        actionUrl: '{{diagnosisUrl}}',
      },
      expert_consultation: {
        title: 'New consultation request 👨‍🌾',
        message: 'A farmer needs your expertise: {{userProblem}}',
        type: 'consultation',
        category: 'expert',
        actionUrl: '{{consultationUrl}}',
      },
      price_alert: {
        title: '💰 Price Alert: {{cropName}}',
        message: 'Price changed by {{changePercent}}%! Current: ${{currentPrice}}',
        type: 'price_alert',
        category: 'market',
      },
    };

    return templates[templateName] || null;
  }

  private renderNotificationTemplate(template: NotificationTemplate, variables: Record<string, any>): NotificationPayload {
    const renderString = (str: string): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key]?.toString() || match;
      });
    };

    return {
      title: renderString(template.title),
      message: renderString(template.message),
      type: template.type,
      category: template.category,
      actionUrl: template.actionUrl ? renderString(template.actionUrl) : undefined,
      data: variables,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const notificationService = new NotificationService();