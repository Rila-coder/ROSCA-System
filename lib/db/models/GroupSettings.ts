import mongoose, { Schema } from 'mongoose';

export interface GroupSettingsDocument extends mongoose.Document {
  groupId: mongoose.Types.ObjectId;
  
  // General Settings
  groupName: string;
  description: string;
  contributionAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  
  // Security/Rules
  requirePaymentConfirmation: boolean;
  requireApproval: boolean;
  maxMembers: number;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  ifscCode: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const groupSettingsSchema = new Schema<GroupSettingsDocument>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      unique: true,
    },
    
    // Core Sync Fields
    groupName: { type: String, required: true },
    description: { type: String, default: '' },
    contributionAmount: { type: Number, required: true, min: 1 },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly'], 
      default: 'monthly' 
    },
    
    // Rules
    requirePaymentConfirmation: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 20, min: 2, max: 100 },
    
    // Bank Details
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
  },
  { timestamps: true }
);

groupSettingsSchema.index({ groupId: 1 });

export const GroupSettings =
  mongoose.models.GroupSettings ||
  mongoose.model<GroupSettingsDocument>('GroupSettings', groupSettingsSchema);