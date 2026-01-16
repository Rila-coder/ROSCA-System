// lib/db/models/AuditLog.ts
import mongoose, { Schema } from 'mongoose';

export interface AuditLogDocument extends mongoose.Document {
  action: string;
  userId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  details: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'GROUP_CREATED',
        'GROUP_DELETED',
        'LEADER_TRANSFERRED',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'PAYMENT_MARKED_PAID',
        'CYCLE_COMPLETED',
        'SETTINGS_UPDATED'
      ]
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group'
    },
    details: {
      type: Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ groupId: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);