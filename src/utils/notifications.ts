import { EventEmitter } from 'events';
import logger from './logger';
import { getCurrentTimestamp } from './helpers';

export type NotificationType = 'email' | 'sms' | 'push' | 'webhook' | 'slack';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  language?: string;
}

export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  webhookUrl?: string;
  slackUserId?: string;
  preferences: {
    channels: NotificationType[];
    frequency: 'immediate' | 'daily' | 'weekly';
    timezone: string;
  };
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  templateId: string;
  recipientIds: string[];
  data: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  id: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  attempts: number;
  metadata?: Record<string, any>;
}

export interface NotificationBatch {
  id: string;
  notifications: NotificationPayload[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results: NotificationResult[];
}

export interface NotificationProvider {
  type: NotificationType;
  name: string;
  send(notification: NotificationPayload, recipient: NotificationRecipient, content: string): Promise<NotificationResult>;
  validate(recipient: NotificationRecipient): boolean;
}

export interface NotificationConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  providers: Record<NotificationType, NotificationProvider[]>;
  templates: NotificationTemplate[];
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  deliveryRate: number;
  avgDeliveryTime: number;
}

class NotificationManager extends EventEmitter {
  private config: NotificationConfig;
  private queue: NotificationPayload[] = [];
  private processing = false;
  private results = new Map<string, NotificationResult>();
  private templates = new Map<string, NotificationTemplate>();
  private recipients = new Map<string, NotificationRecipient>();
  private batches = new Map<string, NotificationBatch>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  constructor(config: NotificationConfig) {
    super();
    this.config = config;
    this.loadTemplates();
    this.startProcessing();
  }

  // Template management
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Notification template added: ${template.name} (${template.type})`);
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    const updated = { ...template, ...updates };
    this.templates.set(id, updated);
    logger.info(`Notification template updated: ${id}`);
    return true;
  }

  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      logger.info(`Notification template deleted: ${id}`);
    }
    return deleted;
  }

  // Recipient management
  addRecipient(recipient: NotificationRecipient): void {
    this.recipients.set(recipient.id, recipient);
    logger.debug(`Notification recipient added: ${recipient.id}`);
  }

  getRecipient(id: string): NotificationRecipient | undefined {
    return this.recipients.get(id);
  }

  updateRecipient(id: string, updates: Partial<NotificationRecipient>): boolean {
    const recipient = this.recipients.get(id);
    if (!recipient) return false;

    const updated = { ...recipient, ...updates };
    this.recipients.set(id, updated);
    logger.debug(`Notification recipient updated: ${id}`);
    return true;
  }

  // Notification sending
  async send(payload: NotificationPayload): Promise<string> {
    // Validate template exists
    const template = this.templates.get(payload.templateId);
    if (!template) {
      throw new Error(`Template not found: ${payload.templateId}`);
    }

    // Validate recipients
    const validRecipients = payload.recipientIds
      .map(id => this.recipients.get(id))
      .filter((r): r is NotificationRecipient => r !== undefined);

    if (validRecipients.length === 0) {
      throw new Error('No valid recipients found');
    }

    // Add to queue
    this.queue.push(payload);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    logger.info(`Notification queued: ${payload.id} (${payload.type})`);
    this.emit('queued', payload);
    
    return payload.id;
  }

  async sendBatch(notifications: NotificationPayload[]): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batch: NotificationBatch = {
      id: batchId,
      notifications,
      status: 'pending',
      createdAt: new Date(),
      results: [],
    };

    this.batches.set(batchId, batch);
    
    // Add all notifications to queue
    notifications.forEach(notification => {
      this.queue.push(notification);
    });

    // Start processing
    if (!this.processing) {
      this.processQueue();
    }

    logger.info(`Notification batch queued: ${batchId} (${notifications.length} notifications)`);
    this.emit('batchQueued', batch);
    
    return batchId;
  }

  async sendImmediate(payload: NotificationPayload): Promise<NotificationResult[]> {
    const template = this.templates.get(payload.templateId);
    if (!template) {
      throw new Error(`Template not found: ${payload.templateId}`);
    }

    const results: NotificationResult[] = [];
    
    for (const recipientId of payload.recipientIds) {
      const recipient = this.recipients.get(recipientId);
      if (!recipient) continue;

      try {
        const result = await this.sendToRecipient(payload, recipient, template);
        results.push(result);
      } catch (error) {
        const errorResult: NotificationResult = {
          id: `${payload.id}_${recipientId}`,
          status: 'failed',
          error: (error as Error).message,
          attempts: 1,
        };
        results.push(errorResult);
      }
    }

    return results;
  }

  // Queue management
  getQueueSize(): number {
    return this.queue.length;
  }

  getQueuedNotifications(): NotificationPayload[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    logger.info('Notification queue cleared');
  }

  pauseProcessing(): void {
    this.processing = false;
    logger.info('Notification processing paused');
  }

  resumeProcessing(): void {
    if (!this.processing) {
      this.processQueue();
      logger.info('Notification processing resumed');
    }
  }

  // Results and status
  getResult(id: string): NotificationResult | undefined {
    return this.results.get(id);
  }

  getBatch(id: string): NotificationBatch | undefined {
    return this.batches.get(id);
  }

  getStats(): NotificationStats {
    const allResults = Array.from(this.results.values());
    const total = allResults.length;
    
    const sent = allResults.filter(r => r.status === 'sent' || r.status === 'delivered').length;
    const delivered = allResults.filter(r => r.status === 'delivered').length;
    const failed = allResults.filter(r => r.status === 'failed').length;
    const pending = allResults.filter(r => r.status === 'pending').length;

    const byType: Record<NotificationType, number> = {
      email: 0, sms: 0, push: 0, webhook: 0, slack: 0
    };
    
    const byPriority: Record<NotificationPriority, number> = {
      low: 0, normal: 0, high: 0, urgent: 0
    };

    // Calculate delivery times
    const deliveryTimes = allResults
      .filter(r => r.sentAt && r.deliveredAt)
      .map(r => r.deliveredAt!.getTime() - r.sentAt!.getTime());
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length 
      : 0;

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      byType,
      byPriority,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      avgDeliveryTime,
    };
  }

  // Private methods
  private loadTemplates(): void {
    this.config.templates.forEach(template => {
      this.templates.set(template.id, template);
    });
    logger.info(`Loaded ${this.config.templates.length} notification templates`);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    logger.debug('Started processing notification queue');

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.config.batchSize);
      
      const promises = batch.map(notification => this.processNotification(notification));
      await Promise.allSettled(promises);
      
      // Rate limiting
      await this.waitForRateLimit();
    }

    this.processing = false;
    logger.debug('Finished processing notification queue');
  }

  private async processNotification(payload: NotificationPayload): Promise<void> {
    try {
      const template = this.templates.get(payload.templateId);
      if (!template) {
        logger.error(`Template not found: ${payload.templateId}`);
        return;
      }

      // Check if scheduled
      if (payload.scheduledAt && payload.scheduledAt > new Date()) {
        // Re-queue for later
        setTimeout(() => {
          this.queue.push(payload);
        }, payload.scheduledAt.getTime() - Date.now());
        return;
      }

      // Check if expired
      if (payload.expiresAt && payload.expiresAt < new Date()) {
        logger.warn(`Notification expired: ${payload.id}`);
        return;
      }

      // Send to each recipient
      const results: NotificationResult[] = [];
      
      for (const recipientId of payload.recipientIds) {
        const recipient = this.recipients.get(recipientId);
        if (!recipient) {
          logger.warn(`Recipient not found: ${recipientId}`);
          continue;
        }

        try {
          const result = await this.sendToRecipient(payload, recipient, template);
          results.push(result);
          this.results.set(result.id, result);
        } catch (error) {
          const errorResult: NotificationResult = {
            id: `${payload.id}_${recipientId}`,
            status: 'failed',
            error: (error as Error).message,
            attempts: 1,
          };
          results.push(errorResult);
          this.results.set(errorResult.id, errorResult);
        }
      }

      this.emit('processed', { payload, results });

    } catch (error) {
      logger.error(`Failed to process notification: ${payload.id}`, error as Error);
      this.emit('error', { payload, error });
    }
  }

  private async sendToRecipient(
    payload: NotificationPayload,
    recipient: NotificationRecipient,
    template: NotificationTemplate
  ): Promise<NotificationResult> {
    // Check recipient preferences
    if (!recipient.preferences.channels.includes(payload.type)) {
      throw new Error(`Recipient does not accept ${payload.type} notifications`);
    }

    // Get provider
    const providers = this.config.providers[payload.type] || [];
    if (providers.length === 0) {
      throw new Error(`No providers configured for ${payload.type}`);
    }

    // Use first available provider (could implement failover)
    const provider = providers[0];
    
    // Validate recipient for this provider
    if (!provider.validate(recipient)) {
      throw new Error(`Invalid recipient for ${provider.name}`);
    }

    // Render content
    const content = this.renderTemplate(template, payload.data);
    
    // Send notification
    const result = await provider.send(payload, recipient, content);
    
    logger.info(`Notification sent: ${result.id} via ${provider.name}`);
    this.emit('sent', { payload, recipient, result });
    
    return result;
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): string {
    let content = template.content;
    
    // Simple template variable replacement
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content = content.replace(placeholder, String(value));
    });
    
    return content;
  }

  private async waitForRateLimit(): Promise<void> {
    const { requests, windowMs } = this.config.rateLimit;
    const now = Date.now();
    const key = 'global';
    
    let rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimit = { count: 0, resetTime: now + windowMs };
      this.rateLimits.set(key, rateLimit);
    }
    
    if (rateLimit.count >= requests) {
      const waitTime = rateLimit.resetTime - now;
      if (waitTime > 0) {
        logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Reset rate limit
        this.rateLimits.set(key, { count: 0, resetTime: now + waitTime + windowMs });
      }
    }
    
    rateLimit.count++;
  }

  destroy(): void {
    this.processing = false;
    this.queue = [];
    this.results.clear();
    this.templates.clear();
    this.recipients.clear();
    this.batches.clear();
    this.rateLimits.clear();
    this.removeAllListeners();
    
    logger.info('Notification manager destroyed');
  }
}

// Mock providers for demonstration
const createMockProvider = (type: NotificationType): NotificationProvider => ({
  type,
  name: `Mock ${type} Provider`,
  
  async send(notification: NotificationPayload, recipient: NotificationRecipient, content: string): Promise<NotificationResult> {
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    // Simulate random failures (5% failure rate)
    const success = Math.random() > 0.05;
    
    const result: NotificationResult = {
      id: `${notification.id}_${recipient.id}`,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : undefined,
      error: success ? undefined : 'Mock provider error',
      attempts: 1,
      metadata: { provider: this.name, type },
    };
    
    return result;
  },
  
  validate(recipient: NotificationRecipient): boolean {
    switch (type) {
      case 'email':
        return !!recipient.email;
      case 'sms':
        return !!recipient.phone;
      case 'push':
        return !!recipient.deviceToken;
      case 'webhook':
        return !!recipient.webhookUrl;
      case 'slack':
        return !!recipient.slackUserId;
      default:
        return false;
    }
  },
});

// Default configuration
const defaultConfig: NotificationConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 10,
  rateLimit: {
    requests: 100,
    windowMs: 60000, // 1 minute
  },
  providers: {
    email: [createMockProvider('email')],
    sms: [createMockProvider('sms')],
    push: [createMockProvider('push')],
    webhook: [createMockProvider('webhook')],
    slack: [createMockProvider('slack')],
  },
  templates: [],
};

// Create singleton notification manager
const notificationManager = new NotificationManager(defaultConfig);

// Export both class and singleton
export { NotificationManager };
export default notificationManager;

// Utility functions
export const notificationUtils = {
  // Create notification payload
  createNotification: (
    type: NotificationType,
    templateId: string,
    recipientIds: string[],
    data: Record<string, any>,
    options?: {
      priority?: NotificationPriority;
      scheduledAt?: Date;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    }
  ): NotificationPayload => ({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    priority: options?.priority || 'normal',
    templateId,
    recipientIds,
    data,
    scheduledAt: options?.scheduledAt,
    expiresAt: options?.expiresAt,
    metadata: options?.metadata,
  }),

  // Create notification template
  createTemplate: (
    name: string,
    type: NotificationType,
    content: string,
    variables: string[],
    options?: {
      subject?: string;
      language?: string;
    }
  ): NotificationTemplate => ({
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    subject: options?.subject,
    content,
    variables,
    isActive: true,
    language: options?.language || 'en',
  }),

  // Create notification recipient
  createRecipient: (
    id: string,
    contact: {
      email?: string;
      phone?: string;
      deviceToken?: string;
      webhookUrl?: string;
      slackUserId?: string;
    },
    preferences?: {
      channels?: NotificationType[];
      frequency?: 'immediate' | 'daily' | 'weekly';
      timezone?: string;
    }
  ): NotificationRecipient => ({
    id,
    ...contact,
    preferences: {
      channels: preferences?.channels || ['email'],
      frequency: preferences?.frequency || 'immediate',
      timezone: preferences?.timezone || 'UTC',
    },
  }),

  // Validate template variables
  validateTemplate: (template: NotificationTemplate, data: Record<string, any>): {
    valid: boolean;
    missingVariables: string[];
  } => {
    const missingVariables = template.variables.filter(variable => !(variable in data));
    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  },
};