import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { Notification } from '@/lib/db/models/Notification';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { verifyAuthToken } from '@/lib/utils/auth';
import { sendPaymentReminders, sendNotificationToAllMembers } from '@/lib/utils/notifications';
import { NotificationType } from '@/types/notification';

// GET: Fetch User's Notifications
export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter'); 
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query: any = { userId: user._id };
    
    if (filter === 'unread') {
      query.isRead = false;
    } else if (filter && filter !== 'all') {
      // Map frontend strings to Enums if needed, or use direct strings
      // Assuming your DB stores strings like 'payment', 'group', etc.
      query.type = filter;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('groupId', 'name'); // Should work now that groupId is saved at top level

    // Get unread counts by type
    const unreadCounts = await Notification.aggregate([
      { $match: { userId: user._id, isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const totalUnread = unreadCounts.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      notifications,
      counts: {
        total: notifications.length,
        unread: totalUnread,
        byType: unreadCounts
      }
    });

  } catch (error) {
    console.error('Notification Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Actions
export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, id, groupId, message, title } = await req.json();

    if (action === 'mark_read') {
      await Notification.findByIdAndUpdate(id, { 
        isRead: true, 
        readAt: new Date() 
      });
    }
    else if (action === 'mark_all_read') {
      await Notification.updateMany(
        { userId: user._id, isRead: false }, 
        { isRead: true, readAt: new Date() }
      );
    }
    else if (action === 'delete') {
      await Notification.findByIdAndDelete(id);
    }
    else if (action === 'delete_all') {
      await Notification.deleteMany({ userId: user._id });
    }
    else if (action === 'send_reminders' && groupId) {
      // Check Leader/Sub-leader permission
      const membership = await GroupMember.findOne({ userId: user._id, groupId });
      
      if (!membership || (membership.role !== 'leader' && membership.role !== 'sub_leader')) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      await sendNotificationToAllMembers({
        groupId,
        excludeUserId: user._id.toString(),
        type: NotificationType.REMINDER,
        title: title || 'Payment Reminder',
        message: message || 'Your payment is due. Please make the payment as soon as possible.',
        priority: 'high'
      });
    }
    else if (action === 'trigger_reminders') {
      await sendPaymentReminders();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notification action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}