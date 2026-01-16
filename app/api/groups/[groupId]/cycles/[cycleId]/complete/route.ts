import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';
import { notifyCycleCompleted } from '@/lib/utils/notifications';

export async function POST(
  request: NextRequest, 
  context: { params: Promise<any> }
) {
  try {
    // 1️⃣ Authenticate
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2️⃣ Get params
    const params = await context.params;
    const groupId = params.groupId;
    const cycleId = params.cycleId;

    // 3️⃣ Check Group & Permissions
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can complete cycles' }, { status: 403 });
    }

    // 4️⃣ Get the cycle
    const cycle = await PaymentCycle.findById(cycleId).populate('recipientId', 'name email avatar');
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // 5️⃣ Check if cycle is skipped
    if (cycle.status === 'skipped') {
      return NextResponse.json(
        { 
          error: 'Cycle Skipped', 
          message: 'This cycle is skipped. You cannot complete a skipped cycle. Please unskip it first.' 
        },
        { status: 400 }
      );
    }

    // 6️⃣ Check if cycle is already completed
    if (cycle.status === 'completed') {
      return NextResponse.json(
        { 
          error: 'Already Completed', 
          message: 'This cycle is already completed.' 
        },
        { status: 400 }
      );
    }

    // 7️⃣ Check if cycle is active
    if (cycle.status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Cycle Not Active', 
          message: `Cycle is ${cycle.status}. Only active cycles can be completed.` 
        },
        { status: 400 }
      );
    }

    // 8️⃣ Check if all members have paid
    const pendingPaymentsCount = await Payment.countDocuments({
      cycleId: cycleId,
      status: { $ne: 'paid' }
    });

    if (pendingPaymentsCount > 0) {
      return NextResponse.json(
        { 
          error: 'Payments Pending', 
          message: `Cannot complete! ${pendingPaymentsCount} members have not paid yet.` 
        },
        { status: 400 }
      );
    }

    // 9️⃣ Mark cycle as completed
    cycle.status = 'completed';
    cycle.isCompleted = true;
    cycle.completedAt = new Date();
    await cycle.save();

    // 🔟 Update recipient status
    if (cycle.recipientId) {
      await GroupMember.findOneAndUpdate(
        {
          groupId: groupId,
          userId: cycle.recipientId._id
        },
        {
          hasReceived: true,
          receivedCycle: cycle.cycleNumber,
          receivedAt: new Date(),
          totalReceived: (group.contributionAmount || 0) * (group.memberCount || 0)
        }
      );
    }

    // 1️⃣1️⃣ Update group
    await Group.findByIdAndUpdate(groupId, {
      currentCycle: null,
      updatedAt: new Date(),
    });

    // ✅ NOTIFICATION: Notify all members about cycle completion
    await notifyCycleCompleted(cycle);

    return NextResponse.json({ 
      success: true, 
      cycle,
      message: `Cycle #${cycle.cycleNumber} completed successfully! You can now start the next one.` 
    });

  } catch (error: any) {
    console.error('Error completing cycle:', error);
    return NextResponse.json(
      { error: 'Failed to complete cycle', details: error.message },
      { status: 500 }
    );
  }
}