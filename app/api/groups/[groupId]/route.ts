import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import mongoose from 'mongoose';

// Import all models
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { GroupSettings } from '@/lib/db/models/GroupSettings';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { NotificationType } from '@/types/notification';
import { sendNotificationToAllMembers } from '@/lib/utils/notifications';

// Interface for dynamic params
interface Params {
  params: Promise<any>; 
}

// Serialization helper
function serializeDocument(doc: any): any {
  if (!doc) return doc;
  const data = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && (value instanceof mongoose.Types.ObjectId || value._bsontype === 'ObjectID')) {
      return value.toString();
    }
    return value;
  }));
}

/* ======================================================================
   GET: Fetch Single Group Data
   SECURITY: Members, Sub-Leaders, Leader
====================================================================== */
export async function GET(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // ✅ FIXED: Safely extract ID regardless of param name ([id] vs [groupId])
    const params = await context.params;
    const groupId = params.groupId || params.id;

    if (!groupId) {
       return NextResponse.json({ success: false, error: 'Invalid Group ID' }, { status: 400 });
    }
    
    // 2. Resolve Group
    let group;
    if (mongoose.Types.ObjectId.isValid(groupId)) {
      group = await Group.findById(groupId)
        .populate('leaderId', 'name email avatar phone')
        .populate('subLeaderIds', 'name email avatar phone');
    } else {
      // Fallback to Invite Code
      group = await Group.findOne({ inviteCode: groupId })
        .populate('leaderId', 'name email avatar phone')
        .populate('subLeaderIds', 'name email avatar phone');
    }

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // 3. Authorization Check (Is user a member?)
    const userIdStr = user._id.toString();
    const leaderIdStr = group.leaderId?._id?.toString() || group.leaderId?.toString();
    
    // Check if they are in the members list
    const memberRecord = await GroupMember.findOne({ 
      groupId: group._id, 
      userId: user._id 
    });

    // ACCESS RULE: Must be a Member OR the Leader
    if (!memberRecord && leaderIdStr !== userIdStr) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access Denied: You are not a member of this group' 
      }, { status: 403 });
    }

    // 4. Fetch Related Data
    const [members, currentCycle] = await Promise.all([
      GroupMember.find({ groupId: group._id })
        .populate('userId', 'name email avatar phone')
        .sort('memberNumber'),
      PaymentCycle.findOne({ groupId: group._id, isCompleted: false })
        .populate('recipientId', 'name email avatar')
        .sort('cycleNumber') // Get the earliest active/upcoming cycle
    ]);

    // Fetch payments based on cycle or group
    const paymentQuery = currentCycle 
      ? { $or: [{ cycleId: currentCycle._id }, { groupId: group._id, cycleId: null }] }
      : { groupId: group._id };

    const payments = await Payment.find(paymentQuery)
      .populate('userId', 'name email avatar')
      .sort('-createdAt')
      .limit(20);

    // 5. Calculate Stats
    const totalCollected = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const activeMembersCount = members.filter(m => m.status === 'active').length;

    // 6. Final Response
    return NextResponse.json({ 
      success: true,
      group: {
        ...serializeDocument(group),
        memberCount: members.length,
        collectedAmount: totalCollected,
        activeMemberCount: activeMembersCount,
      },
      members: members.map(m => serializeDocument(m)),
      currentCycle: serializeDocument(currentCycle),
      payments: payments.map(p => serializeDocument(p)),
      stats: {
        totalCollected,
        totalMembers: members.length,
        activeMembers: activeMembersCount,
      }
    });

  } catch (error: any) {
    console.error('🔴 API Error [GET Group]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        message: error.message 
      }, 
      { status: 500 }
    );
  }
}

/* ======================================================================
   DELETE: Delete Group & All Related Data
   SECURITY: ONLY LEADER
====================================================================== */
export async function DELETE(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ✅ FIXED: Safely extract ID
    const params = await context.params;
    const groupId = params.groupId || params.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid Group ID' }, { status: 400 });
    }

    // 2. Fetch Group & Check Ownership
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // 🔒 RBAC CHECK: Only the Leader can delete
    if (group.leaderId.toString() !== user._id.toString()) {
      return NextResponse.json({ 
        error: 'Forbidden: Only the Group Leader can delete this group.' 
      }, { status: 403 });
    }

    // Get all active members for notification
    const activeMembers = await GroupMember.find({ 
      groupId: group._id,
      status: 'active'
    }).populate('userId', '_id name email');

    const groupName = group.name;
    const leaderName = user.name;

    // ✅ NOTIFICATION: Notify all members about group deletion
    // Do this BEFORE actual deletion so notifications can be sent
    try {
      // Get member IDs for notifications (exclude the leader)
      const memberUserIds = activeMembers
        .map(member => member.userId?._id?.toString())
        .filter(id => id && id !== user._id.toString());

      // Send notifications to all members
      if (memberUserIds.length > 0) {
        // Note: sendNotificationToAllMembers handles sending to multiple users
        await sendNotificationToAllMembers({
          groupId: groupId,
          excludeUserId: user._id.toString(), // Don't notify the leader (they initiated it)
          type: NotificationType.SYSTEM,
          title: 'Group Deleted',
          message: `The group "${groupName}" has been permanently deleted by the Leader ${leaderName}. All group data has been removed.`,
          priority: 'high',
          data: {
            groupName: groupName,
            deletedBy: leaderName,
            deletedAt: new Date().toISOString(),
            memberCount: activeMembers.length
          }
        });
      }
    } catch (notificationError) {
      console.warn('Failed to send deletion notifications:', notificationError);
      // Continue with deletion even if notifications fail
    }

    // 3. Create Audit Log for deletion
    try {
      await AuditLog.create({
        action: 'GROUP_DELETED',
        userId: user._id,
        groupId: group._id,
        details: {
          groupName: group.name,
          leaderName: user.name,
          deletedAt: new Date(),
          memberCount: activeMembers.length
        },
        timestamp: new Date()
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    // 4. Perform Cascade Delete (Clean up everything)
    console.log(`🗑️ Deleting Group: ${group.name} (${groupId})`);

    // Delete all related data in parallel
    await Promise.all([
      // Delete all members
      GroupMember.deleteMany({ groupId }),
      
      // Delete all payments
      Payment.deleteMany({ groupId }),
      
      // Delete all cycles
      PaymentCycle.deleteMany({ groupId }),
      
      // Delete settings
      GroupSettings.deleteMany({ groupId }),
      
      // Delete audit logs for this group
      AuditLog.deleteMany({ groupId }),
      
      // Delete the group itself
      Group.findByIdAndDelete(groupId)
    ]);

    console.log(`✅ Group ${groupId} deleted successfully.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Group and all associated data deleted successfully. All members have been notified.' 
    });

  } catch (error: any) {
    console.error('🔴 API Error [DELETE Group]:', error);
    return NextResponse.json({ 
      error: 'Failed to delete group', 
      details: error.message 
    }, { status: 500 });
  }
}