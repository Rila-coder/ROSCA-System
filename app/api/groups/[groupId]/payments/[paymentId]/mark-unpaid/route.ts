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
    const paymentId = params.paymentId;
    
    // Find the payment with user details
    const payment = await Payment.findById(paymentId).populate('userId');
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Authorization: Only Leader/Sub-leader can mark payments as unpaid
    const currentMember = await GroupMember.findOne({ 
      groupId, 
      userId: user._id 
    });
    
    if (!currentMember || !['leader', 'sub_leader'].includes(currentMember.role)) {
      return NextResponse.json({ 
        error: 'Not authorized', 
        message: 'Only group leader or sub-leader can mark payments as unpaid.' 
      }, { status: 403 });
    }

    // Get group info for notification
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';
    
    // Get member name for notification
    const memberName = payment.userId?.name || 'Member';

    // ✅ Logic: Revert to Pending
    payment.status = 'pending';
    payment.paidAt = null;     // Clear the paid date
    payment.verifiedBy = null; // Clear who verified it
    
    await payment.save();

    // ✅ ACTIVITY LOG: Log payment status change
    await Activity.create({
      groupId: groupId,
      userId: user._id,
      type: 'payment_made', // Using payment_made for both paid and unpaid status changes
      description: `${user.name} marked ${memberName}'s payment as PENDING`,
      metadata: {
        groupName: groupName,
        paymentId: payment._id,
        amount: payment.amount,
        memberName: memberName,
        changedBy: user.name,
        previousStatus: 'paid',
        newStatus: 'pending'
      }
    });

    // ✅ NOTIFICATION: Notify the member about payment marked as unpaid
    if (payment.userId) {
      await sendNotification({
        userId: payment.userId._id.toString(),
        type: NotificationType.ALERT,
        title: 'Payment Status Changed',
        message: `Your payment of ₹${payment.amount} has been marked as PENDING by ${user.name} in "${groupName}". Please check with the leader for details.`,
        groupId: groupId,
        priority: 'high',
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          cycleNumber: payment.cycleNumber,
          changedBy: user.name,
          groupName: groupName,
          status: 'pending'
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      payment,
      message: `Payment marked as unpaid for ${memberName}. They have been notified.` 
    });
  } catch (error: any) {
    console.error('Error marking payment as unpaid:', error);
    return NextResponse.json(
      { error: 'Failed to mark payment as unpaid', details: error.message },
      { status: 500 }
    );
  }
}