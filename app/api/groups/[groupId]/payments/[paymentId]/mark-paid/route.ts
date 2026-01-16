import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Group } from '@/lib/db/models/Group';
import { Activity } from '@/lib/db/models/Activity';
import { NotificationType } from '@/types/notification';
import { sendNotification } from '@/lib/utils/notifications';

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
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId;
    const paymentId = params.paymentId || params.id;
    
    // Get payment with user details
    const payment = await Payment.findById(paymentId).populate('userId');
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Authorization: Only Leader/Sub-leader can mark payments as paid
    const currentMember = await GroupMember.findOne({ 
      groupId, 
      userId: user._id 
    });
    
    if (!currentMember || !['leader', 'sub_leader'].includes(currentMember.role)) {
      return NextResponse.json({ 
        error: 'Not authorized', 
        message: 'Only group leader or sub-leader can mark payments as paid.' 
      }, { status: 403 });
    }

    // Get group info for notification
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';
    
    // Get member name for notification
    const memberName = payment.userId?.name || 'Member';

    // Update to Paid
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.verifiedBy = user._id; // The logged-in leader verified it
    
    await payment.save();

    // ✅ ACTIVITY LOG: Log payment verification
    await Activity.create({
      groupId: groupId,
      userId: user._id,
      type: 'payment_verified',
      description: `${user.name} marked ${memberName}'s payment as PAID`,
      metadata: {
        groupName: groupName,
        paymentId: payment._id,
        amount: payment.amount,
        memberName: memberName,
        verifiedBy: user.name
      }
    });

    // ✅ NOTIFICATION: Notify the member about payment marked as paid
    if (payment.userId) {
      await sendNotification({
        userId: payment.userId._id.toString(),
        type: NotificationType.PAYMENT,
        title: 'Payment Confirmed',
        message: `Your payment of ₹${payment.amount} has been marked as PAID by ${user.name} in "${groupName}".`,
        groupId: groupId,
        priority: 'medium',
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          cycleNumber: payment.cycleNumber,
          markedBy: user.name,
          groupName: groupName
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      payment,
      message: `Payment marked as paid for ${memberName}. They have been notified.` 
    });
  } catch (error: any) {
    console.error('Error marking payment as paid:', error);
    return NextResponse.json(
      { error: 'Failed to mark payment as paid' },
      { status: 500 }
    );
  }
}