import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { Group } from '@/lib/db/models/Group';
import { NotificationType } from '@/types/notification';
import { sendNotification, sendNotificationToAllMembers } from '@/lib/utils/notifications';

/* ======================================================================
   GET: Fetch a single member
====================================================================== */
export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const params = await context.params;
    const memberId = params.memberId;

    const member = await GroupMember.findById(memberId).populate('userId', 'name email avatar phone');
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ======================================================================
   PATCH: Update a member (Name, Phone, Role) WITH NOTIFICATIONS - FIXED
====================================================================== */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    // Handle both naming conventions just in case
    const groupId = params.groupsId || params.groupId || params.id;
    const memberId = params.memberId;
    const data = await request.json();

    if (!groupId || !memberId) {
       return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Authorization: Only Leader/Sub-leader can update others
    const currentMember = await GroupMember.findOne({ groupId, userId: currentUser._id });
    if (!currentMember || !['leader', 'sub_leader'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const memberToUpdate = await GroupMember.findById(memberId);
    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get group info for notifications
    const group = await Group.findById(groupId).select('name');
    
    // Track role change for notifications
    const oldRole = memberToUpdate.role;
    const newRole = data.role;
    const roleChanged = newRole && newRole !== oldRole;
    
    // Get member's user info for notifications
    let memberUser = null;
    if (memberToUpdate.userId) {
      memberUser = await User.findById(memberToUpdate.userId).select('name email');
    }

    // Role Validations
    if (data.role) {
      if (memberToUpdate.role === 'leader' && data.role !== 'leader') {
        return NextResponse.json({ error: 'Cannot change the Leader role' }, { status: 400 });
      }
      
      // Only Leader can assign/change Sub-leader roles
      if (currentMember.role !== 'leader' && ['sub_leader', 'leader'].includes(data.role)) {
        return NextResponse.json({ 
          error: 'Only the Leader can assign Sub-leader or Leader roles' 
        }, { status: 403 });
      }
      
      if (data.role === 'sub_leader') {
        const existingSubLeader = await GroupMember.findOne({ 
          groupId, 
          role: 'sub_leader', 
          _id: { $ne: memberId } 
        });
        if (existingSubLeader && memberToUpdate.role !== 'sub_leader') {
          return NextResponse.json({ error: 'Only one sub-leader is allowed' }, { status: 400 });
        }
      }
      memberToUpdate.role = data.role;
    }

    // ==============================================
    // ✅ GEMINI'S FIX: UPDATE SNAPSHOT DATA ONLY
    // DO NOT UPDATE USER TABLE - THIS WAS THE BUG
    // ==============================================
    
    // ❌ REMOVED THE PROBLEMATIC CODE THAT UPDATES USER TABLE
    // This was the bug: await User.findByIdAndUpdate(memberToUpdate.userId, {...})
    
    // ✅ CORRECTED: Only update GroupMember snapshot data
    if (data.name) memberToUpdate.name = data.name;
    if (data.phone) memberToUpdate.phone = data.phone.trim();
    
    // Email updates - handle with caution (usually disabled on frontend)
    if (data.email) {
      // Only update email in snapshot, NOT in User table
      memberToUpdate.email = data.email.toLowerCase().trim();
    }

    // ✅ ALSO UPDATE pendingMemberDetails for backward compatibility
    if (!memberToUpdate.userId) {
      memberToUpdate.pendingMemberDetails = {
        ...memberToUpdate.pendingMemberDetails,
        name: data.name || memberToUpdate.pendingMemberDetails?.name,
        email: data.email ? data.email.toLowerCase().trim() : memberToUpdate.pendingMemberDetails?.email,
        phone: data.phone ? data.phone.trim() : memberToUpdate.pendingMemberDetails?.phone,
      };
    }

    await memberToUpdate.save();

    // ==============================================
    // ✅ NOTIFICATION SECTION - NOTIFY ALL MEMBERS
    // ==============================================
    if (roleChanged) {
      const groupName = group?.name || 'the group';
      const memberName = memberUser?.name || memberToUpdate.name || 'Member';
      const currentUserName = currentUser.name;
      
      try {
        // 1. Notify the SPECIFIC MEMBER whose role changed
        if (memberToUpdate.userId) {
          let title = '';
          let msg = '';
          
          if (newRole === 'sub_leader') {
             title = 'Promoted to Sub-Leader';
             msg = `You have been promoted to Sub-Leader in "${groupName}" by ${currentUserName}.`;
          } else if (newRole === 'leader') {
            title = 'You are now the Leader';
            msg = `You have been assigned as the new Leader of "${groupName}".`;
          } else if (newRole === 'member' && oldRole === 'sub_leader') {
             title = 'Role Changed';
             msg = `Your role in "${groupName}" has been changed to Member.`;
          }

          if (title && msg) {
            await sendNotification({
              userId: memberToUpdate.userId.toString(),
              type: NotificationType.GROUP,
              title: title,
              message: msg,
              groupId: groupId,
              priority: 'high'
            });
          }
        }
        
        // 2. ✅ NOTIFY ALL OTHER GROUP MEMBERS (Broadcasting the change)
        let groupTitle = '';
        let groupMsg = '';
        
        if (newRole === 'sub_leader') {
          groupTitle = 'New Sub-Leader';
          groupMsg = `${currentUserName} promoted ${memberName} to Sub-Leader in "${groupName}".`;
        } else if (newRole === 'leader') {
          groupTitle = 'New Group Leader';
          groupMsg = `${currentUserName} assigned ${memberName} as the new Leader of "${groupName}".`;
        } else if (newRole === 'member' && oldRole === 'sub_leader') {
          groupTitle = 'Sub-Leader Changed';
          groupMsg = `${memberName} is no longer a Sub-Leader in "${groupName}".`;
        }
        
        if (groupTitle && groupMsg) {
          await sendNotificationToAllMembers({
            groupId: groupId,
            excludeUserId: memberToUpdate.userId?.toString(), // Don't notify the person again
            type: NotificationType.GROUP,
            title: groupTitle,
            message: groupMsg,
            priority: 'medium'
          });
        }
        
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
      }
    }

    const updatedMember = await GroupMember.findById(memberId)
      .populate('userId', 'name email avatar phone');
    
    return NextResponse.json({ 
      success: true, 
      member: updatedMember, 
      message: roleChanged ? 
        `Member role changed from ${oldRole} to ${newRole}` : 
        'Member updated successfully (Group Profile Only)',
      roleChanged: roleChanged,
      oldRole: oldRole,
      newRole: newRole
    });

  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ 
      error: 'Failed to update member', 
      details: error.message 
    }, { status: 500 });
  }
}

/* ======================================================================
   DELETE: Remove a member (With Strict Validation & Stats Update)
====================================================================== */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const memberId = params.memberId;

    if (!groupId || !memberId) {
        return NextResponse.json({ error: 'Group ID missing' }, { status: 400 });
    }

    // 1. Authorization
    const currentGroupMember = await GroupMember.findOne({ groupId, userId: currentUser._id });
    if (!currentGroupMember || !['leader', 'sub_leader'].includes(currentGroupMember.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // 2. Find Member
    const memberToRemove = await GroupMember.findById(memberId);
    if (!memberToRemove) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (memberToRemove.role === 'leader') {
      return NextResponse.json({ error: 'Cannot remove the Leader' }, { status: 400 });
    }

    // ----------------------------------------------------------------------
    // 🛑 VALIDATION CHECKS
    // ----------------------------------------------------------------------

    // Check 1: Active/Completed Cycles
    const cycleQuery: any = { 
        groupId: groupId,
        status: { $in: ['active', 'completed', 'skipped', 'upcoming'] }, 
        $or: [
            { cycleNumber: memberToRemove.memberNumber },
        ]
    };
    if (memberToRemove.userId) {
        cycleQuery.$or.push({ recipientId: memberToRemove.userId });
    }

    const assignedCycle = await PaymentCycle.findOne(cycleQuery);
    if (assignedCycle) {
        let statusMsg = assignedCycle.status;
        if (assignedCycle.isCompleted) statusMsg = "Completed";
        else if (assignedCycle.isSkipped) statusMsg = "Skipped";
        else if (assignedCycle.status === 'active') statusMsg = "Active";

        return NextResponse.json({ 
            error: 'Cannot remove member', 
            message: `This member is assigned to Cycle #${assignedCycle.cycleNumber} (${statusMsg}). You cannot delete a member who has an assigned cycle.` 
        }, { status: 400 });
    }

    // Check 2: Payments Made
    const hasPaid = await Payment.findOne({
        memberId: memberToRemove._id,
        status: { $in: ['paid', 'late'] }
    });
    if (hasPaid) {
        return NextResponse.json({ 
            error: 'Cannot remove member', 
            message: 'This member has already made payments. Removing them would break the accounting.' 
        }, { status: 400 });
    }

    // Check 3: Incoming Payments (Rare case where cycle doc missing but payments exist)
    const theirCycle = await PaymentCycle.findOne({
        groupId,
        cycleNumber: memberToRemove.memberNumber
    });
    if (theirCycle) {
        const paymentsReceived = await Payment.findOne({
            cycleId: theirCycle._id,
            status: { $in: ['paid', 'late'] }
        });
        if (paymentsReceived) {
             return NextResponse.json({ 
                error: 'Cannot remove member', 
                message: `Other members have already made payments towards this member's cycle.` 
            }, { status: 400 });
        }
        // Cleanup empty cycle
        await PaymentCycle.findByIdAndDelete(theirCycle._id);
        await Payment.deleteMany({ cycleId: theirCycle._id });
    }

    // ----------------------------------------------------------------------
    // ✅ SAFE TO DELETE
    // ----------------------------------------------------------------------

    // 1. Clean up PENDING payments
    await Payment.deleteMany({ 
        memberId: memberToRemove._id, 
        status: 'pending' 
    });

    // 2. Permanently Delete Member
    await GroupMember.findByIdAndDelete(memberId);

    // 3. ✅ CRITICAL: UPDATE GROUP DURATION & CYCLES
    // This updates the header count immediately
    await updateGroupStats(groupId);

    // ✅ NOTIFICATION: Notify all members about member removal
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';
    const memberName = memberToRemove.name || 'Member';

    await sendNotificationToAllMembers({
      groupId: groupId,
      type: NotificationType.GROUP,
      title: 'Member Removed',
      message: `${memberName} has been removed from "${groupName}" by the leader.`,
      priority: 'medium'
    });

    console.log(`✅ Member ${memberId} deleted & stats updated`);

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });

  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json({ 
      error: 'Failed to remove member', 
      details: error.message 
    }, { status: 500 });
  }
}

// ======================================================================
// ✅ HELPER FUNCTION: Recalculate Group Data (Same as in POST)
// ======================================================================
async function updateGroupStats(groupId: string) {
  try {
    // 1. Count remaining members
    const memberCount = await GroupMember.countDocuments({
      groupId,
      status: { $in: ['active', 'pending'] }
    });

    // 2. Fetch Group
    const group = await Group.findById(groupId);
    if (!group) return;

    // 3. Recalculate End Date
    let daysToAdd = 0;
    const frequency = group.frequency?.toLowerCase() || 'monthly';
    
    if (frequency === 'daily') daysToAdd = memberCount;
    else if (frequency === 'weekly') daysToAdd = memberCount * 7;
    else if (frequency === 'monthly') daysToAdd = memberCount * 30;

    const newEndDate = new Date(group.startDate);
    newEndDate.setDate(newEndDate.getDate() + daysToAdd);

    // 4. Update the Group Document
    await Group.findByIdAndUpdate(groupId, {
      duration: memberCount, // ✅ Sync Duration (Total Cycles) to match Member Count
      endDate: newEndDate,
      totalAmount: group.contributionAmount * memberCount // Sync Pool Amount
    });
    
    console.log(`✅ Group ${groupId} stats updated. New Duration: ${memberCount}`);
  } catch (err) {
    console.error("Failed to update group stats:", err);
  }
}