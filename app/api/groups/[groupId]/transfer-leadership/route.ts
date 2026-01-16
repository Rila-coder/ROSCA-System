import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { NotificationType } from '@/types/notification';
import { sendNotification, sendNotificationToAllMembers } from '@/lib/utils/notifications';

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    
    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;

    if (!groupId) {
       return NextResponse.json({ error: 'Invalid Group ID' }, { status: 400 });
    }

    const { newLeaderId } = await request.json();

    // Fetch the Group
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // 1. Verify Current Leader (Security Check)
    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only the current leader can transfer ownership' }, { status: 403 });
    }

    // 2. Fetch the Target Member Details
    const newLeaderMember = await GroupMember.findOne({ 
      groupId: group._id, 
      userId: newLeaderId
    });

    if (!newLeaderMember) {
      return NextResponse.json({ error: 'Selected user is not a member of this group' }, { status: 400 });
    }

    // 3. ✅ CRITICAL CHECK: Is this person a Sub-leader?
    // We check the 'role' field directly from the database record.
    if (newLeaderMember.role === 'sub_leader') {
      return NextResponse.json({ 
        error: 'This member is already a Sub-leader. Remove their Sub-leader position first, then select them as Leader.' 
      }, { status: 400 });
    }

    // 4. Check if they are Active
    if (newLeaderMember.status !== 'active') {
      return NextResponse.json({ 
        error: 'Selected user is not an active member. Only active members can become leaders.' 
      }, { status: 400 });
    }

    // Get user details for notifications
    const newLeaderUser = await User.findById(newLeaderId).select('name email');
    if (!newLeaderUser) {
      return NextResponse.json({ error: 'Selected user not found' }, { status: 404 });
    }

    const oldLeaderName = user.name;
    const newLeaderName = newLeaderUser.name;
    const groupName = group.name;

    // --- PROCEED WITH TRANSFER ---

    // 5. Demote Current Leader -> Member
    await GroupMember.findOneAndUpdate(
      { groupId: group._id, userId: user._id },
      { role: 'member' }
    );

    // 6. Promote New Leader -> Leader
    await GroupMember.findOneAndUpdate(
      { groupId: group._id, userId: newLeaderId },
      { role: 'leader' }
    );

    // 7. Update Group Table Leader ID
    group.leaderId = newLeaderId;
    
    // Safety cleanup: ensure new leader isn't in subLeaderIds array just in case
    if (group.subLeaderIds && group.subLeaderIds.length > 0) {
      group.subLeaderIds = group.subLeaderIds.filter(
        (id: any) => id.toString() !== newLeaderId.toString()
      );
    }

    await group.save();

    // ✅ NOTIFICATION LOGIC (From Gemini's code)
    // 1. Notify New Leader Specifically
    await sendNotification({
      userId: newLeaderId,
      type: NotificationType.SYSTEM,
      title: 'You are the new Leader!',
      message: `${oldLeaderName} has transferred ownership of "${groupName}" to you.`,
      groupId: groupId,
      priority: 'high'
    });

    // 2. Notify Old Leader (Current User)
    await sendNotification({
      userId: user._id.toString(),
      type: NotificationType.SYSTEM,
      title: 'Leadership Transferred',
      message: `You have successfully transferred "${groupName}" to ${newLeaderName}.`,
      groupId: groupId,
      priority: 'medium'
    });

    // 3. Notify All Other Members
    await sendNotificationToAllMembers({
      groupId: groupId,
      excludeUserId: newLeaderId, // Already notified above
      type: NotificationType.GROUP,
      title: 'New Group Leader',
      message: `${oldLeaderName} has transferred leadership of "${groupName}" to ${newLeaderName}.`,
      priority: 'high'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Leadership transferred successfully. All members have been notified.' 
    });

  } catch (error: any) {
    console.error('Leadership transfer error:', error);
    return NextResponse.json({ 
      error: 'Failed to transfer leadership',
      details: error.message 
    }, { status: 500 });
  }
}