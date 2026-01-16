import mongoose, { Schema } from 'mongoose';
import { NotificationType, NotificationChannel } from '@/types/notification';

/* ================================
   Notification Document Interface
================================ */
export interface NotificationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  sentAt: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ================================
   Schema
================================ */
const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    data: {
      type: Schema.Types.Mixed,
      default: {},
    },

    channels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
        default: NotificationChannel.IN_APP,
      },
    ],
    
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/* ================================
   Indexes
================================ */
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ groupId: 1 });
notificationSchema.index({ sentAt: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ type: 1 });

/* ================================
   Pre-save Hook: readAt
================================ */
notificationSchema.pre('save', function (this: NotificationDocument) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
});

/* ================================
   Model Export
================================ */
export const Notification =
  mongoose.models.Notification ||
  mongoose.model<NotificationDocument>('Notification', notificationSchema);