export interface EmailServiceConfig {
  service: string;
  apiKey: string;
  from: string;
  fromName: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  encoding?: string;
  cid?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export interface BulkEmailOptions {
  recipients: string[];
  template: EmailTemplate;
  variables?: Record<string, any>;
  batchSize?: number;
  delay?: number;
}

export interface EmailAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template: EmailTemplate;
  recipients: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledAt?: Date;
  sentAt?: Date;
  analytics: EmailAnalytics;
}