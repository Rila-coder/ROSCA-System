import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';
import { Group } from '@/lib/db/models/Group';
import { verifyAuthToken } from '@/lib/utils/auth';
import { sendNotification, sendNotificationToAllMembers } from '@/lib/utils/notifications';
import { NotificationType } from '@/types/notification';

// Helper: Update Group Stats
async function updateGroupStats(groupId: string) {
  try {
    const memberCount = await GroupMember.countDocuments({
      groupId,
      status: { $in: ['active', 'pending'] }
    });

    const group = await Group.findById(groupId);
    if (!group) return;

    let daysToAdd = 0;
    const frequency = group.frequency?.toLowerCase() || 'monthly';
    
    if (frequency === 'daily') daysToAdd = memberCount;
    else if (frequency === 'weekly') daysToAdd = memberCount * 7;
    else if (frequency === 'monthly') daysToAdd = memberCount * 30;

    const newEndDate = new Date(group.startDate);
    newEndDate.setDate(newEndDate.getDate() + daysToAdd);

    await Group.findByIdAndUpdate(groupId, {
      duration: memberCount,
      endDate: newEndDate,
      totalAmount: group.contributionAmount * memberCount
    });
  } catch (err) {
    console.error("Failed to update group stats:", err);
  }
}

// =====================================================================
// GET: Fetch ALL Members (Prioritizing Snapshot Data)
// =====================================================================
export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myMemberships = await GroupMember.find({ userId: user._id }).populate('groupId', 'name');
    const myGroupIds = myMemberships.map(m => m.groupId._id || m.groupId);

    const allGroupMembers = await GroupMember.find({ groupId: { $in: myGroupIds } })
      .populate('userId', 'name email phone avatar') 
      .populate('groupId', 'name');

    const payments = await Payment.find({
      groupId: { $in: myGroupIds },
      status: { $in: ['paid', 'pending', 'overdue'] }
    });

    const membersMap = new Map();

    allGroupMembers.forEach((gm: any) => {
      let uniqueKey = '';
      
      // Data Resolution Strategy:
      // 1. Use Group-Specific Snapshot (gm.name) if available.
      // 2. Fallback to Global User Profile (gm.userId.name) if snapshot is missing.
      // 3. Fallback to 'Unknown'/'N/A'.
      
      const displayName = gm.name || (gm.userId ? gm.userId.name : 'Guest Member');
      const displayEmail = gm.email || (gm.userId ? gm.userId.email : 'N/A');
      const displayPhone = gm.phone || (gm.userId ? gm.userId.phone : 'N/A');
      const avatarUrl = gm.userId ? gm.userId.avatar : null;

      if (gm.userId) {
        uniqueKey = gm.userId._id.toString();
      } else {
        uniqueKey = `guest-${gm._id.toString()}`;
      }

      if (!membersMap.has(uniqueKey)) {
        membersMap.set(uniqueKey, {
          id: uniqueKey,
          name: displayName,
          email: displayEmail,
          phone: displayPhone,
          avatar: avatarUrl,
          joinDate: gm.createdAt,
          totalPaid: 0,
          totalDue: 0,
          memberships: []
        });
      }

      const member = membersMap.get(uniqueKey);
      member.memberships.push({
        groupId: gm.groupId._id.toString(),
        groupName: gm.groupId.name,
        role: gm.role,
        status: gm.status,
        membershipId: gm._id.toString(),
        // Pass snapshot data explicitly for editing forms
        snapshotName: gm.name,
        snapshotEmail: gm.email,
        snapshotPhone: gm.phone,
        groupContext: { role: gm.role } 
      });
    });

    // Aggregate Payments
    payments.forEach((p: any) => {
      // Try mapping via MemberID first (more accurate)
      if (p.memberId) {
         // Find which user/guest owns this memberId
         // (In a real app, you'd map memberId -> userId, but here we simplify based on your existing structure)
      }
      
      // Fallback: Map via UserID
      if (p.userId) {
         const targetId = p.userId.toString();
         if (membersMap.has(targetId)) {
            const member = membersMap.get(targetId);
            if (p.status === 'paid') member.totalPaid += p.amount;
            else if (p.status === 'pending' || p.status === 'overdue') member.totalDue += p.amount;
         }
      }
    });

    return NextResponse.json({
      members: Array.from(membersMap.values()),
      currentUserId: user._id.toString(),
      currentUserName: user.name,
      myPermissions: myMemberships.map(m => ({ groupId: m.groupId._id.toString(), role: m.role }))
    });

  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// =====================================================================
// PUT: Update Member (Snapshot Only)
// =====================================================================
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const currentUser = await verifyAuthToken(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, groupId, name, email, phone, role } = body;

    if (!userId || !groupId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const myMembership = await GroupMember.findOne({ userId: currentUser._id, groupId });
    if (!myMembership || !['leader', 'sub_leader'].includes(myMembership.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    let targetMembership;
    const userIdStr = userId.toString();

    // Handle Guest vs Registered ID lookup
    if (userIdStr.startsWith('guest-')) {
        const realGroupMemberId = userIdStr.replace('guest-', '');
        targetMembership = await GroupMember.findOne({ _id: realGroupMemberId, groupId }).populate('groupId');
    } else {
        targetMembership = await GroupMember.findOne({ userId: userId, groupId }).populate('groupId');
        if (!targetMembership) {
             try {
                targetMembership = await GroupMember.findOne({ _id: userId, groupId }).populate('groupId');
             } catch (e) {}
        }
    }

    if (!targetMembership) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // Permission checks
    if (myMembership.role === 'sub_leader' && targetMembership.role === 'leader') {
      return NextResponse.json({ error: 'Sub-leaders cannot edit the Leader' }, { status: 403 });
    }
    if (role === 'leader' && myMembership.role !== 'leader') {
      return NextResponse.json({ error: 'Only a Leader can promote someone to Leader' }, { status: 403 });
    }

    // ✅ UPDATE LOGIC: Update the GroupMember Snapshot fields
    if (name) targetMembership.name = name;
    if (phone) targetMembership.phone = phone;
    if (email) targetMembership.email = email.toLowerCase().trim();
    
    // Legacy support for non-registered
    if (!targetMembership.userId) {
      targetMembership.pendingMemberDetails = {
        ...targetMembership.pendingMemberDetails,
        name: name || targetMembership.pendingMemberDetails?.name,
        email: email || targetMembership.pendingMemberDetails?.email,
        phone: phone || targetMembership.pendingMemberDetails?.phone,
      };
    }

    // Role updates
    const oldRole = targetMembership.role;
    if (role && role !== oldRole) {
       if (role === 'sub_leader') {
          const existingSub = await GroupMember.findOne({ groupId, role: 'sub_leader', _id: { $ne: targetMembership._id } });
          if (existingSub) return NextResponse.json({ error: 'Group already has a Sub-leader' }, { status: 400 });
       }
       
       // Notifications logic...
       try {
           const groupName = targetMembership.groupId?.name || 'the group';
           if (targetMembership.userId) {
               await sendNotification({
                   userId: targetMembership.userId.toString(),
                   type: NotificationType.GROUP,
                   title: 'Role Updated',
                   message: `Your role in "${groupName}" is now ${role}.`,
                   groupId,
                   priority: 'medium'
               });
           }
       } catch (err) { console.error("Notification error", err); }

       targetMembership.role = role;
    }

    await targetMembership.save();

    return NextResponse.json({ success: true, message: 'Member updated successfully' });

  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: error.message || 'Failed to update member' }, { status: 500 });
  }
}

// =====================================================================
// DELETE: Remove Member
// =====================================================================
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const currentUser = await verifyAuthToken(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const groupId = searchParams.get('groupId');

    if (!targetUserId || !groupId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const myMembership = await GroupMember.findOne({ userId: currentUser._id, groupId });
    if (!myMembership || !['leader', 'sub_leader'].includes(myMembership.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    let targetMembership;
    if (targetUserId.startsWith('guest-')) {
        const realId = targetUserId.replace('guest-', '');
        targetMembership = await GroupMember.findOne({ _id: realId, groupId }).populate('groupId');
    } else {
        targetMembership = await GroupMember.findOne({ userId: targetUserId, groupId }).populate('groupId');
    }

    if (!targetMembership) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (targetMembership.role === 'leader') return NextResponse.json({ error: 'Cannot remove the Leader' }, { status: 400 });
    
    const hasPaid = await Payment.findOne({ memberId: targetMembership._id, status: { $in: ['paid', 'late'] } });
    if (hasPaid) return NextResponse.json({ error: 'Cannot remove member who has made payments' }, { status: 400 });

    await GroupMember.findByIdAndDelete(targetMembership._id);
    await updateGroupStats(groupId);

    try {
        const groupName = targetMembership.groupId?.name || 'the group';
        await sendNotificationToAllMembers({
            groupId,
            type: NotificationType.GROUP,
            title: 'Member Removed',
            message: `${targetMembership.name} was removed from "${groupName}".`,
            priority: 'medium'
        });
    } catch (e) { console.error("Notification error", e); }

    return NextResponse.json({ success: true, message: 'Member removed successfully' });

  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}