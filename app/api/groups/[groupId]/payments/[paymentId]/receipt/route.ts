import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
// Ensure these models are registered
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { Group } from '@/lib/db/models/Group';

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

    const params = await context.params;
    const paymentId = params.paymentId;

    // Fetch Payment Details
    // ✅ POPULATE BOTH: userId (Real) AND memberId (Pending)
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'name email phone') 
      .populate('memberId') // 👈 This gets the pending details
      .populate('groupId', 'name');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // ✅ LOGIC: Determine Name/Phone based on member type
    const realUser = payment.userId;
    const pendingData = payment.memberId?.pendingMemberDetails;

    const memberName = realUser?.name || pendingData?.name || 'Unknown Member';
    const memberEmail = realUser?.email || pendingData?.email || 'N/A';
    const memberPhone = realUser?.phone || pendingData?.phone || 'N/A';

    return NextResponse.json({ 
      success: true,
      data: {
        receiptId: payment._id,
        date: payment.paidAt || new Date(), // Fallback if paidAt is missing
        amount: payment.amount,
        method: payment.paymentMethod || 'Cash',
        status: payment.status,
        groupName: payment.groupId?.name || 'Savings Group',
        
        // ✅ The Fixed Data
        memberName: memberName,
        memberEmail: memberEmail,
        memberPhone: memberPhone
      }
    });

  } catch (error) {
    console.error('Receipt data fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt data' }, { status: 500 });
  }
}