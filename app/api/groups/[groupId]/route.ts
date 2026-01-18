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
import { sendNotification, sendNotificationToAllMembers } from '@/lib/utils/notifications';

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
      userId: user._id,
      status: { $ne: 'removed' } // Don't show if they removed themselves
    });

    // ACCESS RULE: Must be a Member OR the Leader
    if (!memberRecord && leaderIdStr !== userIdStr) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access Denied: You are not a member of this group' 
      }, { status: 403 });
    }

    // 4. Fetch Related Data
    const [members, currentCycle, completedCyclesCount] = await Promise.all([
      GroupMember.find({ groupId: group._id, status: { $ne: 'removed' } })
        .populate('userId', 'name email avatar phone')
        .sort('memberNumber'),
      PaymentCycle.findOne({ groupId: group._id, isCompleted: false, isSkipped: false })
        .populate('recipientId', 'name email avatar')
        .sort('cycleNumber'),
      // ✅ Count actual completed cycles for accurate progress bar
      PaymentCycle.countDocuments({ 
        groupId: group._id, 
        $or: [{ status: 'completed' }, { status: 'skipped' }, { isCompleted: true }, { isSkipped: true }] 
      })
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

    // Check completion status based on cycles vs duration
    const isActuallyCompleted = group.status === 'completed' || (group.duration > 0 && completedCyclesCount >= group.duration);

    // 6. Final Response
    return NextResponse.json({ 
      success: true,
      group: {
        ...serializeDocument(group),
        memberCount: members.length,
        collectedAmount: totalCollected,
        activeMemberCount: activeMembersCount,
        // ✅ Send completed count to frontend for accurate progress bar
        completedCyclesCount: completedCyclesCount, 
        isActuallyCompleted: isActuallyCompleted
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
   DELETE: Delete Group (Leader) OR Leave Group (Member)
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

    const params = await context.params;
    const groupId = params.groupId || params.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid Group ID' }, { status: 400 });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isLeader = group.leaderId.toString() === user._id.toString();

    // =================================================================
    // SCENARIO 1: LEADER DELETING (DELETES EVERYTHING)
    // =================================================================
    if (isLeader) {
      // Get all active members for notification before deleting
      const activeMembers = await GroupMember.find({ 
        groupId: group._id,
        status: { $ne: 'removed' }
      }).populate('userId', '_id name email');

      const groupName = group.name;
      const leaderName = user.name;

      // Notify Members
      try {
        const memberUserIds = activeMembers
          .map(member => member.userId?._id?.toString())
          .filter(id => id && id !== user._id.toString());

        if (memberUserIds.length > 0) {
          await sendNotificationToAllMembers({
            groupId: groupId,
            excludeUserId: user._id.toString(),
            type: NotificationType.SYSTEM,
            title: 'Group Deleted',
            message: `The group "${groupName}" has been permanently deleted by the Leader ${leaderName}.`,
            priority: 'high',
            data: {
              groupName: groupName,
              deletedBy: leaderName,
              deletedAt: new Date().toISOString()
            }
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send deletion notifications:', notificationError);
      }

      // Create Audit Log
      try {
        await AuditLog.create({
          action: 'GROUP_DELETED',
          userId: user._id,
          groupId: group._id,
          details: {
            groupName: group.name,
            leaderName: user.name,
            deletedAt: new Date(),
          },
          timestamp: new Date()
        });
      } catch (auditError) { console.warn(auditError); }

      console.log(`🗑️ Deleting Group: ${group.name} (${groupId})`);

      // ✅ CASCADE DELETE EVERYTHING
      await Promise.all([
        GroupMember.deleteMany({ groupId }),
        Payment.deleteMany({ groupId }),
        PaymentCycle.deleteMany({ groupId }),
        GroupSettings.deleteMany({ groupId }),
        AuditLog.deleteMany({ groupId }),
        Group.findByIdAndDelete(groupId)
      ]);

      return NextResponse.json({ 
        success: true, 
        message: 'Group and all associated data deleted successfully. Members notified.' 
      });
    }

    // =================================================================
    // SCENARIO 2: MEMBER LEAVING (REMOVES FROM THEIR LIST ONLY)
    // =================================================================
    else {
      // Check if group is completed. If completed, members can delete it from their view.
      // If active, they are "leaving" the group.
      
      // Update status to 'removed' instead of hard delete so history is preserved if needed,
      // but it won't show up in their list anymore.
      await GroupMember.findOneAndUpdate(
        { groupId: group._id, userId: user._id },
        { status: 'removed' }
      );

      // Notify User they removed it
      await sendNotification({
        userId: user._id,
        type: NotificationType.SYSTEM,
        title: 'Group Removed',
        message: `You have successfully removed "${group.name}" from your dashboard.`,
        priority: 'low'
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Group removed from your dashboard.' 
      });
    }

  } catch (error: any) {
    console.error('🔴 API Error [DELETE Group]:', error);
    return NextResponse.json({ 
      error: 'Failed to delete group', 
      details: error.message 
    }, { status: 500 });
  }
}