import { NextRequest, NextResponse } from 'next/server';
// ✅ FIX: Import from custom auth
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';

export async function GET(
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
    const groupId = params.groupsId || params.groupId || params.id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingCycles = await PaymentCycle.find({
      groupId,
      isCompleted: false,
      dueDate: { $gte: today }
    })
      .populate('recipientId', 'name email avatar')
      .sort('dueDate')
      .limit(5)
      .lean();

    const formattedCycles = upcomingCycles.map((cycle: any) => ({
      _id: cycle._id?.toString() || '',
      cycleNumber: cycle.cycleNumber,
      recipientName: cycle.recipientId?.name || 'Unknown',
      amount: cycle.amount,
      dueDate: cycle.dueDate,
      status: 'upcoming',
    }));

    return NextResponse.json({ 
      cycles: formattedCycles 
    });
  } catch (error: any) {
    console.error('Error fetching upcoming cycles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming cycles' },
      { status: 500 }
    );
  }
}