import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';

// 1. UPDATE INTERFACE: Params must be a Promise
interface RouteContext {
  params: Promise<{ groupId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    // Get recent payments (last 10)
    const recentPayments = await Payment.find({ groupId })
      .populate('userId', 'name email avatar')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Format payments
    const formattedPayments = recentPayments.map((payment: any) => ({
      _id: payment._id?.toString() || '',
      memberName: payment.userId?.name || 'Unknown',
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
    }));

    return NextResponse.json({
      payments: formattedPayments
    });
  } catch (error: any) {
    console.error('Error fetching recent payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent payments' },
      { status: 500 }
    );
  }
}