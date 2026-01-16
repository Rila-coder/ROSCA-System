import mongoose from 'mongoose';

export enum GroupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum GroupStatus {
  FORMING = 'forming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface IGroup {
  _id?: string; // Changed to string for frontend consistency
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: GroupFrequency;
  duration: number;
  startDate: Date;
  endDate?: Date;
  status: GroupStatus;
  inviteCode: string;
  leaderId: string | mongoose.Types.ObjectId;
  subLeaderIds: (string | mongoose.Types.ObjectId)[];
  currentCycle: number;
  totalAmount: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// GroupMember interface should be in a separate file or defined here if needed
// export interface IGroupMember {
//   _id?: string;
//   groupId: string | mongoose.Types.ObjectId;
//   userId: string | mongoose.Types.ObjectId;
//   joinedAt: Date;
//   isActive: boolean;
//   // ... other GroupMember properties
// }