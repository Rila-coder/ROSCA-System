import mongoose, { Schema } from 'mongoose';
import { GroupStatus, GroupFrequency } from '@/types/group';

/* ================================
   Group Document Interface
================================ */
export interface IGroupDocument extends mongoose.Document {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: GroupFrequency;
  duration: number;
  startDate: Date;
  endDate?: Date;
  status: GroupStatus;
  inviteCode: string;
  
  // --- ROLE BASED ACCESS FIELDS ---
  createdBy: mongoose.Types.ObjectId;         // Who created the group (audit)
  leaderId: mongoose.Types.ObjectId;          // The current Admin (can start cycles)
  subLeaderIds: mongoose.Types.ObjectId[];    // The Helpers (can manage members)
  // -------------------------------

  currentCycle: number;
  totalAmount: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  members?: any[];
  memberCount?: number;
  collectedAmount?: number;
}

/* ================================
   Schema
================================ */
const groupSchema = new Schema<IGroupDocument>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    contributionAmount: {
      type: Number,
      required: [true, 'Contribution amount is required'],
      min: [1, 'Contribution amount must be at least 1'],
    },

    frequency: {
      type: String,
      enum: Object.values(GroupFrequency),
      required: [true, 'Frequency is required'],
    },

    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [2, 'Duration must be at least 2 cycles'],
      max: [100, 'Duration cannot exceed 100 cycles'],
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },

    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: Object.values(GroupStatus),
      default: GroupStatus.FORMING,
    },

    inviteCode: {
      type: String,
      unique: true,
      required: true,
    },

    // --- ROLE FIELDS ---
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Required so we know who started it
    },

    leaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // The Active Leader
    },

    subLeaderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // -------------------

    currentCycle: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    bankAccount: {
      bankName: String,
      accountNumber: String,
      accountHolder: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ================================
   Virtual: Members
================================ */
groupSchema.virtual('members', {
  ref: 'GroupMember',
  localField: '_id',
  foreignField: 'groupId',
  match: { status: { $ne: 'left' } },
});

/* ================================
   Virtual: Member Count
================================ */
groupSchema.virtual('memberCount').get(function (this: IGroupDocument) {
  return this.members?.length ?? 0;
});

/* ================================
   Virtual: Collected Amount
================================ */
groupSchema.virtual('collectedAmount').get(function (this: IGroupDocument) {
  return (
    (this.contributionAmount || 0) *
    (this.memberCount || 0) *
    (this.currentCycle || 0)
  );
});

/* ================================
   Pre-save Hook: End Date + Total
================================ */
groupSchema.pre('save', function (this: IGroupDocument) {
  if (
    this.isModified('startDate') ||
    this.isModified('frequency') ||
    this.isModified('duration')
  ) {
    const durationMap: Record<GroupFrequency, number> = {
      [GroupFrequency.DAILY]: 1,
      [GroupFrequency.WEEKLY]: 7,
      [GroupFrequency.MONTHLY]: 30,
    };

    const days = durationMap[this.frequency] * this.duration;
    this.endDate = new Date(
      this.startDate.getTime() + days * 24 * 60 * 60 * 1000
    );
  }

  this.totalAmount = this.contributionAmount * this.duration;
});

/* ================================
   Pre-save Hook: Invite Code
================================ */
groupSchema.pre('save', function (this: IGroupDocument) {
  if (!this.inviteCode) {
    this.inviteCode = `ROSCA-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
  }
});

/* ================================
   Model Export
================================ */
export const Group =
  mongoose.models.Group ||
  mongoose.model<IGroupDocument>('Group', groupSchema);