import mongoose, { Schema } from 'mongoose';
import { Group } from './Group';

/* ================================
   PaymentCycle Document Interface
================================ */
export interface PaymentCycleDocument extends mongoose.Document {
  groupId: mongoose.Types.ObjectId;
  cycleNumber: number;
  amount: number;
  dueDate: Date;
  
  recipientId?: mongoose.Types.ObjectId;
  recipientName: string;
  
  // Status field for tracking cycle state
  status: 'upcoming' | 'active' | 'completed' | 'skipped';
  
  // Virtual field for display (e.g., "January 2026")
  monthLabel: string;

  // Legacy fields for backward compatibility
  isCompleted: boolean;
  isSkipped: boolean; 
  
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
  startedBy?: mongoose.Types.ObjectId;
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ================================
   Schema
================================ */
const paymentCycleSchema = new Schema<PaymentCycleDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },

    cycleNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    recipientName: {
      type: String,
      default: "Unknown Member",
    },

    // ✅ Status field for better cycle management
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'skipped'],
      default: 'upcoming',
    },

    // Legacy fields for backward compatibility
    isCompleted: {
      type: Boolean,
      default: false,
    },

    isSkipped: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
    },
    
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    startedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    startDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // ✅ Important: Include virtuals when converting to JSON
    toObject: { virtuals: true }
  }
);

/* ================================
   Indexes
================================ */
paymentCycleSchema.index({ groupId: 1, cycleNumber: 1 }, { unique: true });
paymentCycleSchema.index({ groupId: 1, status: 1 });
paymentCycleSchema.index({ groupId: 1, recipientId: 1 });

/* ================================
   Virtual Field: monthLabel
   This automatically formats the date to "January 2026"
================================ */
paymentCycleSchema.virtual('monthLabel').get(function () {
  if (!this.dueDate) return 'Pending Date';
  return this.dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

/* ================================
   Pre-save Hook: Sync status with legacy fields & Accurate Month Calculation
================================ */
paymentCycleSchema.pre('save', async function (this: PaymentCycleDocument) {
  // ✅ LOGIC 1: Auto-calculate dueDate for new cycles with ACCURATE month calculation
  if (this.isNew && !this.dueDate) {
    const group = await Group.findById(this.groupId);
    if (group && group.startDate) {
      // Create a fresh date object based on group start
      const targetDate = new Date(group.startDate);
      
      // Calculate offset based on cycle number (Cycle 1 = 0 offset)
      const offset = this.cycleNumber - 1;

      if (group.frequency === 'monthly') {
        // ✅ Correct way to add months (Handles Feb, Leap years, etc.)
        targetDate.setMonth(targetDate.getMonth() + offset);
      } else if (group.frequency === 'weekly') {
        targetDate.setDate(targetDate.getDate() + (offset * 7));
      } else if (group.frequency === 'daily') {
        targetDate.setDate(targetDate.getDate() + offset);
      } else {
        // Fallback to your original logic for other frequencies
        const durationMap: Record<string, number> = {
          daily: 1,
          weekly: 7,
          monthly: 30,
        };
        const days = durationMap[group.frequency] * offset;
        targetDate.setDate(targetDate.getDate() + days);
      }

      this.dueDate = targetDate;
    }
  }

  // ✅ LOGIC 2: SYNC LOGIC: Keep status as source of truth
  if (this.isModified('status')) {
    if (this.status === 'skipped') {
      this.isSkipped = true;
      this.isCompleted = false;
      if (!this.completedAt) this.completedAt = new Date();
    } else if (this.status === 'completed') {
      this.isCompleted = true;
      this.isSkipped = false;
      if (!this.completedAt) this.completedAt = new Date();
    } else if (this.status === 'active') {
      this.isCompleted = false;
      this.isSkipped = false;
      this.completedAt = undefined;
    } else if (this.status === 'upcoming') {
      this.isCompleted = false;
      this.isSkipped = false;
      this.completedAt = undefined;
    }
  }
  
  // ✅ LOGIC 3: Backward compatibility: If legacy fields modified, update status
  else if (this.isModified('isSkipped') || this.isModified('isCompleted')) {
    if (this.isSkipped) {
      this.status = 'skipped';
      this.isCompleted = false;
    } else if (this.isCompleted) {
      this.status = 'completed';
      this.isSkipped = false;
    } else {
      // If not skipped/completed, default to active
      this.status = 'active';
    }
  }
});

/* ================================
   Model Export
================================ */
export const PaymentCycle =
  mongoose.models.PaymentCycle ||
  mongoose.model<PaymentCycleDocument>(
    'PaymentCycle',
    paymentCycleSchema
  );