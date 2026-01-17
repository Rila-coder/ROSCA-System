import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // 2. Get User
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Get Group ID from params
    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;

    if (!groupId) {
      return NextResponse.json({ error: 'Invalid Group ID' }, { status: 400 });
    }

    // 4. Check Membership
    const isMember = await GroupMember.findOne({ 
      groupId: groupId, 
      userId: user._id 
    });
    
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const objectGroupId = new mongoose.Types.ObjectId(groupId);

    // 5. Parallel data fetching
    const [
      group,
      memberCount,
      activeMembers,
      currentCycle,
      recentPayments,
      upcomingDrawsRaw, // Renamed to process later
      totalCollectedResult,
      pendingPayments,
      totalPayments,
      completedCyclesCount // ✅ NEW: Count completed cycles
    ] = await Promise.all([
      Group.findById(groupId),
      GroupMember.countDocuments({ groupId }),
      GroupMember.countDocuments({ groupId, status: 'active' }),
      PaymentCycle.findOne({ groupId, isCompleted: false, isSkipped: false }).sort('cycleNumber'),
      Payment.find({ groupId })
        .populate('userId', 'name')
        .populate('memberId') // ✅ Populate Member Snapshot for Recent Payments
        .sort({ createdAt: -1 })
        .limit(5),
      // Fetch upcoming draws
      PaymentCycle.find({ 
          groupId, 
          status: { $in: ['active', 'upcoming'] } 
        })
        .populate('recipientId', 'name')
        .sort({ cycleNumber: 1 })
        .limit(3)
        .lean(),
      
      // Aggregation for Total Collected
      Payment.aggregate([
        { $match: { groupId: objectGroupId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      Payment.countDocuments({ groupId, status: 'pending' }),
      Payment.countDocuments({ groupId }),
      
      // ✅ NEW: Count completed or skipped cycles
      PaymentCycle.countDocuments({
          groupId,
          $or: [{ status: 'completed' }, { status: 'skipped' }, { isCompleted: true }, { isSkipped: true }]
      })
    ]);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // ✅ CHECK FOR TOTAL COMPLETION
    const totalExpectedCycles = group.duration || group.targetMemberCount || 0;
    const isGroupCompleted = totalExpectedCycles > 0 && completedCyclesCount >= totalExpectedCycles;

    // 6. Calculate Stats
    const totalCollected = totalCollectedResult[0]?.total || 0;
    const completionRate = totalPayments > 0 
      ? Math.round(((totalPayments - pendingPayments) / totalPayments) * 100) 
      : 0;

    // 7. Next Draw Calculation
    let nextDraw = 'No upcoming draws';
    if (isGroupCompleted) {
        nextDraw = 'Completed';
    } else if (upcomingDrawsRaw.length > 0) {
      const dueDate = new Date(upcomingDrawsRaw[0].dueDate);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) nextDraw = `${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
      else if (daysDiff === 0) nextDraw = 'Today';
      else nextDraw = 'Overdue';
    }

    // 8. ✅ Format Recent Payments (Using Snapshot Name)
    const formattedRecentPayments = recentPayments.map((payment: any) => {
      // Logic: Group Snapshot Name (memberId.name) -> Global Name (userId.name)
      const memberSnapshotName = payment.memberId?.name;
      const globalUserName = payment.userId?.name;
      const pendingName = payment.memberId?.pendingMemberDetails?.name;
      
      const finalName = memberSnapshotName || globalUserName || pendingName || 'Unknown Member';

      return {
        _id: payment._id,
        memberName: finalName,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        dueDate: currentCycle?.dueDate,
        paymentMethod: payment.paymentMethod,
      };
    });

    // 9. ✅ FIX: Fetch Snapshot Names for Upcoming Draws
    // We need to look up the GroupMember record for each cycle to get the edited name
    const memberIdsToFetch = upcomingDrawsRaw
        .filter((c: any) => c.recipientId && c.recipientId._id)
        .map((c: any) => c.recipientId._id);
    
    // Fetch snapshot data for all recipients in one go
    const recipientSnapshots = await GroupMember.find({
        groupId,
        userId: { $in: memberIdsToFetch }
    }).select('userId name');

    const formattedUpcomingDraws = upcomingDrawsRaw.map((cycle: any) => {
        let displayName = cycle.recipientName || "Unknown Member";

        if (cycle.recipientId) {
            // Case A: Registered User - Find matching snapshot
            const snapshot = recipientSnapshots.find(
                s => s.userId.toString() === cycle.recipientId._id.toString()
            );
            
            if (snapshot && snapshot.name) {
                displayName = snapshot.name; // ✅ Use Edited Snapshot Name
            } else if (cycle.recipientId.name) {
                displayName = cycle.recipientId.name; // Fallback to Global
            }
        } else {
            // Case B: Guest User - Usually cycle.recipientName is already the snapshot name
            // But we can double check if needed (omitted for speed as usually correct)
        }

        return {
            _id: cycle._id,
            cycleNumber: cycle.cycleNumber,
            recipientName: displayName, 
            amount: cycle.amount,
            dueDate: cycle.dueDate,
            status: cycle.status || 'upcoming',
        };
    });

    return NextResponse.json({
      stats: {
        totalCollected,
        activeMembers,
        nextDraw,
        completionRate,
      },
      recentPayments: formattedRecentPayments,
      upcomingDraws: formattedUpcomingDraws,
      memberCount,
      totalCollected,
      isGroupCompleted // ✅ Send this flag to frontend
    });

  } catch (error: any) {
    console.error('❌ Error in overview API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data', message: error.message },
      { status: 500 }
    );
  }
}