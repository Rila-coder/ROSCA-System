import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { sendNotification, sendPaymentReminders } from '@/lib/utils/notifications';

// 1. UPDATE INTERFACE: Params must be a Promise in Next.js 16
interface RouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 2. AWAIT params before using
    const { groupId } = await context.params;

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is leader or sub-leader of this group
    const groupMember = await GroupMember.findOne({ 
      groupId, 
      userId: user._id 
    });
    
    if (!groupMember || (groupMember.role !== 'leader' && groupMember.role !== 'sub_leader')) {
      return NextResponse.json({ error: 'Not authorized to send reminders' }, { status: 403 });
    }

    // Get current cycle
    const currentCycle = await PaymentCycle.findOne({
      groupId,
      status: 'active'
    }).sort('-cycleNumber');

    if (!currentCycle) {
      return NextResponse.json({ error: 'No active cycle found' }, { status: 404 });
    }

    // Get the group
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get pending payments
    const pendingPayments = await Payment.find({
      cycleId: currentCycle._id,
      status: { $in: ['pending', 'late'] }
    }).populate('userId', 'name email');

    // Create notifications for each pending payment
    const notificationPromises = pendingPayments.map(payment => {
      if (payment.userId) {
        return sendNotification({
          userId: payment.userId._id.toString(),
          type: 'reminder' as any,
          title: 'Payment Reminder',
          message: `Leader ${user.name} reminded you: Payment of ₹${payment.amount} is due for cycle ${currentCycle.cycleNumber} in "${group.name}"`,
          groupId,
          priority: 'high',
          data: {
            paymentId: payment._id,
            amount: payment.amount,
            cycleNumber: currentCycle.cycleNumber,
            dueDate: currentCycle.dueDate,
          }
        });
      }
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);

    return NextResponse.json({ 
      success: true,
      message: `Reminders sent to ${pendingPayments.length} members`,
      count: pendingPayments.length
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

// GET endpoint remains the same (no params used)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await sendPaymentReminders();

    return NextResponse.json({ 
      success: true,
      message: 'Payment reminders sent successfully'
    });
  } catch (error) {
    console.error('Error in reminder cron endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}