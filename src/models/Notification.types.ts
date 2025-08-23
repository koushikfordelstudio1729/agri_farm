import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';

export interface INotification extends Document {
  _id: DatabaseId;
  recipientId: DatabaseId;
  type: 'diagnosis_complete' | 'expert_response' | 'weather_alert' | 'price_alert' | 'community_like' | 'community_comment' | 'system_update';
  title: string;
  message: string;
  data?: any;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationMethods {
  markAsRead(): Promise<void>;
  markAsSent(): Promise<void>;
  schedule(date: Date): Promise<void>;
  send(): Promise<void>;
}

export interface INotificationStatics {
  findByRecipient(recipientId: DatabaseId, options?: NotificationQueryOptions): Promise<INotification[]>;
  findUnread(recipientId: DatabaseId): Promise<INotification[]>;
  findByType(type: INotification['type']): Promise<INotification[]>;
  markAllAsRead(recipientId: DatabaseId): Promise<number>;
  cleanup(olderThanDays: number): Promise<number>;
}

export interface NotificationQueryOptions {
  limit?: number;
  offset?: number;
  status?: INotification['status'];
  type?: INotification['type'];
  priority?: INotification['priority'];
}