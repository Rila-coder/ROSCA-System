import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { paymentIds } = body; // Array of IDs from frontend

    if (!paymentIds || paymentIds.length === 0) {
        return NextResponse.json({ error: 'No payments selected' }, { status: 400 });
    }

    // Update all selected payments
    await Payment.updateMany(
      { _id: { $in: paymentIds } },
      { 
        $set: { 
          status: 'paid', 
          paidAt: new Date(),
          verifiedBy: user._id 
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Bulk payments updated successfully' 
    });
  } catch (error) {
    console.error('Error bulk updating:', error);
    return NextResponse.json({ error: 'Failed to update payments' }, { status: 500 });
  }
}