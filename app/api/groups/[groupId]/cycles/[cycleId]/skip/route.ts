import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { notifyCycleSkipped } from '@/lib/utils/notifications';

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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId;
    const cycleId = params.cycleId;

    // 2. Check Permissions
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can skip cycles' }, { status: 403 });
    }

    // 3. Find and Update the Cycle
    const cycle = await PaymentCycle.findById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Check if cycle is already skipped
    if (cycle.status === 'skipped') {
      return NextResponse.json({ 
        error: 'Already Skipped', 
        message: `Cycle #${cycle.cycleNumber} is already skipped.` 
      }, { status: 400 });
    }

    // Check if cycle can be skipped (only active or upcoming cycles)
    if (!['active', 'upcoming'].includes(cycle.status)) {
      return NextResponse.json({
        error: 'Cannot Skip Cycle',
        message: `Only active or upcoming cycles can be skipped. This cycle is ${cycle.status}.`
      }, { status: 400 });
    }

    // Update cycle status
    cycle.status = 'skipped';
    cycle.isSkipped = true;
    cycle.isCompleted = false;
    cycle.completedAt = new Date();
    cycle.completedBy = user._id;
    
    await cycle.save();

    // 4. Update Group to clear current cycle
    await Group.findByIdAndUpdate(groupId, {
      currentCycle: null,
      updatedAt: new Date(),
    });

    // ✅ NOTIFICATION: Notify all members about skipped cycle
    await notifyCycleSkipped(cycle);

    return NextResponse.json({ 
      success: true, 
      message: `Cycle #${cycle.cycleNumber} skipped successfully. You can now start an upcoming cycle.` 
    });

  } catch (error: any) {
    console.error('Error skipping cycle:', error);
    return NextResponse.json(
      { error: 'Failed to skip cycle', details: error.message },
      { status: 500 }
    );
  }
}