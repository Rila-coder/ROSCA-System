export enum NotificationType {
  PAYMENT = 'payment',
  GROUP = 'group',
  SYSTEM = 'system',
  ALERT = 'alert',
  REMINDER = 'reminder'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export interface INotification {
  _id: string;
  userId: string;
  groupId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  isRead: boolean;
  priority?: 'low' | 'medium' | 'high';
  sentAt: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}