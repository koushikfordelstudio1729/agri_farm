import { Request, Response } from 'express';
import { 
  NotificationResponse,
  UpdateNotificationPreferencesRequest,
  NotificationPreferencesResponse,
  RegisterDeviceRequest,
  SubscribeToTopicRequest,
  TestNotificationRequest,
  SnoozeNotificationsRequest,
  UpdateNotificationTemplateRequest,
  SendExpertNotificationRequest,
  SendBulkNotificationRequest,
  SendSystemNotificationRequest,
  CreateNotificationTemplateRequest,
  GlobalNotificationSettingsRequest
} from '@/controllers/notificationController.types';

// Route parameter types
export interface NotificationParamsWithId {
  notificationId: string;
}

export interface DeviceTokenParams {
  deviceToken: string;
}

export interface TemplateParamsWithId {
  templateId: string;
}

export interface IpAddressParams {
  ip: string;
}

// Query parameter types
export interface GetNotificationsQuery {
  type?: string;
  category?: string;
  isRead?: 'true' | 'false';
  priority?: 'low' | 'medium' | 'high';
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
  sortBy?: 'date' | 'priority' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface GetNotificationStatsQuery {
  period?: '7d' | '30d' | '90d';
}

export interface GetNotificationTemplatesQuery {
  category?: string;
  language?: string;
}

export interface GetNotificationHistoryQuery {
  period?: '7d' | '30d' | '90d' | '1y';
  type?: string;
  category?: string;
}

export interface GetNotificationAnalyticsQuery {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  channel?: 'push' | 'email' | 'sms' | 'inApp';
}

export interface GetFailedNotificationsQuery {
  channel?: 'push' | 'email' | 'sms' | 'inApp';
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
}

// Express request types
export interface GetNotificationsRequestHandler extends Request<{}, NotificationResponse[], {}, GetNotificationsQuery> {}
export interface GetNotificationRequestHandler extends Request<NotificationParamsWithId, NotificationResponse> {}
export interface MarkNotificationReadRequestHandler extends Request<NotificationParamsWithId, any, { isRead?: boolean }> {}
export interface MarkAllNotificationsReadRequestHandler extends Request<{}, any, { category?: string; type?: string }> {}
export interface DeleteNotificationRequestHandler extends Request<NotificationParamsWithId, any> {}

export interface GetNotificationStatsRequestHandler extends Request<{}, any, {}, GetNotificationStatsQuery> {}
export interface GetNotificationPreferencesRequestHandler extends Request<{}, NotificationPreferencesResponse> {}
export interface UpdateNotificationPreferencesRequestHandler extends Request<{}, NotificationPreferencesResponse, UpdateNotificationPreferencesRequest> {}

export interface RegisterDeviceRequestHandler extends Request<{}, any, RegisterDeviceRequest> {}
export interface UnregisterDeviceRequestHandler extends Request<DeviceTokenParams, any> {}

export interface SubscribeToTopicRequestHandler extends Request<{}, any, SubscribeToTopicRequest> {}
export interface UnsubscribeFromTopicRequestHandler extends Request<{}, any, SubscribeToTopicRequest> {}
export interface GetTopicSubscriptionsRequestHandler extends Request<{}, any> {}

export interface TestNotificationRequestHandler extends Request<{}, any, TestNotificationRequest> {}
export interface SnoozeNotificationsRequestHandler extends Request<{}, any, SnoozeNotificationsRequest> {}

export interface GetNotificationTemplatesRequestHandler extends Request<{}, any[], {}, GetNotificationTemplatesQuery> {}
export interface UpdateNotificationTemplateRequestHandler extends Request<TemplateParamsWithId, any, UpdateNotificationTemplateRequest> {}

export interface GetNotificationHistoryRequestHandler extends Request<{}, any, {}, GetNotificationHistoryQuery> {}

export interface SendExpertNotificationRequestHandler extends Request<{}, any, SendExpertNotificationRequest> {}
export interface SendBulkNotificationRequestHandler extends Request<{}, any, SendBulkNotificationRequest> {}
export interface SendSystemNotificationRequestHandler extends Request<{}, any, SendSystemNotificationRequest> {}

export interface GetNotificationAnalyticsRequestHandler extends Request<{}, any, {}, GetNotificationAnalyticsQuery> {}
export interface GetAllNotificationTemplatesRequestHandler extends Request<{}, any[]> {}
export interface CreateNotificationTemplateRequestHandler extends Request<{}, any, CreateNotificationTemplateRequest> {}
export interface UpdateNotificationTemplateAdminRequestHandler extends Request<TemplateParamsWithId, any, UpdateNotificationTemplateRequest> {}
export interface DeleteNotificationTemplateRequestHandler extends Request<TemplateParamsWithId, any> {}

export interface GetGlobalNotificationSettingsRequestHandler extends Request<{}, any> {}
export interface UpdateGlobalNotificationSettingsRequestHandler extends Request<{}, any, GlobalNotificationSettingsRequest> {}

export interface GetFailedNotificationsRequestHandler extends Request<{}, any[], {}, GetFailedNotificationsQuery> {}
export interface RetryFailedNotificationsRequestHandler extends Request<{}, any, { notificationIds: string[] }> {}
export interface CleanupOldNotificationsRequestHandler extends Request<{}, any, { olderThanDays: number; categories?: string[]; onlyRead?: boolean }> {}
export interface ExportNotificationDataRequestHandler extends Request<{}, any, { format: string; startDate?: string; endDate?: string; filters?: any }> {}

// Response types with Express
export interface NotificationResponseHandler extends Response<NotificationResponse> {}
export interface NotificationsListResponseHandler extends Response<NotificationResponse[]> {}
export interface NotificationPreferencesResponseHandler extends Response<NotificationPreferencesResponse> {}
export interface NotificationActionResponseHandler extends Response<any> {}