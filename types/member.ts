import { IUser } from './user';

export interface GroupMember {
  _id: string;
  groupId: string;
  userId?: string | IUser | null; // Null if not registered
  
  // ✅ SNAPSHOT FIELDS (The Fix)
  name: string;
  email: string;
  phone: string;
  
  role: 'leader' | 'sub_leader' | 'member';
  status: 'active' | 'pending' | 'removed' | 'invited';
  memberNumber?: number;
  
  // Financial tracking
  hasReceived: boolean;
  receivedCycle?: number;
  receivedAt?: Date;
  totalPaid: number;
  totalReceived: number;
  
  createdAt: Date;
  updatedAt: Date;
}