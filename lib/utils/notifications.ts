import { Notification } from '@/lib/db/models/Notification';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { NotificationType } from '@/types/notification';
import dbConnect from '@/lib/db/connect';

export async function sendNotification({
  userId,
  type,
  title,
  message,
  groupId = null,
  priority = 'low',
  data = {}
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  groupId?: string | null;
  priority?: 'low' | 'medium' | 'high';
  data?: Record<string, any>;
}) {
  try {
    await dbConnect();

    if (!userId) {
      console.warn("⚠️ Cannot send notification: No userId provided");
      return;
    }

    // Removed the 24h duplicate check to ensure all notifications are delivered during testing
    
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      groupId: groupId,
      data: data,
      channels: ['in_app'],
      priority,
      isRead: false,
      sentAt: new Date(),
    });

    console.log(`✅ Notification created for user ${userId}: ${title}`);
    
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
  }
}

// ✅ Send notification to all group members
export async function sendNotificationToAllMembers({
  groupId,
  excludeUserId = null,
  type,
  title,
  message,
  priority = 'medium',
  data = {}
}: {
  groupId: string;
  excludeUserId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  data?: Record<string, any>;
}) {
  try {
    await dbConnect();

    const members = await GroupMember.find({ 
      groupId, 
      status: { $in: ['active', 'pending'] }
    }).populate('userId');

    const notificationPromises = members
      .filter(member => 
        member.userId && 
        (!excludeUserId || member.userId._id.toString() !== excludeUserId)
      )
      .map(member => 
        sendNotification({
          userId: member.userId._id.toString(),
          type,
          title,
          message,
          groupId,
          priority,
          data
        })
      );

    await Promise.all(notificationPromises);
    console.log(`📢 Sent group notification to ${notificationPromises.length} members.`);

  } catch (error) {
    console.error("Failed to send notifications to all members:", error);
  }
}

// ✅ Payment reminder notifications (Updated Time Logic)
export async function sendPaymentReminders() {
  try {
    await dbConnect();
    const now = new Date();
    
    const upcomingCycles = await PaymentCycle.find({
      status: 'active',
      dueDate: { $gt: now } 
    }).populate('groupId');

    for (const cycle of upcomingCycles) {
      const group = cycle.groupId as any;
      if (!group) continue;
      
      const timeDiff = cycle.dueDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));

      let shouldSendReminder = false;
      let reminderMessage = '';

      // 1. Monthly: 10 days before
      if (group.frequency === 'monthly' && daysDiff <= 10 && daysDiff > 9) {
        shouldSendReminder = true;
        reminderMessage = `Payment Reminder: ₹${group.contributionAmount} is due in 10 days for ${group.name}.`;
      } 
      // 2. Weekly: 3 days before
      else if (group.frequency === 'weekly' && daysDiff <= 3 && daysDiff > 2) {
        shouldSendReminder = true;
        reminderMessage = `Payment Reminder: ₹${group.contributionAmount} is due in 3 days for ${group.name}.`;
      } 
      // 3. Daily: 5 hours before
      else if (group.frequency === 'daily' && hoursDiff <= 5 && hoursDiff > 0) {
        shouldSendReminder = true;
        reminderMessage = `URGENT: Payment of ₹${group.contributionAmount} is due in less than 5 hours for ${group.name}.`;
      }

      if (shouldSendReminder) {
        const pendingPayments = await Payment.find({
          cycleId: cycle._id,
          status: 'pending'
        }).populate('userId');

        for (const payment of pendingPayments) {
          if (payment.userId) {
            await sendNotification({
              userId: payment.userId._id.toString(),
              type: NotificationType.REMINDER,
              title: 'Payment Due Soon',
              message: reminderMessage,
              groupId: group._id.toString(),
              priority: 'high',
              data: {
                paymentId: payment._id,
                cycleNumber: cycle.cycleNumber,
                amount: payment.amount
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in payment reminder cron:", error);
  }
}

// ✅ Notify when new cycle starts
export async function notifyNewCycleStarted(cycle: any) {
  try {
    await sendNotificationToAllMembers({
      groupId: cycle.groupId.toString(),
      type: NotificationType.GROUP,
      title: 'Cycle Started',
      message: `Cycle #${cycle.cycleNumber} has started! This person cycle start: ${cycle.recipientName}.`,
      priority: 'medium',
      data: {
        cycleId: cycle._id,
        cycleNumber: cycle.cycleNumber
      }
    });

    if (cycle.recipientId) {
      await sendNotification({
        userId: cycle.recipientId.toString(),
        type: NotificationType.PAYMENT,
        title: 'It\'s Your Turn!',
        message: `Cycle #${cycle.cycleNumber} has started and you are the recipient.`,
        groupId: cycle.groupId.toString(),
        priority: 'high'
      });
    }
  } catch (error) {
    console.error("Error notifying new cycle:", error);
  }
}

// ✅ Notify when cycle completes
export async function notifyCycleCompleted(cycle: any) {
  try {
    await sendNotificationToAllMembers({
      groupId: cycle.groupId.toString(),
      type: NotificationType.GROUP,
      title: 'Cycle Finished',
      message: `Cycle #${cycle.cycleNumber} is finished.`,
      priority: 'medium',
      data: { cycleId: cycle._id }
    });
  } catch (error) {
    console.error("Error notifying cycle completion:", error);
  }
}

// ✅ Notify when cycle is SKIPPED
export async function notifyCycleSkipped(cycle: any) {
  try {
    await sendNotificationToAllMembers({
      groupId: cycle.groupId.toString(),
      type: NotificationType.ALERT,
      title: 'Cycle Skipped',
      message: `Cycle #${cycle.cycleNumber} for ${cycle.recipientName} has been skipped.`,
      priority: 'high',
      data: { cycleId: cycle._id }
    });
  } catch (error) {
    console.error("Error notifying cycle skip:", error);
  }
}

export { NotificationType };
