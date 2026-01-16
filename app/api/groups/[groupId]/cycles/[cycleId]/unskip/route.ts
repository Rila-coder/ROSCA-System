import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { Payment } from '@/lib/db/models/Payment';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { sendNotificationToAllMembers, NotificationType } from '@/lib/utils/notifications';

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const params = await context.params;
    const groupId = params.groupsId || params.groupId;
    const cycleId = params.cycleId;

    // 2. Check Permissions
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can unskip cycles' }, { status: 403 });
    }

    // 3. Find the Cycle to Reactivate
    const targetCycle = await PaymentCycle.findById(cycleId);
    if (!targetCycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    // Check if cycle is actually skipped
    if (targetCycle.status !== 'skipped' && !targetCycle.isSkipped) {
      return NextResponse.json({ 
        error: 'Cycle Not Skipped', 
        message: `Cycle #${targetCycle.cycleNumber} is not skipped. Current status: ${targetCycle.status}` 
      }, { status: 400 });
    }

    // 4. ✅ AUTO-SKIP LOGIC: Check if another cycle is currently active
    const currentlyActiveCycle = await PaymentCycle.findOne({
      groupId: group._id,
      status: 'active',
      _id: { $ne: targetCycle._id }
    });

    if (currentlyActiveCycle) {
      console.log(`Auto-skipping Cycle #${currentlyActiveCycle.cycleNumber} to reactivate Cycle #${targetCycle.cycleNumber}`);
      
      // Force skip the currently active one
      currentlyActiveCycle.status = 'skipped';
      currentlyActiveCycle.isSkipped = true;
      currentlyActiveCycle.isCompleted = false;
      currentlyActiveCycle.completedAt = new Date();
      currentlyActiveCycle.completedBy = user._id;
      await currentlyActiveCycle.save();
      
      // Clear any pending payments for the skipped cycle
      await Payment.deleteMany({ cycleId: currentlyActiveCycle._id });

      // ✅ NOTIFICATION: Notify about auto-skipped cycle (optional enhancement)
      await sendNotificationToAllMembers({
        groupId: groupId.toString(),
        type: NotificationType.GROUP,
        title: 'Cycle Auto-Skipped',
        message: `Leader is reactivating an earlier cycle. Cycle #${currentlyActiveCycle.cycleNumber} has been skipped.`,
        priority: 'medium'
      });
    }

    // 5. Reactivate the Target Cycle
    targetCycle.status = 'active';
    targetCycle.isCompleted = false;
    targetCycle.isSkipped = false;
    targetCycle.completedAt = undefined;
    targetCycle.completedBy = undefined;
    targetCycle.startDate = new Date();
    targetCycle.startedBy = user._id;
    
    await targetCycle.save();

    // 6. Create payments for reactivated cycle if needed
    const existingPayments = await Payment.countDocuments({ cycleId: targetCycle._id });
    if (existingPayments === 0) {
      const members = await GroupMember.find({
        groupId: group._id,
        status: { $in: ['active', 'pending'] },
      }).populate('userId');

      const paymentPromises = members.map((member: any) => {
        return Payment.create({
          cycleId: targetCycle._id,
          memberId: member._id,
          userId: member.userId?._id,
          groupId: group._id,
          amount: group.contributionAmount,
          status: 'pending',
          notes: `Cycle #${targetCycle.cycleNumber} Contribution`,
        });
      });

      await Promise.all(paymentPromises);
    }

    // 7. Update Group to point to the reactivated cycle
    await Group.findByIdAndUpdate(groupId, {
      currentCycle: targetCycle.cycleNumber,
      updatedAt: new Date(),
    });

    // ✅ NOTIFICATION: Notify all members about reactivated cycle
    await sendNotificationToAllMembers({
      groupId: groupId.toString(),
      type: NotificationType.GROUP,
      title: 'Cycle Reactivated',
      message: `Cycle #${targetCycle.cycleNumber} has been reactivated by the Leader.`,
      priority: 'medium'
    });

    return NextResponse.json({ 
      success: true, 
      message: currentlyActiveCycle 
        ? `Cycle #${currentlyActiveCycle.cycleNumber} was auto-skipped. Cycle #${targetCycle.cycleNumber} is now active.`
        : `Cycle #${targetCycle.cycleNumber} reactivated successfully.` 
    });

  } catch (error: any) {
    console.error('Error unskipping cycle:', error);
    return NextResponse.json({ 
      error: 'Failed to unskip cycle',
      details: error.message 
    }, { status: 500 });
  }
}