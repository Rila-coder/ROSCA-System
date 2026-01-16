import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { Notification } from '@/lib/db/models/Notification'; // Assuming you have this model

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const { paymentIds } = body;

    // Find all payments to get User IDs
    const payments = await Payment.find({ _id: { $in: paymentIds } }).populate('userId');

    // Create notifications (Simulated loop)
    const notifications = payments.map(p => ({
        userId: p.userId._id,
        groupId: p.groupId,
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: `Please pay your contribution of Rs. ${p.amount}`,
        isRead: false,
        createdAt: new Date()
    }));

    // If you have a Notification model, save them:
    if (Notification) {
        await Notification.insertMany(notifications);
    }

    // In a real app, you would also trigger SMS/Email here using Twilio/SendGrid

    return NextResponse.json({ 
      success: true, 
      count: payments.length,
      message: 'Reminders sent successfully' 
    });
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}