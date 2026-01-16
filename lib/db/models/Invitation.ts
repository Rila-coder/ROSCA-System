import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';

/* ================================
   Invitation Status Enum
================================ */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/* ================================
   Invitation Document Interface
================================ */
export interface InvitationDocument extends mongoose.Document {
  groupId: mongoose.Types.ObjectId;
  inviterId: mongoose.Types.ObjectId;
  email: string;
  phone?: string;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  memberNumber?: number;
  role?: 'leader' | 'sub_leader' | 'member';
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  isExpired?: boolean;
}

/* ================================
   Schema
================================ */
const invitationSchema = new Schema<InvitationDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },

    inviterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
    },

    token: {
      type: String,
      unique: true,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    memberNumber: {
      type: Number,
    },

    role: {
      type: String,
      enum: ['leader', 'sub_leader', 'member'],
      default: 'member',
    },

    acceptedAt: {
      type: Date,
    },

    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================================
   Indexes
================================ */
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ groupId: 1, email: 1 });
invitationSchema.index({ groupId: 1, status: 1 });

// TTL index → auto delete after expiresAt
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ================================
   Virtual: Is Expired
================================ */
invitationSchema.virtual('isExpired').get(function (this: InvitationDocument) {
  return this.expiresAt < new Date();
});

/* ================================
   Pre-save Hook: Token + Expiry
================================ */
invitationSchema.pre('save', function (this: InvitationDocument) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }

  if (!this.expiresAt) {
    this.expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    );
  }
});

/* ================================
   Model Export
================================ */
export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<InvitationDocument>('Invitation', invitationSchema);
