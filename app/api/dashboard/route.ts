import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 1. Fetch Groups (Active & Completed)
    const memberships = await GroupMember.find({ userId: user._id, status: { $ne: 'removed' } });
    const groupIds = memberships.map(m => m.groupId);
    
    const groups = await Group.find({ _id: { $in: groupIds } }).sort({ updatedAt: -1 });

    // 2. Fetch Payments
    const payments = await Payment.find({ userId: user._id });

    // 3. Calculate Stats
    const totalSavings = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

    const activeGroupsCount = groups.filter(g => g.status === 'active').length;

    // 4. Get Next Draw Date (Earliest active cycle due date)
    const nextActiveCycle = await PaymentCycle.findOne({ 
        groupId: { $in: groupIds }, 
        status: 'active',
        dueDate: { $gte: new Date() }
    }).sort({ dueDate: 1 });

    // 5. Format Your Groups Data
    const formattedGroups = groups.map(g => ({
        _id: g._id,
        name: g.name,
        members: g.members?.length || g.duration, // Fallback if members array not populated
        contributionAmount: g.contributionAmount,
        frequency: g.frequency,
        totalPool: g.totalAmount,
        status: g.status,
        progress: Math.round((g.currentCycle / g.duration) * 100),
        currentCycle: g.currentCycle,
        duration: g.duration
    })).slice(0, 3); // Show top 3

    // 6. Format Upcoming Payments
    const upcomingPayments = payments
        .filter(p => p.status === 'pending')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3)
        .map(p => {
            const group = groups.find(g => g._id.toString() === p.groupId.toString());
            const daysLeft = Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            return {
                _id: p._id,
                groupName: group?.name || 'Unknown Group',
                amount: p.amount,
                dueDate: new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                daysLeft,
                priority: daysLeft <= 2 ? 'high' : daysLeft <= 7 ? 'medium' : 'low'
            };
        });

    // 7. Generate Recent Activity (Derived from Payments & Joins)
    // In a real app, you might have an ActivityLog collection. Here we merge recent payments.
    const recentActivity = payments
        .filter(p => p.status === 'paid')
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
        .slice(0, 5)
        .map(p => {
            const group = groups.find(g => g._id.toString() === p.groupId.toString());
            return {
                id: p._id,
                type: 'payment',
                title: 'Payment Successful',
                description: `You paid ₹${p.amount.toLocaleString()} to ${group?.name}`,
                time: new Date(p.paidAt).toLocaleDateString(),
            };
        });

    return NextResponse.json({
        userName: user.name,
        stats: {
            totalSavings,
            activeGroups: activeGroupsCount,
            pendingPayments: pendingAmount,
            nextDrawDate: nextActiveCycle ? new Date(nextActiveCycle.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No draws'
        },
        groups: formattedGroups,
        upcomingPayments,
        recentActivity
    });

  } catch (error: any) {
    console.error('Dashboard Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}