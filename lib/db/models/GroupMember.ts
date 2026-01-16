import mongoose from 'mongoose';

export enum MemberRole {
  LEADER = 'leader',
  SUB_LEADER = 'sub_leader',
  MEMBER = 'member',
}

export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INVITED = 'invited',
  REMOVED = 'removed',
}

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Group', 
      required: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    
    // ✅ SNAPSHOT DATA (From Gemini's update)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER,
    },
    status: {
      type: String,
      enum: Object.values(MemberStatus),
      default: MemberStatus.PENDING,
    },
    memberNumber: { type: Number, default: null },
    
    // Financials
    hasReceived: { type: Boolean, default: false },
    receivedCycle: { type: Number, default: 0 },
    receivedAt: { type: Date },
    totalPaid: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    
    // ✅ From your original code but removed by Gemini:
    // joinedAt: { type: Date, default: Date.now }, // Gemini removed this
    // leftAt: Date, // Gemini removed this
    // nextPaymentDue: Date, // Gemini removed this
    // assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Gemini removed this
    
    // ⚠️ Gemini removed pendingMemberDetails object and replaced with individual fields above
  },
  { 
    timestamps: true,
    // Gemini removed these virtuals options
    // toJSON: { virtuals: true }, 
    // toObject: { virtuals: true } 
  }
);

// ✅ From Gemini's update: Unique email per group (prevents duplicate members in one group)
groupMemberSchema.index({ groupId: 1, email: 1 }, { unique: true });

// ⚠️ Gemini removed your original partial index:
// groupMemberSchema.index({ 
//   groupId: 1, 
//   memberNumber: 1 
// }, { 
//   unique: true,
//   partialFilterExpression: { status: { $ne: 'removed' } } 
// });

// ⚠️ Gemini removed your virtual fields:
// groupMemberSchema.virtual('memberName').get(function() {
//   if (this.userId && (this.userId as any).name) return (this.userId as any).name;
//   return this.pendingMemberDetails?.name || 'Unknown Member';
// });
// 
// groupMemberSchema.virtual('memberEmail').get(function() {
//   if (this.userId && (this.userId as any).email) return (this.userId as any).email;
//   return this.pendingMemberDetails?.email || '';
// });

export const GroupMember = mongoose.models.GroupMember || mongoose.model('GroupMember', groupMemberSchema);

export interface IGroupMember {
  _id?: string | mongoose.Types.ObjectId;
  groupId: string | mongoose.Types.ObjectId;
  userId?: string | mongoose.Types.ObjectId | null;
  
  // Snapshot data
  name: string;
  email: string;
  phone: string;
  
  role: MemberRole;
  status: MemberStatus;
  memberNumber?: number | null;
  
  // Financials
  hasReceived: boolean;
  receivedCycle: number;
  receivedAt?: Date;
  totalPaid: number;
  totalReceived: number;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}