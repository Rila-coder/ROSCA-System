import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    await connectDB();
    
    const params = await context.params;
    const groupId = params.groupId; 
    const inviteCode = params.code; 

    if (!groupId || !inviteCode) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Find Group
    const group = await Group.findOne({ _id: groupId, inviteCode })
      .populate('leaderId', 'name avatar')
      .select('-bankAccount -subLeaderIds -createdBy'); 

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // 2. Fetch Members
    const members = await GroupMember.find({ 
      groupId: group._id, 
      status: { $ne: 'removed' } 
    })
    .populate('userId', 'name avatar')
    .lean();

    // 3. Fetch Active Cycle
    let currentCycle = await PaymentCycle.findOne({ 
      groupId: group._id, 
      status: 'active' 
    });

    if (!currentCycle) {
      currentCycle = await PaymentCycle.findOne({ groupId: group._id }).sort({ cycleNumber: -1 });
    }

    // 4. Fetch Payments
    const payments = await Payment.find({ groupId: group._id });
    
    // Stats Calculation
    const totalCollected = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.amount : sum, 0);
    
    let currentCycleStats = { paid: 0, pending: 0, late: 0, total: 0 };
    
    if (currentCycle) {
      const cyclePayments = payments.filter(p => p.cycleId?.toString() === currentCycle._id.toString());
      currentCycleStats = {
        paid: cyclePayments.filter(p => p.status === 'paid').length,
        pending: cyclePayments.filter(p => p.status === 'pending').length,
        late: cyclePayments.filter(p => p.status === 'late').length,
        total: cyclePayments.length // Should match active members
      };
    }

    // 5. Format & Sort Members
    // SORT ORDER: Leader -> Sub_leader -> Member -> Others
    const rolePriority = { leader: 1, sub_leader: 2, member: 3 };

    const formattedMembers = members
      .map((m: any) => {
        // ✅ FIX: Priority Logic for Name Resolution
        // 1. Snapshot Name (m.name) - Works for Guest/Edited
        // 2. User Profile Name (m.userId.name) - Fallback for Registered
        // 3. Pending Details (Legacy)
        const displayName = m.name || m.userId?.name || m.pendingMemberDetails?.name || 'Unknown';

        return {
          _id: m._id,
          name: displayName, // ✅ Now uses the correct name
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          avatar: m.userId?.avatar || null,
          hasPaidCurrentCycle: currentCycle 
            ? payments.some(p => 
                p.memberId?.toString() === m._id.toString() && 
                p.cycleId?.toString() === currentCycle._id.toString() && 
                p.status === 'paid'
              )
            : false
        };
      })
      .sort((a: any, b: any) => {
        const priorityA = rolePriority[a.role as keyof typeof rolePriority] || 4;
        const priorityB = rolePriority[b.role as keyof typeof rolePriority] || 4;
        return priorityA - priorityB;
      });

    return NextResponse.json({
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        memberCount: members.length,
        contributionAmount: group.contributionAmount,
        frequency: group.frequency,
        leaderName: group.leaderId?.name,
        currentCycle: group.currentCycle,
        duration: group.duration,
        startDate: group.startDate,
        inviteCode: group.inviteCode
      },
      stats: {
        totalCollected,
        currentCycleStats
      },
      members: formattedMembers,
      activeCycleNumber: currentCycle?.cycleNumber || 0,
      activeCycleDueDate: currentCycle?.dueDate || null
    });

  } catch (error: any) {
    console.error('Public API Error:', error);
    return NextResponse.json({ error: 'Failed to load public data' }, { status: 500 });
  }
}