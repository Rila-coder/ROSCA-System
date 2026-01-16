import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';

// 1. Update Interface: Params must be a Promise in Next.js 15+
// Also changed 'id' to 'groupId' to match your folder structure [groupId]
interface RouteContext {
  params: Promise<{ groupId: string; cycleId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 2. Await the params before using them
    const { groupId, cycleId } = await context.params;

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is leader of this group
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can complete cycles' }, { status: 403 });
    }

    // Update cycle
    const updatedCycle = await PaymentCycle.findByIdAndUpdate(
      cycleId,
      { 
        isCompleted: true,
        completedAt: new Date()
      },
      { new: true }
    ).populate('recipientId', 'name email avatar');

    if (!updatedCycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Update recipient member
    await GroupMember.findOneAndUpdate(
      {
        groupId: groupId,
        userId: updatedCycle.recipientId._id
      },
      {
        hasReceived: true,
        receivedCycle: updatedCycle.cycleNumber,
        receivedAt: new Date(),
        totalReceived: (group.contributionAmount || 0) * (group.memberCount || 0)
      }
    );

    return NextResponse.json({ 
      success: true, 
      cycle: updatedCycle,
      message: 'Cycle completed successfully' 
    });
  } catch (error) {
    console.error('Error completing cycle:', error);
    return NextResponse.json(
      { error: 'Failed to complete cycle' },
      { status: 500 }
    );
  }
}