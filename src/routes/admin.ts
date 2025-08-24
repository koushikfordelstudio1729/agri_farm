import express from 'express';
import adminController from '@/controllers/adminController';
import { authenticate, authorize } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { uploadMiddleware } from '@/middleware/upload';
import { rateLimit } from '@/middleware/rateLimit';

const router = express.Router();

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window for admins
  message: {
    error: 'Too many admin requests. Please try again later.',
    retryAfter: 15 * 60,
  },
});

router.use(adminRateLimit);

// All admin routes require authentication
router.use(authenticate);

// Admin and Super Admin routes
router.use(authorize(['admin', 'super_admin']));

// Dashboard and Analytics
router.get('/dashboard', 
  validateRequest({
    query: {
      period: 'string|in:today,week,month,quarter,year',
      timezone: 'string',
    },
  }),
  adminController.getDashboardOverview
);

router.get('/analytics/users', 
  validateRequest({
    query: {
      startDate: 'date',
      endDate: 'date',
      userType: 'string|in:farmer,buyer,expert',
      location: 'string',
      groupBy: 'string|in:day,week,month',
    },
  }),
  adminController.getUserAnalytics
);

router.get('/analytics/diagnoses', 
  validateRequest({
    query: {
      startDate: 'date',
      endDate: 'date',
      accuracy: 'string|in:high,medium,low',
      crop: 'string|mongoId',
      disease: 'string|mongoId',
    },
  }),
  adminController.getDiagnosisAnalytics
);

router.get('/analytics/revenue', 
  validateRequest({
    query: {
      startDate: 'date',
      endDate: 'date',
      source: 'string|in:consultations,premium,marketplace',
      groupBy: 'string|in:day,week,month',
    },
  }),
  adminController.getRevenueAnalytics
);

router.get('/analytics/engagement', 
  validateRequest({
    query: {
      startDate: 'date',
      endDate: 'date',
      feature: 'string|in:community,market,weather,experts',
    },
  }),
  adminController.getEngagementAnalytics
);

// User Management
router.get('/users', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
      search: 'string',
      userType: 'string|in:farmer,buyer,expert,admin',
      status: 'string|in:active,inactive,suspended,pending',
      registrationDate: 'string|in:today,week,month,year',
      sortBy: 'string|in:date,name,email,lastActive',
      sortOrder: 'string|in:asc,desc',
    },
  }),
  adminController.getUsers
);

router.get('/users/:userId', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
  }),
  adminController.getUserDetails
);

router.put('/users/:userId', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    body: {
      status: 'string|in:active,inactive,suspended',
      role: 'string|in:farmer,buyer,expert,admin',
      notes: 'string|max:1000',
    },
  }),
  adminController.updateUser
);

router.post('/users/:userId/suspend', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|min:10|max:1000',
      duration: 'number|min:1|max:365', // days
      notifyUser: 'boolean',
    },
  }),
  adminController.suspendUser
);

router.post('/users/:userId/activate', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    body: {
      notes: 'string|max:1000',
    },
  }),
  adminController.activateUser
);

router.delete('/users/:userId', 
  validateRequest({
    params: { userId: 'required|string|mongoId' },
    body: {
      reason: 'required|string|min:10|max:1000',
      permanentDelete: 'boolean',
    },
  }),
  adminController.deleteUser
);

// Content Management
router.get('/content/reports', 
  validateRequest({
    query: {
      type: 'string|in:post,comment,user,diagnosis',
      status: 'string|in:pending,reviewed,resolved',
      priority: 'string|in:low,medium,high',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getContentReports
);

router.put('/content/reports/:reportId', 
  validateRequest({
    params: { reportId: 'required|string|mongoId' },
    body: {
      action: 'required|string|in:approve,remove,warn,ban_user',
      reason: 'string|max:1000',
      notes: 'string|max:1000',
    },
  }),
  adminController.moderateContent
);

router.get('/content/flagged', 
  validateRequest({
    query: {
      type: 'string|in:post,comment,image',
      autoFlagged: 'boolean',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getFlaggedContent
);

// System Configuration
router.get('/config', adminController.getSystemConfig);

router.put('/config', 
  validateRequest({
    body: {
      maintenanceMode: 'boolean',
      allowRegistration: 'boolean',
      requireEmailVerification: 'boolean',
      maxFileUploadSize: 'number|min:1|max:100', // MB
      diagnosisConfig: 'object',
      'diagnosisConfig.aiThreshold': 'number|between:0,1',
      'diagnosisConfig.requireExpertReview': 'boolean',
      'diagnosisConfig.maxImagesPerDiagnosis': 'number|min:1|max:10',
      communityConfig: 'object',
      'communityConfig.allowAnonymousPosts': 'boolean',
      'communityConfig.requirePostModeration': 'boolean',
      'communityConfig.maxPostsPerDay': 'number|min:1|max:100',
      marketConfig: 'object',
      'marketConfig.priceUpdateInterval': 'number|min:5|max:1440', // minutes
      'marketConfig.dataRetentionDays': 'number|min:30|max:365',
    },
  }),
  adminController.updateSystemConfig
);

// Feature Flags
router.get('/features', adminController.getFeatureFlags);

router.put('/features/:featureName', 
  validateRequest({
    params: { featureName: 'required|string' },
    body: {
      enabled: 'required|boolean',
      rolloutPercentage: 'number|between:0,100',
      targetUsers: 'array',
      'targetUsers.*': 'string',
    },
  }),
  adminController.updateFeatureFlag
);

// API Management
router.get('/api/keys', 
  validateRequest({
    query: {
      active: 'boolean',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getApiKeys
);

router.post('/api/keys', 
  validateRequest({
    body: {
      name: 'required|string|min:3|max:100',
      permissions: 'required|array|min:1',
      'permissions.*': 'required|string',
      rateLimit: 'object',
      'rateLimit.requests': 'number|min:10|max:10000',
      'rateLimit.windowMs': 'number|min:60000|max:86400000', // 1 min to 24 hours
      expiresAt: 'date',
    },
  }),
  adminController.createApiKey
);

router.put('/api/keys/:keyId', 
  validateRequest({
    params: { keyId: 'required|string|mongoId' },
  }),
  adminController.updateApiKey
);

router.delete('/api/keys/:keyId', 
  validateRequest({
    params: { keyId: 'required|string|mongoId' },
  }),
  adminController.deleteApiKey
);

router.get('/api/usage', 
  validateRequest({
    query: {
      keyId: 'string|mongoId',
      startDate: 'date',
      endDate: 'date',
      endpoint: 'string',
    },
  }),
  adminController.getApiUsage
);

// Database Management
router.get('/database/stats', adminController.getDatabaseStats);

router.post('/database/backup', 
  validateRequest({
    body: {
      collections: 'array',
      'collections.*': 'string',
      compress: 'boolean',
    },
  }),
  adminController.createDatabaseBackup
);

router.get('/database/backups', 
  validateRequest({
    query: {
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  adminController.getBackupHistory
);

router.post('/database/restore/:backupId', 
  validateRequest({
    params: { backupId: 'required|string|mongoId' },
  }),
  adminController.restoreDatabase
);

router.post('/database/cleanup', 
  validateRequest({
    body: {
      olderThan: 'required|number|min:30', // days
      collections: 'array',
      'collections.*': 'string',
      dryRun: 'boolean',
    },
  }),
  adminController.cleanupOldData
);

// System Health and Monitoring
router.get('/health', adminController.getSystemHealth);

router.get('/logs', 
  validateRequest({
    query: {
      level: 'string|in:error,warn,info,debug',
      service: 'string',
      startDate: 'date',
      endDate: 'date',
      search: 'string',
      page: 'number|min:1',
      limit: 'number|min:1|max:1000',
    },
  }),
  adminController.getSystemLogs
);

router.get('/performance', 
  validateRequest({
    query: {
      metric: 'string|in:response_time,memory,cpu,database',
      period: 'string|in:hour,day,week,month',
    },
  }),
  adminController.getPerformanceMetrics
);

// Notification Management
router.get('/notifications/templates', 
  validateRequest({
    query: {
      type: 'string|in:email,sms,push',
      active: 'boolean',
    },
  }),
  adminController.getNotificationTemplates
);

router.post('/notifications/send', 
  validateRequest({
    body: {
      recipients: 'required|array|min:1|max:10000',
      'recipients.*': 'required|string', // user IDs or 'all'
      title: 'required|string|min:1|max:100',
      message: 'required|string|min:1|max:1000',
      channels: 'required|array|min:1',
      'channels.*': 'required|string|in:push,email,sms,inApp',
      scheduledFor: 'date',
      priority: 'string|in:low,medium,high',
    },
  }),
  adminController.sendBulkNotification
);

router.get('/notifications/history', 
  validateRequest({
    query: {
      type: 'string|in:email,sms,push,inApp',
      status: 'string|in:sent,failed,pending',
      startDate: 'date',
      endDate: 'date',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getNotificationHistory
);

// Security Management
router.get('/security/attempts', 
  validateRequest({
    query: {
      type: 'string|in:login,password_reset,email_change',
      status: 'string|in:success,failed,blocked',
      startDate: 'date',
      endDate: 'date',
      ip: 'string',
      userId: 'string|mongoId',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getSecurityAttempts
);

router.post('/security/ip/block', 
  validateRequest({
    body: {
      ip: 'required|string',
      reason: 'required|string|min:10|max:500',
      duration: 'number|min:1|max:8760', // hours
      permanent: 'boolean',
    },
  }),
  adminController.blockIpAddress
);

router.delete('/security/ip/block/:ip', 
  validateRequest({
    params: { ip: 'required|string' },
  }),
  adminController.unblockIpAddress
);

router.get('/security/blocked-ips', 
  validateRequest({
    query: {
      active: 'boolean',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getBlockedIps
);

// Export and Reporting
router.post('/export/users', 
  validateRequest({
    body: {
      format: 'required|string|in:csv,xlsx,json',
      filters: 'object',
      includeFields: 'array',
      'includeFields.*': 'string',
    },
  }),
  adminController.exportUsers
);

router.post('/export/diagnoses', 
  validateRequest({
    body: {
      format: 'required|string|in:csv,xlsx,json',
      startDate: 'date',
      endDate: 'date',
      crop: 'string|mongoId',
      accuracy: 'string|in:high,medium,low',
    },
  }),
  adminController.exportDiagnoses
);

router.post('/reports/generate', 
  validateRequest({
    body: {
      type: 'required|string|in:user_activity,system_performance,revenue,engagement',
      period: 'required|string|in:week,month,quarter,year',
      format: 'string|in:pdf,excel,json',
      recipients: 'array',
      'recipients.*': 'string|email',
    },
  }),
  adminController.generateReport
);

router.get('/reports/history', 
  validateRequest({
    query: {
      type: 'string|in:user_activity,system_performance,revenue,engagement',
      page: 'number|min:1',
      limit: 'number|min:1|max:50',
    },
  }),
  adminController.getReportHistory
);

// Super Admin only routes
router.use('/super', authorize(['super_admin']));

// Admin User Management
router.get('/super/admins', 
  validateRequest({
    query: {
      active: 'boolean',
      page: 'number|min:1',
      limit: 'number|min:1|max:100',
    },
  }),
  adminController.getAdminUsers
);

router.post('/super/admins', 
  validateRequest({
    body: {
      email: 'required|string|email',
      firstName: 'required|string|min:1|max:50',
      lastName: 'required|string|min:1|max:50',
      role: 'required|string|in:admin,super_admin',
      permissions: 'array',
      'permissions.*': 'string',
    },
  }),
  adminController.createAdminUser
);

router.put('/super/admins/:adminId', 
  validateRequest({
    params: { adminId: 'required|string|mongoId' },
  }),
  adminController.updateAdminUser
);

router.delete('/super/admins/:adminId', 
  validateRequest({
    params: { adminId: 'required|string|mongoId' },
  }),
  adminController.deleteAdminUser
);

// System-wide Settings
router.get('/super/settings', adminController.getGlobalSettings);

router.put('/super/settings', 
  validateRequest({
    body: {
      systemName: 'string|min:3|max:100',
      supportEmail: 'string|email',
      maxUsersPerOrg: 'number|min:1|max:100000',
      globalRateLimit: 'object',
      'globalRateLimit.requests': 'number|min:100|max:100000',
      'globalRateLimit.windowMs': 'number|min:60000|max:86400000',
      securitySettings: 'object',
      'securitySettings.sessionTimeout': 'number|min:300|max:86400', // seconds
      'securitySettings.passwordPolicy': 'object',
      'securitySettings.twoFactorRequired': 'boolean',
    },
  }),
  adminController.updateGlobalSettings
);

// License and Billing Management
router.get('/super/license', adminController.getLicenseInfo);

router.get('/super/billing', 
  validateRequest({
    query: {
      startDate: 'date',
      endDate: 'date',
    },
  }),
  adminController.getBillingInfo
);

// Advanced System Operations
router.post('/super/maintenance/start', 
  validateRequest({
    body: {
      message: 'string|max:500',
      estimatedDuration: 'number|min:1|max:1440', // minutes
    },
  }),
  adminController.startMaintenanceMode
);

router.post('/super/maintenance/end', adminController.endMaintenanceMode);

router.post('/super/cache/clear', 
  validateRequest({
    body: {
      cacheTypes: 'array',
      'cacheTypes.*': 'string|in:redis,memory,database,cdn',
    },
  }),
  adminController.clearSystemCache
);

router.post('/super/system/restart', 
  validateRequest({
    body: {
      services: 'array',
      'services.*': 'string',
      graceful: 'boolean',
    },
  }),
  adminController.restartServices
);

// Advanced Analytics and Insights
router.get('/super/analytics/overview', adminController.getSuperAdminAnalytics);

router.get('/super/analytics/predictions', 
  validateRequest({
    query: {
      metric: 'required|string|in:user_growth,revenue,usage',
      period: 'string|in:week,month,quarter,year',
    },
  }),
  adminController.getPredictiveAnalytics
);

export default router;