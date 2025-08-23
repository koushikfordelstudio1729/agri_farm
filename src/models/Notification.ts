import { Schema, model } from 'mongoose';
import { INotification, INotificationMethods, INotificationStatics } from './Notification.types';

const notificationSchema = new Schema<INotification, INotificationStatics, INotificationMethods>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['diagnosis_complete', 'expert_response', 'weather_alert', 'price_alert', 'community_like', 'community_comment', 'system_update'],
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  data: {
    type: Schema.Types.Mixed,
  },
  channels: [{
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true,
  },
  scheduledFor: {
    type: Date,
    index: true,
  },
  sentAt: {
    type: Date,
  },
  readAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export const Notification = model<INotification, INotificationStatics>('Notification', notificationSchema);
export default Notification;