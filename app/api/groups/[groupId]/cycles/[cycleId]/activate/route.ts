import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { Group } from '@/lib/db/models/Group';
import { Payment } from '@/lib/db/models/Payment';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { notifyNewCycleStarted } from '@/lib/utils/notifications';

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
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
    const groupId = params.groupsId || params.groupId;
    const cycleId = params.cycleId;

    // Get group
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is leader
    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can activate cycles' }, { status: 403 });
    }

    // Get the cycle
    const cycle = await PaymentCycle.findById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Check if cycle is upcoming
    if (cycle.status !== 'upcoming') {
      return NextResponse.json({ 
        error: 'Cannot activate cycle', 
        message: `Cycle is ${cycle.status}. Only upcoming cycles can be activated.` 
      }, { status: 400 });
    }

    // ✅ Check if there's already an active cycle
    const activeCycle = await PaymentCycle.findOne({
      groupId: group._id,
      status: 'active',
      _id: { $ne: cycle._id } // Don't match self
    });

    if (activeCycle) {
      return NextResponse.json({ 
        error: 'Active cycle exists', 
        message: `Cycle #${activeCycle.cycleNumber} is already active. Complete or skip it first.` 
      }, { status: 400 });
    }

    // Get members for payment creation
    const members = await GroupMember.find({
      groupId: group._id,
      status: { $in: ['active', 'pending'] },
    }).populate('userId');

    if (members.length === 0) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 });
    }

    // ✅ Update the cycle status to 'active'
    cycle.status = 'active';
    cycle.isCompleted = false;
    cycle.isSkipped = false;
    cycle.completedAt = undefined;
    cycle.startDate = new Date();
    cycle.startedBy = user._id;
    
    await cycle.save();

    // ✅ Create payments for this cycle (if not already created)
    const existingPayments = await Payment.countDocuments({ cycleId: cycle._id });
    if (existingPayments === 0) {
      const paymentPromises = members.map((member: any) => {
        return Payment.create({
          cycleId: cycle._id,
          memberId: member._id,
          userId: member.userId?._id,
          groupId: group._id,
          amount: group.contributionAmount,
          status: 'pending',
          notes: `Cycle #${cycle.cycleNumber} Contribution`,
        });
      });

      await Promise.all(paymentPromises);
    }

    // Update group to know this is the current cycle
    await Group.findByIdAndUpdate(groupId, { 
      currentCycle: cycle.cycleNumber,
      updatedAt: new Date() 
    });

    // ✅ NOTIFICATION: Notify all members about the activated cycle
    await notifyNewCycleStarted(cycle);

    // Populate for response
    const updatedCycle = await PaymentCycle.findById(cycle._id)
      .populate('recipientId', 'name email avatar');

    return NextResponse.json({ 
      success: true, 
      message: `Cycle #${cycle.cycleNumber} is now Active! Payments have been created for all members.`,
      cycle: updatedCycle
    });

  } catch (error: any) {
    console.error('Error activating cycle:', error);
    return NextResponse.json({ 
      error: 'Failed to activate cycle',
      details: error.message 
    }, { status: 500 });
  }
}