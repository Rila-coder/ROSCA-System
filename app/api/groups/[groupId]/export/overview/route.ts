import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';

// 1. UPDATE INTERFACE: Params is a Promise, and the key is 'groupId' (matching folder [groupId])
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

    // Check if user is a member of this group
    const isMember = await GroupMember.findOne({ 
      groupId: groupId, 
      userId: user._id 
    });
    
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get group data
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get members
    const members = await GroupMember.find({ groupId: groupId })
      .populate('userId', 'name email phone')
      .sort('memberNumber');

    // Get all cycles
    const cycles = await PaymentCycle.find({ groupId: groupId })
      .populate('recipientId', 'name email')
      .sort('cycleNumber');

    // Get all payments
    const payments = await Payment.find({ groupId: groupId })
      .populate('userId', 'name email')
      .sort('-createdAt');

    // Calculate stats
    const totalCollected = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalPayments = payments.length;
    const completionRate = totalPayments > 0 
      ? Math.round((totalPayments - pendingPayments) / totalPayments * 100) 
      : 0;

    // Create CSV content
    const csvRows = [];
    
    // Header
    csvRows.push('Group Overview Report');
    csvRows.push(`Group: ${group.name}`);
    csvRows.push(`Generated: ${new Date().toLocaleDateString()}`);
    csvRows.push('');
    
    // Summary
    csvRows.push('SUMMARY');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Members,${members.length}`);
    csvRows.push(`Active Members,${members.filter(m => m.status === 'active').length}`);
    csvRows.push(`Total Collected,₹${totalCollected}`);
    csvRows.push(`Completion Rate,${completionRate}%`);
    csvRows.push(`Current Cycle,${group.currentCycle}/${group.duration}`);
    csvRows.push('');
    
    // Cycles
    csvRows.push('CYCLES');
    csvRows.push('Cycle,Recipient,Amount,Due Date,Status');
    cycles.forEach(cycle => {
      csvRows.push([
        cycle.cycleNumber,
        cycle.recipientId?.name || 'Unknown',
        `₹${cycle.amount}`,
        new Date(cycle.dueDate).toLocaleDateString(),
        cycle.isCompleted ? 'Completed' : 'Pending'
      ].join(','));
    });
    csvRows.push('');
    
    // Recent Payments (last 20)
    csvRows.push('RECENT PAYMENTS (Last 20)');
    csvRows.push('Member,Amount,Status,Date,Method');
    payments.slice(0, 20).forEach(payment => {
      csvRows.push([
        payment.userId?.name || 'Unknown',
        `₹${payment.amount}`,
        payment.status,
        payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A',
        payment.paymentMethod || 'N/A'
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="roasca-overview-${group.name}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting overview:', error);
    return NextResponse.json(
      { error: 'Failed to export overview' },
      { status: 500 }
    );
  }
}