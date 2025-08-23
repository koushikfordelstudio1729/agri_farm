import type { 
  DatabaseId, 
  BaseDocument,
  NotificationType,
  LanguageCode 
} from './common.types';

export interface NotificationTemplate {
  id: DatabaseId;
  name: string;
  type: NotificationType;
  title: Record<LanguageCode, string>;
  body: Record<LanguageCode, string>;
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  variables: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    description: string;
  }[];
  scheduling: {
    immediate: boolean;
    delayed?: number;
    batch?: boolean;
    batchInterval?: number;
  };
  targeting: {
    userRoles: string[];
    userSegments: string[];
    locations: string[];
    languages: LanguageCode[];
  };
  metadata: {
    priority: 'low' | 'normal' | 'high' | 'critical';
    category: string;
    actionUrl?: string;
    actionText?: Record<LanguageCode, string>;
    imageUrl?: string;
    soundUrl?: string;
  };
  isActive: boolean;
  createdBy: DatabaseId;
  updatedBy: DatabaseId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification extends BaseDocument {
  id: DatabaseId;
  recipientId: DatabaseId;
  templateId?: DatabaseId;
  type: NotificationType;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  body: string;
  data: {
    actionUrl?: string;
    actionText?: string;
    imageUrl?: string;
    category?: string;
    relatedId?: DatabaseId;
    relatedType?: string;
    variables?: Record<string, unknown>;
  };
  delivery: {
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    retryCount: number;
    maxRetries: number;
  };
  engagement: {
    opened: boolean;
    clicked: boolean;
    openedAt?: Date;
    clickedAt?: Date;
    interactionCount: number;
  };
  personalization: {
    language: LanguageCode;
    timezone: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    platform?: 'ios' | 'android' | 'web';
  };
  isRead: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  scheduledFor?: Date;
  expiresAt?: Date;
  batchId?: string;
  campaignId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: DatabaseId;
  userId: DatabaseId;
  channels: {
    push: {
      enabled: boolean;
      deviceTokens: {
        token: string;
        platform: 'ios' | 'android' | 'web';
        deviceId: string;
        isActive: boolean;
        updatedAt: Date;
      }[];
      allowSound: boolean;
      allowBadge: boolean;
      quietHours: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      };
    };
    email: {
      enabled: boolean;
      address: string;
      verified: boolean;
      frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
      digest: boolean;
      unsubscribeToken?: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber: string;
      countryCode: string;
      verified: boolean;
      allowMarketing: boolean;
    };
    inApp: {
      enabled: boolean;
      autoRead: boolean;
      showPreview: boolean;
    };
  };
  types: {
    [K in NotificationType]: {
      enabled: boolean;
      channels: ('push' | 'email' | 'sms' | 'in_app')[];
      priority: 'low' | 'normal' | 'high';
    };
  };
  global: {
    enabled: boolean;
    pausedUntil?: Date;
    timezone: string;
    language: LanguageCode;
    marketing: boolean;
    reminders: boolean;
    social: boolean;
    security: boolean;
  };
  updatedAt: Date;
}

export interface NotificationCampaign {
  id: DatabaseId;
  name: string;
  description: string;
  templateId: DatabaseId;
  type: 'broadcast' | 'targeted' | 'triggered' | 'scheduled';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  targeting: {
    userSegments: string[];
    userRoles: string[];
    locations: string[];
    languages: LanguageCode[];
    customFilters: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: unknown;
    }[];
    excludeSegments?: string[];
    testUsers?: DatabaseId[];
  };
  scheduling: {
    type: 'immediate' | 'scheduled' | 'recurring';
    scheduledAt?: Date;
    timezone: string;
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      daysOfWeek?: number[];
      daysOfMonth?: number[];
      endDate?: Date;
    };
    sendTime?: {
      hour: number;
      minute: number;
      optimizeForTimezone: boolean;
    };
  };
  content: {
    personalizedContent: boolean;
    abTest?: {
      enabled: boolean;
      variants: {
        name: string;
        percentage: number;
        templateId: DatabaseId;
      }[];
      winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
      testDuration: number;
    };
  };
  delivery: {
    channels: ('push' | 'email' | 'sms' | 'in_app')[];
    rateLimiting: {
      enabled: boolean;
      maxPerHour?: number;
      maxPerDay?: number;
    };
    deliveryWindows: {
      start: string;
      end: string;
      timezone: string;
      days: number[];
    }[];
  };
  analytics: {
    targetAudience: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
    rates: {
      delivery: number;
      open: number;
      click: number;
      bounce: number;
      unsubscribe: number;
    };
    revenue?: number;
    conversions?: number;
    costs: {
      setup: number;
      delivery: number;
      total: number;
      currency: string;
    };
  };
  budget?: {
    maxCost: number;
    currency: string;
    costPerNotification: number;
  };
  createdBy: DatabaseId;
  approvedBy?: DatabaseId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQueue {
  id: DatabaseId;
  notificationId: DatabaseId;
  recipientId: DatabaseId;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  priority: number;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  errorMessage?: string;
  processingStartedAt?: Date;
  processedAt?: Date;
  batchId?: string;
  createdAt: Date;
}

export interface NotificationAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  overview: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  byChannel: {
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    rates: {
      delivery: number;
      open: number;
      click: number;
    };
  }[];
  byType: {
    type: NotificationType;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    rates: {
      delivery: number;
      open: number;
      click: number;
    };
  }[];
  trends: {
    date: Date;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];
  topPerformers: {
    templateId: DatabaseId;
    templateName: string;
    sent: number;
    openRate: number;
    clickRate: number;
  }[];
  devices: {
    platform: string;
    count: number;
    percentage: number;
  }[];
  locations: {
    country: string;
    count: number;
    percentage: number;
  }[];
  timeDistribution: {
    hour: number;
    sent: number;
    opened: number;
    clicked: number;
  }[];
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  timeToLive?: number;
  collapseKey?: string;
}

export interface EmailNotificationPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
  headers?: Record<string, string>;
  replyTo?: string;
  unsubscribeUrl?: string;
}

export interface SMSNotificationPayload {
  to: string;
  message: string;
  from?: string;
  mediaUrls?: string[];
}

export interface CreateNotificationRequest {
  recipientId: DatabaseId;
  type: NotificationType;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduledFor?: Date;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface BulkNotificationRequest {
  templateId: DatabaseId;
  recipientIds: DatabaseId[];
  variables?: Record<string, unknown>;
  scheduledFor?: Date;
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
}

export interface NotificationStats {
  totalNotifications: number;
  todaysSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
  byChannel: {
    push: number;
    email: number;
    sms: number;
    inApp: number;
  };
  byStatus: {
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  };
  topTypes: {
    type: NotificationType;
    count: number;
    percentage: number;
  }[];
  recentActivity: {
    timestamp: Date;
    type: string;
    count: number;
  }[];
}

export interface NotificationWebhook {
  id: DatabaseId;
  name: string;
  url: string;
  events: ('sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced')[];
  headers?: Record<string, string>;
  secret?: string;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}