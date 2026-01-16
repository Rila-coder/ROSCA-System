import mongoose from 'mongoose';

export enum ActivityType {
  GROUP_CREATED = 'group_created',
  GROUP_UPDATED = 'group_updated',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  PAYMENT_MADE = 'payment_made',
  PAYMENT_VERIFIED = 'payment_verified',
  CYCLE_COMPLETED = 'cycle_completed',
  MONEY_DISTRIBUTED = 'money_distributed',
  ROLE_CHANGED = 'role_changed',
  SETTINGS_UPDATED = 'settings_updated',
}

const activitySchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
activitySchema.index({ groupId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

// Virtual for formatted date
activitySchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

export const Activity = mongoose.models.Activity || 
  mongoose.model('Activity', activitySchema);