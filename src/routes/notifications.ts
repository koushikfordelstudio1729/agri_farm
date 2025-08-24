import express from 'express';
import notificationController from '@/controllers/notificationController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for notification operations
const notificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per user
  message: {
    error: 'Too many notification requests. Please try again later.',
    retryAfter: 15 * 60,
  },
});

router.use(notificationRateLimit);

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', 
  validateRequest({
    query: {
      type: 'string',
      category: 'string',
      isRead: 'string|in:true,false',
      priority: 'string|in:low,medium,high',
      startDate: 'date',
      endDate: 'date',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
      sortBy: 'string|in:date,priority,type',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  notificationController.getNotifications
);

// Get specific notification by ID
router.get('/:notificationId', 
  validateRequest({
    params: { notificationId: 'required|string|mongoId' },
  }),
  notificationController.getNotification
);

// Mark notification as read/unread
router.put('/:notificationId/read', 
  validateRequest({
    params: { notificationId: 'required|string|mongoId' },
    body: {
      isRead: 'boolean',
    },
  }),
  notificationController.markNotificationRead
);

// Mark all notifications as read
router.put('/read/all', 
  validateRequest({
    body: {
      category: 'string',
      type: 'string',
    },
  }),
  notificationController.markAllNotificationsRead
);

// Delete notification
router.delete('/:notificationId', 
  validateRequest({
    params: { notificationId: 'required|string|mongoId' },
  }),
  notificationController.deleteNotification
);

// Get notification statistics
router.get('/stats/overview', 
  validateRequest({
    query: {
      period: 'string|in:7d,30d,90d',
    },
  }),
  notificationController.getNotificationStats
);

// Get notification preferences
router.get('/preferences/settings', notificationController.getNotificationPreferences);

// Update notification preferences
router.put('/preferences/settings', 
  validateRequest({
    body: {
      push: 'object',
      'push.diagnoses': 'boolean',
      'push.expertMessages': 'boolean',
      'push.communityActivity': 'boolean',
      'push.priceAlerts': 'boolean',
      'push.weatherAlerts': 'boolean',
      'push.systemUpdates': 'boolean',
      'push.marketing': 'boolean',
      email: 'object',
      'email.diagnoses': 'boolean',
      'email.expertMessages': 'boolean',
      'email.communityActivity': 'boolean',
      'email.priceAlerts': 'boolean',
      'email.weatherAlerts': 'boolean',
      'email.systemUpdates': 'boolean',
      'email.marketing': 'boolean',
      'email.weeklyDigest': 'boolean',
      sms: 'object',
      'sms.diagnoses': 'boolean',
      'sms.expertMessages': 'boolean',
      'sms.priceAlerts': 'boolean',
      'sms.weatherAlerts': 'boolean',
      'sms.criticalUpdates': 'boolean',
      inApp: 'object',
      'inApp.diagnoses': 'boolean',
      'inApp.expertMessages': 'boolean',
      'inApp.communityActivity': 'boolean',
      'inApp.priceAlerts': 'boolean',
      'inApp.weatherAlerts': 'boolean',
      'inApp.systemUpdates': 'boolean',
      quietHours: 'object',
      'quietHours.enabled': 'required|boolean',
      'quietHours.startTime': 'string', // HH:mm format
      'quietHours.endTime': 'string', // HH:mm format
      'quietHours.timezone': 'string',
      timezone: 'string',
    },
  }),
  notificationController.updateNotificationPreferences
);

// Device token management for push notifications
router.post('/devices/register', 
  validateRequest({
    body: {
      deviceToken: 'required|string|min:10',
      platform: 'required|string|in:ios,android,web',
      deviceId: 'string',
      appVersion: 'string',
    },
  }),
  notificationController.registerDevice
);

router.delete('/devices/:deviceToken', 
  validateRequest({
    params: { deviceToken: 'required|string' },
  }),
  notificationController.unregisterDevice
);

// Topic subscriptions for push notifications
router.post('/topics/subscribe', 
  validateRequest({
    body: {
      topic: 'required|string|min:3|max:100',
      deviceToken: 'string',
    },
  }),
  notificationController.subscribeToTopic
);

router.post('/topics/unsubscribe', 
  validateRequest({
    body: {
      topic: 'required|string|min:3|max:100',
      deviceToken: 'string',
    },
  }),
  notificationController.unsubscribeFromTopic
);

// Get user's topic subscriptions
router.get('/topics/subscriptions', notificationController.getTopicSubscriptions);

// Test notification (for debugging/development)
router.post('/test', 
  validateRequest({
    body: {
      type: 'string|in:push,email,sms,inApp',
      title: 'string|max:100',
      message: 'string|max:500',
      channels: 'array',
      'channels.*': 'string|in:push,email,sms,inApp',
    },
  }),
  notificationController.testNotification
);

// Snooze notifications
router.post('/snooze', 
  validateRequest({
    body: {
      duration: 'required|number|min:15|max:1440', // minutes (15 min to 24 hours)
      categories: 'array',
      'categories.*': 'string',
    },
  }),
  notificationController.snoozeNotifications
);

// Get notification templates (for customization)
router.get('/templates', 
  validateRequest({
    query: {
      category: 'string',
      language: 'string',
    },
  }),
  notificationController.getNotificationTemplates
);

// Update notification template preferences
router.put('/templates/:templateId', 
  validateRequest({
    params: { templateId: 'required|string|mongoId' },
    body: {
      enabled: 'boolean',
      customMessage: 'string|max:500',
      channels: 'array',
      'channels.*': 'string|in:push,email,sms,inApp',
    },
  }),
  notificationController.updateNotificationTemplate
);

// Get notification history with analytics
router.get('/history/analytics', 
  validateRequest({
    query: {
      period: 'string|in:7d,30d,90d,1y',
      type: 'string',
      category: 'string',
    },
  }),
  notificationController.getNotificationHistory
);

// Expert/Moderator routes
router.use('/expert', authorize(['expert', 'moderator', 'admin', 'super_admin']));

// Send notification to user (experts can notify their consultation users)
router.post('/expert/send', 
  validateRequest({
    body: {
      recipientId: 'required|string|mongoId',
      title: 'required|string|min:1|max:100',
      message: 'required|string|min:1|max:500',
      type: 'required|string',
      category: 'string',
      priority: 'string|in:low,medium,high',
      channels: 'array',
      'channels.*': 'string|in:push,email,sms,inApp',
      actionUrl: 'string|url',
      data: 'object',
    },
  }),
  notificationController.sendExpertNotification
);

// Admin routes
router.use('/admin', authorize(['admin', 'super_admin']));

// Send bulk notifications
router.post('/admin/bulk', 
  validateRequest({
    body: {
      recipients: 'required|array|min:1|max:10000',
      'recipients.*': 'required|string', // user IDs or 'all'
      title: 'required|string|min:1|max:100',
      message: 'required|string|min:1|max:1000',
      type: 'string',
      category: 'string',
      priority: 'string|in:low,medium,high',
      channels: 'required|array|min:1',
      'channels.*': 'required|string|in:push,email,sms,inApp',
      scheduledFor: 'date',
      actionUrl: 'string|url',
      relatedEntity: 'object',
    },
  }),
  notificationController.sendBulkNotification
);

// Send system-wide notification
router.post('/admin/system', 
  validateRequest({
    body: {
      recipients: 'required|string|in:all,farmers,experts,buyers',
      title: 'required|string|min:1|max:100',
      message: 'required|string|min:1|max:1000',
      type: 'required|string',
      priority: 'string|in:low,medium,high',
      channels: 'required|array|min:1',
      'channels.*': 'required|string|in:push,email,sms,inApp',
      scheduledFor: 'date',
      actionUrl: 'string|url',
    },
  }),
  notificationController.sendSystemNotification
);

// Get notification analytics for admin
router.get('/admin/analytics', 
  validateRequest({
    query: {
      period: 'string|in:day,week,month,quarter,year',
      startDate: 'date',
      endDate: 'date',
      type: 'string',
      category: 'string',
      channel: 'string|in:push,email,sms,inApp',
    },
  }),
  notificationController.getNotificationAnalytics
);

// Manage notification templates
router.get('/admin/templates', notificationController.getAllNotificationTemplates);

router.post('/admin/templates', 
  validateRequest({
    body: {
      name: 'required|string|min:3|max:100',
      category: 'required|string',
      title: 'required|string|min:1|max:200',
      message: 'required|string|min:1|max:2000',
      type: 'required|string',
      channels: 'required|array|min:1',
      'channels.*': 'required|string|in:push,email,sms,inApp',
      variables: 'array',
      'variables.*': 'string',
      isActive: 'boolean',
    },
  }),
  notificationController.createNotificationTemplate
);

router.put('/admin/templates/:templateId', 
  validateRequest({
    params: { templateId: 'required|string|mongoId' },
  }),
  notificationController.updateNotificationTemplateAdmin
);

router.delete('/admin/templates/:templateId', 
  validateRequest({
    params: { templateId: 'required|string|mongoId' },
  }),
  notificationController.deleteNotificationTemplate
);

// Manage notification settings globally
router.get('/admin/settings', notificationController.getGlobalNotificationSettings);

router.put('/admin/settings', 
  validateRequest({
    body: {
      defaultChannels: 'array',
      'defaultChannels.*': 'string|in:push,email,sms,inApp',
      maxBulkRecipients: 'number|min:100|max:100000',
      rateLimits: 'object',
      'rateLimits.perUser': 'number|min:10|max:1000',
      'rateLimits.perAdmin': 'number|min:100|max:10000',
      'rateLimits.windowMinutes': 'number|min:1|max:60',
      retentionDays: 'number|min:30|max:365',
      enableEmailDelivery: 'boolean',
      enableSmsDelivery: 'boolean',
      enablePushDelivery: 'boolean',
    },
  }),
  notificationController.updateGlobalNotificationSettings
);

// Get failed notification delivery logs
router.get('/admin/failures', 
  validateRequest({
    query: {
      channel: 'string|in:push,email,sms,inApp',
      startDate: 'date',
      endDate: 'date',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  notificationController.getFailedNotifications
);

// Retry failed notifications
router.post('/admin/retry', 
  validateRequest({
    body: {
      notificationIds: 'required|array|min:1|max:1000',
      'notificationIds.*': 'required|string|mongoId',
    },
  }),
  notificationController.retryFailedNotifications
);

// Cleanup old notifications
router.delete('/admin/cleanup', 
  validateRequest({
    body: {
      olderThanDays: 'required|number|min:30|max:365',
      categories: 'array',
      'categories.*': 'string',
      onlyRead: 'boolean',
    },
  }),
  notificationController.cleanupOldNotifications
);

// Export notification data
router.post('/admin/export', 
  validateRequest({
    body: {
      format: 'required|string|in:csv,xlsx,json',
      startDate: 'date',
      endDate: 'date',
      filters: 'object',
    },
  }),
  notificationController.exportNotificationData
);

// Notification service health check
router.get('/admin/health', notificationController.getNotificationServiceHealth);

export default router;