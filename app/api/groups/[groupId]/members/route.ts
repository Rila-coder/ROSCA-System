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
   GET: Fetch all members of a group
====================================================================== */
export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;

    if (!groupId) return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 });

    // Fetch members with user details populated
    const members = await GroupMember.find({ groupId })
      .populate("userId", "name email avatar phone")
      .sort("memberNumber");

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

/* ======================================================================
   POST: Add a new member - UPDATED WITH SNAPSHOT DATA
====================================================================== */
/* ======================================================================
   POST: Add a new member - UPDATED WITH MAX MEMBER CHECK
====================================================================== */
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const data = await request.json();

    const { email, name, phone, assignedNumber, role } = data;

    if (!email || !name || !phone) {
      return NextResponse.json({ error: "Name, Email, and Phone are required" }, { status: 400 });
    }

    // 1. Authorization Check
    const groupMember = await GroupMember.findOne({
      groupId,
      userId: currentUser._id,
    });
    if (
      !groupMember ||
      (groupMember.role !== "leader" && groupMember.role !== "sub_leader")
    ) {
      return NextResponse.json(
        { error: "Not authorized to add members" },
        { status: 403 }
      );
    }

    // 2. ✅ CRITICAL FIX: Check Max Members Limit
    // Fetch group settings to get maxMembers limit
    // We import GroupSettings model (ensure it's imported at top of file)
    const { GroupSettings } = await import('@/lib/db/models/GroupSettings');
    const settings = await GroupSettings.findOne({ groupId });
    
    // Default limit is 20 if settings not found
    const maxMembers = settings?.maxMembers || 20;

    // Count current active members
    const currentCount = await GroupMember.countDocuments({
      groupId,
      status: { $in: ['active', 'pending'] }
    });

    if (currentCount >= maxMembers) {
       return NextResponse.json({ 
          error: `Group limit reached (${maxMembers} members). Increase the limit in Group Settings to add more.` 
       }, { status: 400 });
    }

    // 3. Existing User Checks
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const existingMember = await GroupMember.findOne({ 
      groupId, 
      email: email.toLowerCase().trim() 
    });

    if (existingMember) {
      if (existingMember.status === "removed" || existingMember.status === "left") {
        existingMember.status = "pending";
        await existingMember.save();
        await updateGroupStats(groupId);
        return NextResponse.json({ success: true, message: "Member reactivated" });
      }
      return NextResponse.json(
        { error: "This person is already a member of this group" },
        { status: 400 }
      );
    }

    // 4. Create Member
    const lastMember = await GroupMember.findOne({ groupId }).sort("-memberNumber");
    const nextMemberNumber = assignedNumber || (lastMember?.memberNumber || 0) + 1;

    const member = await GroupMember.create({
      groupId: groupId,
      userId: existingUser ? existingUser._id : null,
      name: name,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      memberNumber: nextMemberNumber,
      role: role || "member",
      status: existingUser ? "active" : "pending",
      totalPaid: 0,
      totalReceived: 0,
      pendingMemberDetails: existingUser
        ? null
        : {
            name: name,
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
          },
    });

    await updateGroupStats(groupId);

    // 5. Notifications
    if (existingUser) {
      await sendNotification({
        userId: existingUser._id,
        type: NotificationType.GROUP,
        title: 'Added to Group',
        message: `Leader ${currentUser.name} added you to this group.`,
        groupId: groupId,
        priority: 'medium'
      });
    }

    await sendNotificationToAllMembers({
      groupId,
      excludeUserId: existingUser ? existingUser._id.toString() : null,
      type: NotificationType.GROUP,
      title: 'New Member',
      message: `Leader added a new member: ${name}.`,
      priority: 'low'
    });

    const populatedMember = await GroupMember.findById(member._id).populate(
      "userId",
      "name email avatar phone"
    );

    return NextResponse.json({
      success: true,
      member: populatedMember,
      message: "Member added successfully",
    });
  } catch (error: any) {
    console.error("Error adding member:", error);
    if (error.code === 11000)
      return NextResponse.json({ error: "Duplicate member error" }, { status: 400 });
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

/* ======================================================================
   PUT: Reorder Draw Numbers 
====================================================================== */
export async function PUT(
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
    const groupId = params.groupsId || params.groupId || params.id;
    const { members: updatedMembers } = await request.json();

    if (!updatedMembers || !Array.isArray(updatedMembers)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // 1. AUTHORIZATION: Only Group Leader can reorder
    const currentMember = await GroupMember.findOne({ groupId, userId: currentUser._id });
    if (!currentMember || currentMember.role !== 'leader') {
      return NextResponse.json({ 
        error: 'Only the group leader can reorder draw numbers' 
      }, { status: 403 });
    }

    // 2. VALIDATION: Draw numbers must be unique
    const numbers = updatedMembers.map((m: any) => m.memberNumber);
    const uniqueNumbers = new Set(numbers);
    if (numbers.length !== uniqueNumbers.size) {
      return NextResponse.json({ 
        error: 'Draw numbers must be unique. Duplicate numbers found.' 
      }, { status: 400 });
    }

    // 3. FETCH ALL MEMBERS FROM DATABASE
    const allMembers = await GroupMember.find({ groupId }).populate('userId', 'name email');
    
    // Added 'upcoming' to status array
    const allCycles = await PaymentCycle.find({ 
      groupId,
      status: { $in: ['active', 'completed', 'skipped', 'upcoming'] }
    });
    
    const allPayments = await Payment.find({ 
      groupId, 
      status: { $in: ['paid', 'late'] } 
    });

    const memberMap = new Map(allMembers.map(m => [m._id.toString(), m]));
    const cycleMap = new Map(allCycles.map(c => [c.cycleNumber, c]));
    const paymentsByMemberId = new Map();
    const paymentsByCycleNumber = new Map();

    allPayments.forEach(payment => {
      if (payment.memberId) {
        const memberPayments = paymentsByMemberId.get(payment.memberId.toString()) || [];
        memberPayments.push(payment);
        paymentsByMemberId.set(payment.memberId.toString(), memberPayments);
      }

      if (payment.cycleId) {
        const cycle = allCycles.find(c => c._id.toString() === payment.cycleId.toString());
        if (cycle) {
          const cyclePayments = paymentsByCycleNumber.get(cycle.cycleNumber) || [];
          cyclePayments.push(payment);
          paymentsByCycleNumber.set(cycle.cycleNumber, cyclePayments);
        }
      }
    });

    // 4. VALIDATE EACH MEMBER UPDATE
    const validationErrors: string[] = [];

    for (const updatedMember of updatedMembers) {
      const dbMember = memberMap.get(updatedMember._id);
      if (!dbMember) {
        validationErrors.push(`Member ${updatedMember._id} not found`);
        continue;
      }

      const oldNumber = dbMember.memberNumber;
      const newNumber = updatedMember.memberNumber;

      if (oldNumber === newNumber) continue;

      const currentCycle = cycleMap.get(oldNumber);
      if (currentCycle) {
        const cycleStatus = currentCycle.status;
        const hasPayments = paymentsByCycleNumber.has(oldNumber);

        if (['active', 'upcoming', 'completed', 'skipped'].includes(cycleStatus) || hasPayments) {
          validationErrors.push(
            `Cannot change Draw #${oldNumber} (${dbMember.name || dbMember.userId?.name || 'Member'}) - ` +
            `Cycle is ${cycleStatus}${hasPayments ? ' with payments' : ''}`
          );
          continue;
        }
      }

      const targetCycle = cycleMap.get(newNumber);
      if (targetCycle) {
        const targetStatus = targetCycle.status;
        const targetHasPayments = paymentsByCycleNumber.has(newNumber);

        if (['active', 'upcoming', 'completed', 'skipped'].includes(targetStatus) || targetHasPayments) {
          validationErrors.push(
            `Cannot assign Draw #${newNumber} - ` +
            `Target cycle is ${targetStatus}${targetHasPayments ? ' with payments' : ''}`
          );
          continue;
        }
      }

      const memberPayments = paymentsByMemberId.get(dbMember._id.toString());
      if (memberPayments && memberPayments.length > 0) {
        validationErrors.push(
          `Cannot change ${dbMember.name || dbMember.userId?.name || 'Member'}'s draw number - ` +
          `They have already made ${memberPayments.length} payment(s)`
        );
        continue;
      }

      if (dbMember.hasReceived || dbMember.totalReceived > 0) {
        validationErrors.push(
          `Cannot change ${dbMember.name || dbMember.userId?.name || 'Member'}'s draw number - ` +
          `They have already received money (₹${dbMember.totalReceived})`
        );
        continue;
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot reorder draw numbers',
        details: validationErrors,
        message: validationErrors.join('. ')
      }, { status: 400 });
    }

    // 5. PERFORM UPDATES
    const updatePromises = [];
    const cycleUpdatePromises = [];

    for (const updatedMember of updatedMembers) {
      const dbMember = memberMap.get(updatedMember._id);
      if (!dbMember) continue;

      const oldNumber = dbMember.memberNumber;
      const newNumber = updatedMember.memberNumber;

      if (oldNumber === newNumber) {
        updatePromises.push(
          GroupMember.findByIdAndUpdate(
            updatedMember._id,
            { memberNumber: newNumber },
            { new: true }
          )
        );
        continue;
      }

      updatePromises.push(
        GroupMember.findByIdAndUpdate(
          updatedMember._id,
          { memberNumber: newNumber },
          { new: true }
        )
      );

      const oldCycle = await PaymentCycle.findOne({ 
        groupId, 
        cycleNumber: oldNumber 
      });

      if (oldCycle) {
        cycleUpdatePromises.push(
          PaymentCycle.findByIdAndUpdate(
            oldCycle._id,
            { cycleNumber: newNumber },
            { new: true }
          )
        );
      }
    }

    await Promise.all([...updatePromises, ...cycleUpdatePromises]);

    // 6. UPDATE GROUP STATS
    await updateGroupStats(groupId);

    return NextResponse.json({ 
      success: true, 
      message: 'Draw order updated successfully',
      updatedCount: updatePromises.length
    });

  } catch (error: any) {
    console.error('Error reordering draw numbers:', error);
    return NextResponse.json({ 
      error: 'Failed to update draw order',
      details: error.message 
    }, { status: 500 });
  }
}

/* ======================================================================
   PATCH: Update a member (Name, Phone, Role) - UPDATED FOR SNAPSHOT DATA
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
    const groupId = params.groupsId || params.groupId || params.id;
    const memberId = params.memberId;
    const data = await request.json();

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

    // ✅ UPDATED: Use snapshot name from memberToUpdate
    const memberName = memberToUpdate.name || memberUser?.name || memberToUpdate.pendingMemberDetails?.name || 'Member';

    // Role Validations
    if (data.role) {
      // Cannot change Leader's role
      if (memberToUpdate.role === 'leader' && data.role !== 'leader') {
        return NextResponse.json({ error: 'Cannot change the Leader role' }, { status: 400 });
      }
      
      // Only Leader can assign/change Sub-leader roles
      if (currentMember.role !== 'leader' && ['sub_leader', 'leader'].includes(data.role)) {
        return NextResponse.json({ 
          error: 'Only the Leader can assign Sub-leader or Leader roles' 
        }, { status: 403 });
      }
      
      // Sub-leader limit check
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

    // ✅ UPDATED: Update Snapshot Data directly
    if (data.name || data.email || data.phone) {
      // Update snapshot fields directly
      memberToUpdate.name = data.name || memberToUpdate.name;
      memberToUpdate.email = data.email ? data.email.toLowerCase().trim() : memberToUpdate.email;
      memberToUpdate.phone = data.phone ? data.phone.trim() : memberToUpdate.phone;
      
      // Also update User profile if member has a registered account
      if (memberToUpdate.userId) {
        await User.findByIdAndUpdate(memberToUpdate.userId, {
          $set: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email.toLowerCase().trim() }),
            ...(data.phone && { phone: data.phone.trim() }),
          }
        });
      }
      
      // Keep pendingMemberDetails for backward compatibility
      if (!memberToUpdate.userId) {
        memberToUpdate.pendingMemberDetails = {
          ...memberToUpdate.pendingMemberDetails,
          name: data.name || memberToUpdate.pendingMemberDetails?.name,
          email: data.email ? data.email.toLowerCase().trim() : memberToUpdate.pendingMemberDetails?.email,
          phone: data.phone ? data.phone.trim() : memberToUpdate.pendingMemberDetails?.phone,
        };
      }
    }

    await memberToUpdate.save();

    // ==============================================
    // ✅ NOTIFICATION SECTION
    // ==============================================
    if (roleChanged) {
      const groupName = group?.name || 'the group';
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

    const updatedMember = await GroupMember.findById(memberId).populate('userId', 'name email avatar phone');
    
    return NextResponse.json({ 
      success: true, 
      member: updatedMember, 
      message: roleChanged ? 
        `Member role changed from ${oldRole} to ${newRole}` : 
        'Member updated successfully',
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
   DELETE: Remove a member (With Strict Workflow Validation)
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

    // ✅ UPDATED: Use snapshot name
    const memberName = memberToRemove.name || 'Member';

    // CYCLE CHECK
    const cycleQuery: any = { 
      groupId,
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
      else if (assignedCycle.status === 'upcoming') statusMsg = "Upcoming";

      return NextResponse.json({ 
        error: 'Cannot remove member', 
        message: `${memberName} is assigned to Cycle #${assignedCycle.cycleNumber} (${statusMsg}). You cannot remove a member who has an active/upcoming/completed cycle.` 
      }, { status: 400 });
    }

    // PAYMENT CHECK
    const hasPaid = await Payment.findOne({
      memberId: memberToRemove._id,
      status: { $in: ['paid', 'late'] }
    });

    if (hasPaid) {
      return NextResponse.json({ 
        error: 'Cannot remove member', 
        message: `${memberName} has already made payments. Removing them would break the accounting.` 
      }, { status: 400 });
    }

    // INCOMING PAYMENT CHECK
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
          message: `Other members have already made payments towards ${memberName}'s cycle (Cycle #${theirCycle.cycleNumber}).` 
        }, { status: 400 });
      }
      
      // Delete empty cycle
      await PaymentCycle.findByIdAndDelete(theirCycle._id);
      await Payment.deleteMany({ cycleId: theirCycle._id });
    }

    // Clean up pending payments
    await Payment.deleteMany({ 
      memberId: memberToRemove._id, 
      status: 'pending' 
    });

    // Permanently Delete the Member
    await GroupMember.findByIdAndDelete(memberId);

    // Update Group Duration after removal
    await updateGroupStats(groupId);

    // ✅ NOTIFICATION: Notify group about member removal
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';
    
    await sendNotificationToAllMembers({
      groupId: groupId,
      type: NotificationType.GROUP,
      title: 'Member Removed',
      message: `${memberName} has been removed from "${groupName}" by the leader.`,
      priority: 'medium'
    });

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

/* ======================================================================
   HELPER FUNCTION: Recalculate Group Data
====================================================================== */
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
    
    console.log(`✅ Group ${groupId} stats updated. New Duration: ${memberCount}`);
  } catch (err) {
    console.error("Failed to update group stats:", err);
  }
}