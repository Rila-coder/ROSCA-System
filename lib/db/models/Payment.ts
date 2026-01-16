import mongoose, { Schema } from 'mongoose';
import { PaymentStatus } from '@/types/payment';

/* ================================
   Payment Document Interface
================================ */
export interface PaymentDocument extends mongoose.Document {
  cycleId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;     // 👈 ✅ YOU MISSING THIS
  userId?: mongoose.Types.ObjectId;      // Optional
  groupId: mongoose.Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  paidAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  paymentMethod?: 'cash' | 'bank_transfer' | 'upi' | 'other';
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ================================
   Schema
================================ */
const paymentSchema = new Schema<PaymentDocument>(
  {
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentCycle',
      required: true,
    },

    // 👈 ✅ ADD THIS FIELD EXACTLY LIKE THIS
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'GroupMember',
      required: true,
    },

    // Optional (pending members have no userId)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },

    paidAt: Date,

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'other'],
    },

    transactionId: String,
    notes: String,
  },
  { timestamps: true }
);

/* ================================
   Indexes
================================ */
// Ensure one payment per member per cycle
paymentSchema.index({ cycleId: 1, memberId: 1 }, { unique: true });
paymentSchema.index({ groupId: 1, status: 1 });

/* ================================
   Pre-save Hook
================================ */
paymentSchema.pre('save', function (this: PaymentDocument) {
  if (
    this.isModified('status') &&
    this.status === PaymentStatus.PAID &&
    !this.paidAt
  ) {
    this.paidAt = new Date();
  }
});

/* ================================
   Model Export
================================ */
export const Payment =
  mongoose.models.Payment ||
  mongoose.model<PaymentDocument>('Payment', paymentSchema);