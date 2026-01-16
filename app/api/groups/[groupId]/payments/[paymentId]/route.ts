import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';
import { NotificationType } from '@/types/notification';
import { sendNotification } from '@/lib/utils/notifications';

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
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const paymentId = params.paymentId;
    const data = await request.json();

    // Check if user is leader or sub-leader of this group
    const groupMember = await GroupMember.findOne({ 
      groupId: groupId, 
      userId: user._id 
    });
    
    if (!groupMember || (groupMember.role !== 'leader' && groupMember.role !== 'sub_leader')) {
      return NextResponse.json({ error: 'Not authorized to update payments' }, { status: 403 });
    }

    // Get payment details for notification
    const oldPayment = await Payment.findById(paymentId).populate('userId');
    if (!oldPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Get group info for notification
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      { 
        $set: {
          ...data,
          updatedAt: new Date(),
          ...(data.status === 'paid' && !data.paidAt ? { paidAt: new Date() } : {}),
          ...(data.status === 'paid' ? { verifiedBy: user._id } : {})
        }
      },
      { new: true }
    ).populate('userId', 'name email avatar');

    // ✅ NOTIFICATION: Notify member about payment update
    if (oldPayment.userId && (data.status || data.paymentMethod || data.amount)) {
      let notificationTitle = '';
      let notificationMessage = '';
      let notificationType = NotificationType.PAYMENT;
      let priority = 'medium';

      if (data.status === 'paid') {
        notificationTitle = 'Payment Confirmed';
        notificationMessage = `Your payment of ₹${data.amount || oldPayment.amount} has been marked as PAID by ${user.name} in "${groupName}".`;
      } else if (data.status === 'pending') {
        notificationTitle = 'Payment Status Changed';
        notificationMessage = `Your payment status has been changed to PENDING by ${user.name} in "${groupName}".`;
        notificationType = NotificationType.ALERT;
        priority = 'high';
      } else if (data.paymentMethod) {
        notificationTitle = 'Payment Method Updated';
        notificationMessage = `Your payment method has been updated to ${data.paymentMethod} by ${user.name} in "${groupName}".`;
      } else if (data.amount) {
        notificationTitle = 'Payment Amount Updated';
        notificationMessage = `Your payment amount has been updated to ₹${data.amount} by ${user.name} in "${groupName}".`;
      }

      if (notificationTitle && notificationMessage) {
        await sendNotification({
          userId: oldPayment.userId._id.toString(),
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          groupId: groupId,
          priority: priority as any,
          data: {
            paymentId: paymentId,
            oldAmount: oldPayment.amount,
            newAmount: data.amount || oldPayment.amount,
            oldStatus: oldPayment.status,
            newStatus: data.status || oldPayment.status,
            changedBy: user.name,
            groupName: groupName,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      payment: updatedPayment,
      message: 'Payment updated successfully' 
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

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
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const paymentId = params.paymentId;

    // Check if user is leader or sub-leader of this group
    const groupMember = await GroupMember.findOne({ 
      groupId: groupId, 
      userId: user._id 
    });
    
    if (!groupMember || (groupMember.role !== 'leader' && groupMember.role !== 'sub_leader')) {
      return NextResponse.json({ error: 'Not authorized to remove payments' }, { status: 403 });
    }

    // Get payment details for notification
    const paymentToDelete = await Payment.findById(paymentId).populate('userId');
    if (!paymentToDelete) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Get group info for notification
    const group = await Group.findById(groupId).select('name');
    const groupName = group?.name || 'the group';

    // Remove payment
    await Payment.findByIdAndDelete(paymentId);

    // ✅ NOTIFICATION: Notify member about payment deletion
    if (paymentToDelete.userId) {
      await sendNotification({
        userId: paymentToDelete.userId._id.toString(),
        type: NotificationType.ALERT,
        title: 'Payment Record Removed',
        message: `Your payment record of ₹${paymentToDelete.amount} has been removed by ${user.name} in "${groupName}". Please contact the leader for details.`,
        groupId: groupId,
        priority: 'high',
        data: {
          paymentId: paymentId,
          amount: paymentToDelete.amount,
          cycleNumber: paymentToDelete.cycleNumber,
          removedBy: user.name,
          groupName: groupName,
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payment removed successfully. Member has been notified.' 
    });
  } catch (error) {
    console.error('Error removing payment:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment' },
      { status: 500 }
    );
  }
}