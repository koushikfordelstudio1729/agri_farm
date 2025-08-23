import { Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: 'system' | 'diagnosis' | 'weather' | 'price_alert' | 'community' | 'expert' | 'reminder' | 'marketing' | 'security';
  category: 'info' | 'success' | 'warning' | 'error' | 'update';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  
  content: {
    title: string;
    message: string;
    shortMessage?: string; // for SMS/push notifications
    htmlContent?: string; // for email notifications
    actionText?: string;
    actionUrl?: string;
    imageUrl?: string;
    data?: Record<string, unknown>; // additional structured data
  };
  
  channels: Array<{
    type: 'push' | 'email' | 'sms' | 'in_app' | 'webhook';
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
    provider?: string; // e.g., 'firebase', 'twilio', 'sendgrid'
    externalId?: string; // ID from external service
    retryCount?: number;
  }>;
  
  targeting: {
    userId: string;
    deviceTokens?: string[]; // for push notifications
    email?: string;
    phone?: string;
    preferences?: {
      allowPush: boolean;
      allowEmail: boolean;
      allowSms: boolean;
    };
  };
  
  scheduling: {
    sendAt?: Date;
    timezone?: string;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number; // every N days/weeks/months
      endDate?: Date;
      maxOccurrences?: number;
    };
    conditions?: Array<{
      type: 'weather' | 'time' | 'location' | 'user_action';
      criteria: Record<string, unknown>;
    }>;
  };
  
  tracking: {
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    dismissed: boolean;
    dismissedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
  
  metadata: {
    source: string; // system, api, admin, automated
    sourceId?: string; // reference ID from source system
    campaignId?: string;
    templateId?: string;
    batchId?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
  
  localization: {
    language: string;
    originalTitle?: string;
    originalMessage?: string;
    translatedTitle?: string;
    translatedMessage?: string;
  };
  
  expiration: {
    expiresAt?: Date;
    autoDelete?: boolean;
    maxAge?: number; // in days
  };
  
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue?: number;
    cost?: number;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isExpired: boolean;
  isScheduled: boolean;
  isPending: boolean;
  isSent: boolean;
  isRead: boolean;
  deliveryRate: number;
  openRate: number;
  clickRate: number;

  // Instance methods
  markAsRead(ipAddress?: string, userAgent?: string): Promise<void>;
  markAsClicked(ipAddress?: string, userAgent?: string): Promise<void>;
  markAsDismissed(): Promise<void>;
  markAsDelivered(channel: string, externalId?: string): Promise<void>;
  markAsFailed(channel: string, error: string): Promise<void>;
  reschedule(sendAt: Date): Promise<void>;
  cancel(): Promise<void>;
  updateContent(title: string, message: string, actionText?: string, actionUrl?: string): Promise<void>;
  addChannel(channel: INotification['channels'][0]): Promise<void>;
  removeChannel(channelType: string): Promise<void>;
  translate(language: string): Promise<void>;
  incrementImpression(): Promise<void>;
  incrementClick(): Promise<void>;
  incrementConversion(revenue?: number): Promise<void>;
  clone(overrides?: Partial<INotification>): Promise<INotification>;
}

export interface INotificationStatics {
  findByUserId(userId: string, filters?: {
    type?: string[];
    status?: string[];
    read?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
  }>;
  
  findPendingNotifications(limit?: number): Promise<INotification[]>;
  
  findScheduledNotifications(dateTime?: Date): Promise<INotification[]>;
  
  findExpiredNotifications(): Promise<INotification[]>;
  
  createNotification(data: {
    userId: string;
    type: INotification['type'];
    category: INotification['category'];
    priority: INotification['priority'];
    content: INotification['content'];
    channels: Array<{ type: string; provider?: string }>;
    scheduling?: INotification['scheduling'];
    metadata?: INotification['metadata'];
  }): Promise<INotification>;
  
  createBulkNotification(data: {
    userIds: string[];
    type: INotification['type'];
    category: INotification['category'];
    priority: INotification['priority'];
    content: INotification['content'];
    channels: Array<{ type: string; provider?: string }>;
    scheduling?: INotification['scheduling'];
    metadata?: INotification['metadata'];
  }): Promise<{
    notifications: INotification[];
    batchId: string;
  }>;
  
  sendNotification(notificationId: string): Promise<{
    success: boolean;
    results: Array<{
      channel: string;
      success: boolean;
      error?: string;
      externalId?: string;
    }>;
  }>;
  
  markAllAsRead(userId: string, type?: string): Promise<number>;
  
  deleteOldNotifications(daysOld: number): Promise<number>;
  
  getNotificationStats(filters?: {
    userId?: string;
    type?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    failed: number;
    byType: Record<string, number>;
    byChannel: Record<string, {
      sent: number;
      delivered: number;
      failed: number;
    }>;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }>;
  
  getUserPreferences(userId: string): Promise<{
    push: boolean;
    email: boolean;
    sms: boolean;
    byType: Record<string, {
      push: boolean;
      email: boolean;
      sms: boolean;
    }>;
  }>;
  
  updateUserPreferences(userId: string, preferences: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    byType?: Record<string, {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    }>;
  }): Promise<boolean>;
  
  findDuplicateNotifications(
    userId: string,
    content: { title: string; message: string },
    withinHours?: number
  ): Promise<INotification[]>;
  
  getNotificationHistory(userId: string, limit?: number): Promise<Array<{
    date: Date;
    type: string;
    title: string;
    message: string;
    status: string;
    read: boolean;
  }>>;
  
  searchNotifications(query: string, filters?: {
    userId?: string;
    type?: string[];
    dateRange?: { start: Date; end: Date };
  }): Promise<INotification[]>;
  
  createTemplate(template: {
    name: string;
    type: string;
    content: {
      title: string;
      message: string;
      variables?: string[];
    };
    channels: string[];
  }): Promise<any>;
  
  getPopularNotificationTypes(dateRange?: { start: Date; end: Date }): Promise<Array<{
    type: string;
    count: number;
    openRate: number;
    clickRate: number;
  }>>;
  
  processScheduledNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }>;
  
  retryFailedNotifications(maxRetries?: number): Promise<{
    retried: number;
    successful: number;
    stillFailed: number;
  }>;
}

export interface INotificationModel extends Model<INotification>, INotificationStatics {}