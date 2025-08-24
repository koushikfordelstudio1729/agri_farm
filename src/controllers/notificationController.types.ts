import type { Request, Response } from 'express';
import type {
  NotificationData,
  NotificationPreferences,
  DatabaseId,
  ApiResponse,
  TypedResponse,
  PaginationResponse,
  AuthenticatedUser,
} from '@/types';

// Request interfaces
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface GetNotificationsRequest extends AuthenticatedRequest {
  query: {
    type?: string;
    category?: string;
    isRead?: string;
    priority?: 'low' | 'medium' | 'high';
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface GetNotificationRequest extends AuthenticatedRequest {
  params: {
    notificationId: string;
  };
}

export interface MarkNotificationReadRequest extends AuthenticatedRequest {
  params: {
    notificationId: string;
  };
  body: {
    isRead?: boolean;
  };
}

export interface MarkAllNotificationsReadRequest extends AuthenticatedRequest {
  body: {
    category?: string;
    type?: string;
  };
}

export interface DeleteNotificationRequest extends AuthenticatedRequest {
  params: {
    notificationId: string;
  };
}

export interface GetNotificationStatsRequest extends AuthenticatedRequest {
  query: {
    period?: '7d' | '30d' | '90d';
  };
}

export interface UpdateNotificationPreferencesRequest extends AuthenticatedRequest {
  body: {
    push?: {
      diagnoses?: boolean;
      expertMessages?: boolean;
      communityActivity?: boolean;
      priceAlerts?: boolean;
      weatherAlerts?: boolean;
      systemUpdates?: boolean;
      marketing?: boolean;
    };
    email?: {
      diagnoses?: boolean;
      expertMessages?: boolean;
      communityActivity?: boolean;
      priceAlerts?: boolean;
      weatherAlerts?: boolean;
      systemUpdates?: boolean;
      marketing?: boolean;
      weeklyDigest?: boolean;
    };
    sms?: {
      diagnoses?: boolean;
      expertMessages?: boolean;
      priceAlerts?: boolean;
      weatherAlerts?: boolean;
      criticalUpdates?: boolean;
    };
    inApp?: {
      diagnoses?: boolean;
      expertMessages?: boolean;
      communityActivity?: boolean;
      priceAlerts?: boolean;
      weatherAlerts?: boolean;
      systemUpdates?: boolean;
    };
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
    timezone?: string;
  };
}

export interface GetNotificationPreferencesRequest extends AuthenticatedRequest {}

export interface SendBulkNotificationRequest extends AuthenticatedRequest {
  body: {
    recipients: string[];
    title: string;
    message: string;
    type?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    channels?: ('push' | 'email' | 'sms' | 'inApp')[];
    scheduledFor?: string;
    relatedEntity?: {
      type: string;
      id: string;
      crop?: string;
      diagnosis?: string;
      post?: string;
      expert?: string;
    };
  };
}

export interface SubscribeToTopicRequest extends AuthenticatedRequest {
  body: {
    topic: string;
    deviceToken?: string;
  };
}

export interface UnsubscribeFromTopicRequest extends AuthenticatedRequest {
  body: {
    topic: string;
    deviceToken?: string;
  };
}

export interface TestNotificationRequest extends AuthenticatedRequest {
  body: {
    type?: string;
    title?: string;
    message?: string;
    channels?: ('push' | 'email' | 'sms' | 'inApp')[];
  };
}

// Response interfaces
export interface NotificationResponse {
  _id: DatabaseId;
  recipient: DatabaseId;
  sender?: {
    _id: DatabaseId;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  type: string;
  category: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  channels: ('push' | 'email' | 'sms' | 'inApp')[];
  relatedEntity?: {
    type: string;
    id: DatabaseId;
    crop?: {
      _id: DatabaseId;
      name: string;
      scientificName: string;
      image?: string;
    };
    diagnosis?: {
      _id: DatabaseId;
      status: string;
      confidence: number;
      results: any[];
    };
    post?: {
      _id: DatabaseId;
      title: string;
      content: string;
      type: string;
      author: DatabaseId;
    };
    expert?: {
      _id: DatabaseId;
      user: DatabaseId;
      specializations: string[];
    };
  };
  data?: {
    [key: string]: any;
  };
  actionUrl?: string;
  isRead: boolean;
  isTest?: boolean;
  deliveryStatus: 'pending' | 'delivered' | 'failed' | 'scheduled';
  deliveryAttempts: number;
  scheduledFor?: Date;
  createdAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  deletedAt?: Date;
}

export interface NotificationStatsResponse {
  period: string;
  overview: {
    totalNotifications: number;
    unreadNotifications: number;
    highPriorityNotifications: number;
    deliveredNotifications: number;
  };
  byCategory: Array<{
    _id: string;
    count: number;
    unread: number;
  }>;
  byType: Array<{
    _id: string;
    count: number;
    unread: number;
  }>;
  deliveryRate: number;
  readRate: number;
}

export interface NotificationPreferencesResponse {
  push: {
    diagnoses: boolean;
    expertMessages: boolean;
    communityActivity: boolean;
    priceAlerts: boolean;
    weatherAlerts: boolean;
    systemUpdates: boolean;
    marketing: boolean;
  };
  email: {
    diagnoses: boolean;
    expertMessages: boolean;
    communityActivity: boolean;
    priceAlerts: boolean;
    weatherAlerts: boolean;
    systemUpdates: boolean;
    marketing: boolean;
    weeklyDigest: boolean;
  };
  sms: {
    diagnoses: boolean;
    expertMessages: boolean;
    priceAlerts: boolean;
    weatherAlerts: boolean;
    criticalUpdates: boolean;
  };
  inApp: {
    diagnoses: boolean;
    expertMessages: boolean;
    communityActivity: boolean;
    priceAlerts: boolean;
    weatherAlerts: boolean;
    systemUpdates: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  timezone: string;
  lastUpdated: Date;
}

// Controller method types
export type GetNotificationsController = (
  req: GetNotificationsRequest,
  res: TypedResponse<NotificationResponse[]>
) => Promise<void>;

export type GetNotificationController = (
  req: GetNotificationRequest,
  res: TypedResponse<NotificationResponse>
) => Promise<void>;

export type MarkNotificationReadController = (
  req: MarkNotificationReadRequest,
  res: TypedResponse<{ isRead: boolean; readAt?: Date }>
) => Promise<void>;

export type MarkAllNotificationsReadController = (
  req: MarkAllNotificationsReadRequest,
  res: TypedResponse<{ updatedCount: number }>
) => Promise<void>;

export type DeleteNotificationController = (
  req: DeleteNotificationRequest,
  res: TypedResponse<{}>
) => Promise<void>;

export type GetNotificationStatsController = (
  req: GetNotificationStatsRequest,
  res: TypedResponse<NotificationStatsResponse>
) => Promise<void>;

export type UpdateNotificationPreferencesController = (
  req: UpdateNotificationPreferencesRequest,
  res: TypedResponse<NotificationPreferencesResponse>
) => Promise<void>;

export type GetNotificationPreferencesController = (
  req: GetNotificationPreferencesRequest,
  res: TypedResponse<NotificationPreferencesResponse>
) => Promise<void>;

export type SendBulkNotificationController = (
  req: SendBulkNotificationRequest,
  res: TypedResponse<{ 
    notificationIds: string[];
    recipientCount: number;
    scheduledFor?: Date;
  }>
) => Promise<void>;

export type SubscribeToTopicController = (
  req: SubscribeToTopicRequest,
  res: TypedResponse<{ topic: string; subscribed: boolean }>
) => Promise<void>;

export type UnsubscribeFromTopicController = (
  req: UnsubscribeFromTopicRequest,
  res: TypedResponse<{ topic: string; subscribed: boolean }>
) => Promise<void>;

export type TestNotificationController = (
  req: TestNotificationRequest,
  res: TypedResponse<{ 
    notificationId: string;
    deliveryStatus: string;
    channels: string[];
  }>
) => Promise<void>;

// Service response types
export interface NotificationServiceResult {
  success: boolean;
  notification?: NotificationResponse;
  message?: string;
  error?: string;
}

export interface BulkNotificationResult {
  success: boolean;
  notificationIds: string[];
  recipientCount: number;
  failedRecipients?: string[];
  message?: string;
  error?: string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  deliveryStatus: 'delivered' | 'failed';
  channels: {
    push?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
    sms?: { success: boolean; error?: string };
    inApp?: { success: boolean; error?: string };
  };
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
}

// Validation types
export interface NotificationValidationErrors {
  recipient?: string[];
  title?: string[];
  message?: string[];
  type?: string[];
  category?: string[];
  priority?: string[];
  channels?: string[];
  scheduledFor?: string[];
}