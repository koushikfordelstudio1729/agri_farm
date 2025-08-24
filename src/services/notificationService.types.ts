export interface NotificationServiceConfig {
  fcm: {
    serverKey: string;
    senderId: string;
  };
  email: {
    enabled: boolean;
    service: string;
  };
  sms: {
    enabled: boolean;
    service: string;
  };
  defaultChannels: NotificationChannel[];
  batchSize: number;
  retryAttempts: number;
}

export type NotificationChannel = 'push' | 'email' | 'sms' | 'inApp';
export type NotificationType = 'diagnosis' | 'consultation' | 'community' | 'market' | 'weather' | 'system' | 'expert' | 'price_alert';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  category?: string;
  priority?: NotificationPriority;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface SendNotificationOptions {
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduleFor?: Date;
  personalizedData?: Record<string, any>;
  retryAttempts?: number;
  requiresInteraction?: boolean;
}

export interface SendNotificationResult {
  success: boolean;
  notificationIds?: string[];
  deliveredChannels?: NotificationChannel[];
  totalRecipients?: number;
  successfulDeliveries?: number;
  failedDeliveries?: number;
  error?: string;
  messageId?: string;
}

export interface BulkNotificationRecipient {
  userId: string;
  personalizedData?: Record<string, any>;
}

export interface BulkNotificationOptions {
  recipients: BulkNotificationRecipient[];
  payload: NotificationPayload;
  options?: SendNotificationOptions;
  batchSize?: number;
}

export interface BulkNotificationResult {
  success: boolean;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  results: SendNotificationResult[];
  error?: string;
}

export interface PushNotificationData {
  [key: string]: string;
}

export interface NotificationTemplate {
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  imageUrl?: string;
  actionUrl?: string;
  variables?: string[];
}

export interface NotificationPreference {
  userId: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

export interface NotificationDeliveryStatus {
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  attempts: number;
  metadata?: Record<string, any>;
}

export interface NotificationAnalytics {
  notificationId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  channels: {
    [channel in NotificationChannel]?: {
      sent: number;
      delivered: number;
      failed: number;
    };
  };
}

export interface TopicSubscription {
  userId: string;
  deviceToken: string;
  topic: string;
  subscribedAt: Date;
  isActive: boolean;
}

export interface NotificationQueue {
  id: string;
  payload: NotificationPayload;
  recipients: string[];
  options: SendNotificationOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor?: Date;
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}