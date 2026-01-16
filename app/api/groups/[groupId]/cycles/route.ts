import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { Payment } from '@/lib/db/models/Payment';
import { User } from '@/lib/db/models/User';
import { sendNotification, sendNotificationToAllMembers, notifyNewCycleStarted, notifyCycleCompleted } from '@/lib/utils/notifications';
import { NotificationType } from '@/types/notification';


/* ======================================================================
   POST: Start a new cycle (Respecting Draw Numbers)
   SECURITY: ONLY LEADER
====================================================================== */
// ... (imports remain the same) ...

/* ======================================================================
   POST: Start a new cycle (Respecting Draw Numbers & Snapshot Names)
   SECURITY: ONLY LEADER
====================================================================== */
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  let createdCycleId: any = null;

  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const data = await request.json();

    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // 🔒 RBAC CHECK
    if (group.leaderId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden', message: 'Only the Group Leader can start a new cycle.' }, { status: 403 });
    }

    // 1. Check for Active Cycle
    const currentActive = await PaymentCycle.findOne({ groupId: group._id, status: 'active' });
    if (currentActive) {
       return NextResponse.json({ error: 'Active cycle exists', message: `Cycle #${currentActive.cycleNumber} is currently active.` }, { status: 400 });
    }

    // 2. Determine Next Cycle Number
    const lastCycle = await PaymentCycle.findOne({ groupId: group._id }).sort('-cycleNumber');
    const nextCycleNumber = lastCycle ? lastCycle.cycleNumber + 1 : 1;

    // 3. Check Limit
    const totalMembers = await GroupMember.countDocuments({ groupId: group._id, status: { $in: ['active', 'pending'] } });
    if (nextCycleNumber > totalMembers) {
        return NextResponse.json({ error: 'All cycles completed', message: `All ${totalMembers} cycles have been completed.` }, { status: 400 });
    }

    // 4. Find Recipient by Draw Number
    const recipientMember = await GroupMember.findOne({
        groupId: group._id,
        memberNumber: nextCycleNumber,
        status: { $in: ['active', 'pending'] }
    }).populate('userId');

    if (!recipientMember) {
        return NextResponse.json({ error: 'Recipient not found', message: `Could not find member for Cycle #${nextCycleNumber}.` }, { status: 404 });
    }

    // 5. ✅ CRITICAL FIX: Determine Recipient Name (Prioritize Snapshot)
    let recipientName = "Unknown Member";
    let recipientUserId = null;

    // Logic: Use Group Snapshot Name -> User Profile Name -> Pending Name -> Fallback
    if (recipientMember.name) {
        recipientName = recipientMember.name; // ✅ Use edited snapshot name!
    } else if (recipientMember.userId) {
        recipientName = recipientMember.userId.name;
    } else if (recipientMember.pendingMemberDetails?.name) {
        recipientName = recipientMember.pendingMemberDetails.name;
    } else {
        recipientName = `Member #${recipientMember.memberNumber}`;
    }

    if (recipientMember.userId) {
        recipientUserId = recipientMember.userId._id;
    }

    // 6. Determine Status
    let initialStatus = 'active'; 
    if (data.isUpcomingCycle === true) initialStatus = 'upcoming';
    else if (lastCycle && (lastCycle.status === 'skipped' || lastCycle.isSkipped)) initialStatus = 'upcoming';

    // 7. Create Cycle (Save the snapshot name permanently to the cycle record)
    const paymentCycle = new PaymentCycle({
      groupId: group._id,
      cycleNumber: nextCycleNumber,
      amount: group.contributionAmount * totalMembers,
      dueDate: data.dueDate || new Date(),
      recipientId: recipientUserId,
      recipientName: recipientName, // ✅ This will now be "Asma SK" instead of "Asma"
      status: initialStatus,
      isCompleted: false,
      isSkipped: false,
    });

    await paymentCycle.save();
    createdCycleId = paymentCycle._id;

    // 8. Create Payments
    if (initialStatus === 'active') {
        const allMembers = await GroupMember.find({ groupId: group._id, status: { $in: ['active', 'pending'] } });
        
        const paymentPromises = allMembers.map((member: any) => {
            return Payment.create({
                cycleId: paymentCycle._id,
                memberId: member._id,
                userId: member.userId, // Use raw ID reference
                groupId: group._id,
                amount: group.contributionAmount,
                status: 'pending',
                notes: `Cycle #${nextCycleNumber} Contribution`,
            });
        });

        await Promise.all(paymentPromises);
        
        await Group.findByIdAndUpdate(group._id, { 
            currentCycle: nextCycleNumber,
            updatedAt: new Date() 
        });

        await notifyNewCycleStarted(paymentCycle);
    }

    return NextResponse.json({
      success: true,
      cycle: await paymentCycle.populate('recipientId', 'name email avatar'),
      message: initialStatus === 'upcoming' ? `Upcoming Cycle #${nextCycleNumber} created.` : `Cycle #${nextCycleNumber} started.`
    });

  } catch (error: any) {
    console.error('POST cycle error:', error);
    if (createdCycleId) await PaymentCycle.findByIdAndDelete(createdCycleId);
    return NextResponse.json({ error: 'Failed to start cycle', details: error.message }, { status: 500 });
  }
}

/* ======================================================================
   GET: Fetch all payment cycles for a group
   SECURITY: MEMBERS, SUB-LEADERS, LEADERS
====================================================================== */
/* ======================================================================
   GET: Fetch all payment cycles (With Live Name Updates)
====================================================================== */
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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;

    // Check membership
    const isMember = await GroupMember.findOne({ groupId, userId: user._id });
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // 1. Fetch Raw Cycles
    const cycles = await PaymentCycle.find({ groupId })
      .populate('recipientId', 'name email avatar') // This gets Global User Profile
      .sort('cycleNumber')
      .lean(); // Convert to plain JS objects so we can edit them

    // 2. Fetch Latest Group Member Data (The Snapshots)
    // We need this to get the "Edited Name" (e.g. "Asma SK") instead of Global Name ("Asma")
    const groupMembers = await GroupMember.find({ groupId }).select('userId name memberNumber');

    // 3. Map Live Names to Cycles
    // We update the cycle's recipientName with the fresh data from GroupMembers
    const cyclesWithLiveNames = cycles.map((cycle: any) => {
      let liveName = cycle.recipientName; // Default to stored name
      
      if (cycle.recipientId && cycle.recipientId._id) {
        // CASE A: Registered User
        // Find the GroupMember record that matches this User ID
        const memberRecord = groupMembers.find(
            m => m.userId && m.userId.toString() === cycle.recipientId._id.toString()
        );
        if (memberRecord && memberRecord.name) {
             liveName = memberRecord.name; // ✅ USE EDITED SNAPSHOT NAME
        }
      } else {
        // CASE B: Guest / Unregistered
        // Try to match by "Member Number" if we can't match by ID
        // (Since guests don't have a stable UserID link in the cycle, we assume draw order matches)
        const memberRecord = groupMembers.find(m => m.memberNumber === cycle.cycleNumber);
        if (memberRecord && memberRecord.name) {
             liveName = memberRecord.name;
        }
      }

      return {
        ...cycle,
        recipientName: liveName // Overwrite with the latest name
      };
    });

    return NextResponse.json({ cycles: cyclesWithLiveNames });

  } catch (error: any) {
    console.error('GET cycles error:', error);
    return NextResponse.json({ error: 'Failed to fetch cycles' }, { status: 500 });
  }
}

/* ======================================================================
   PUT: Complete or Skip Cycle (Gemini's improved version)
   SECURITY: ONLY LEADER
====================================================================== */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<any> }
) {
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

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const { action, cycleId } = await request.json(); // action: 'complete' | 'skip'

    if (!action || !cycleId) {
      return NextResponse.json({ 
        error: 'Missing parameters', 
        message: 'Both action and cycleId are required.' 
      }, { status: 400 });
    }

    const cycle = await PaymentCycle.findById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    const group = await Group.findById(cycle.groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // 🔒 RBAC CHECK: Only Leader can complete/skip cycles
    if (group.leaderId.toString() !== user._id.toString()) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Only group leader can complete or skip cycles.' 
      }, { status: 403 });
    }

    if (action === 'complete') {
      // Check if this is an active cycle
      if (cycle.status !== 'active') {
        return NextResponse.json({ 
          error: 'Cannot complete', 
          message: `Only active cycles can be completed. This cycle is ${cycle.status}.` 
        }, { status: 400 });
      }

      // Check if all payments are collected
      const pendingPayments = await Payment.countDocuments({
        cycleId: cycle._id,
        status: { $in: ['pending', 'late'] },
      });

      if (pendingPayments > 0) {
        return NextResponse.json(
          { 
            error: 'Cannot complete cycle',
            message: `Cannot complete! ${pendingPayments} members have not paid yet.`
          },
          { status: 400 }
        );
      }

      // Mark cycle as completed
      cycle.status = 'completed';
      cycle.isCompleted = true;
      cycle.completedAt = new Date();
      cycle.completedBy = user._id;
      await cycle.save();

      await Group.findByIdAndUpdate(group._id, {
        currentCycle: null,
        updatedAt: new Date(),
      });

      // ✅ Notify Complete
      await notifyCycleCompleted(cycle);

      const completedCycle = await PaymentCycle.findById(cycle._id)
        .populate('recipientId', 'name email avatar phone')
        .populate('completedBy', 'name email');

      return NextResponse.json({
        success: true,
        cycle: completedCycle,
        message: `Cycle #${cycle.cycleNumber} completed successfully!`,
      });
    }

    if (action === 'skip') {
      // Check if this is an active or upcoming cycle
      if (!['active', 'upcoming'].includes(cycle.status)) {
        return NextResponse.json({ 
          error: 'Cannot skip', 
          message: `Only active or upcoming cycles can be skipped. This cycle is ${cycle.status}.` 
        }, { status: 400 });
      }

      cycle.status = 'skipped';
      cycle.isSkipped = true;
      cycle.skippedAt = new Date();
      cycle.skippedBy = user._id;
      await cycle.save();

      // ✅ Notify Skipped
      try {
        // Try to import notifyCycleSkipped
        const { notifyCycleSkipped } = await import('@/lib/utils/notifications');
        await notifyCycleSkipped(cycle);
      } catch (e) {
        // Fallback to generic notification using GROUP type (not PAYMENT)
        await sendNotificationToAllMembers({
          groupId: group._id,
          type: NotificationType.GROUP, // Changed from 'payment' to NotificationType.GROUP
          title: 'Cycle Skipped',
          message: `Cycle #${cycle.cycleNumber} has been skipped by the leader.`,
          priority: 'medium'
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Cycle #${cycle.cycleNumber} skipped successfully.`,
        cycle
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action', 
      message: 'Action must be either "complete" or "skip".' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('PUT cycle error:', error);
    return NextResponse.json(
      { error: 'Failed to process cycle action', details: error.message },
      { status: 500 }
    );
  }
}

/* ======================================================================
   DELETE: Delete a cycle
   SECURITY: ONLY LEADER
====================================================================== */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<any> }
) {
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

    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');

    if (!cycleId) return NextResponse.json({ error: 'Cycle ID is required' }, { status: 400 });

    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // 🔒 RBAC CHECK: Only Leader
    if (group.leaderId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Only group leader can delete a cycle' }, { status: 403 });
    }

    const cycle = await PaymentCycle.findById(cycleId);
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

    if (cycle.status === 'active') {
      return NextResponse.json({ error: 'Cannot delete an active cycle. Please complete it first.' }, { status: 400 });
    }

    // Check if cycle has any payments made
    const hasPayments = await Payment.findOne({ 
      cycleId: cycle._id, 
      status: { $in: ['paid', 'late'] } 
    });

    if (hasPayments) {
      return NextResponse.json({ 
        error: 'Cannot delete cycle', 
        message: 'This cycle has payments that cannot be deleted.' 
      }, { status: 400 });
    }

    // Delete payments first
    await Payment.deleteMany({ cycleId: cycle._id });
    await PaymentCycle.findByIdAndDelete(cycleId);

    // Update group if needed
    if (group.currentCycle === cycle.cycleNumber) {
      await Group.findByIdAndUpdate(groupId, { currentCycle: null });
    }

    return NextResponse.json({
      success: true,
      message: `Cycle #${cycle.cycleNumber} deleted successfully`,
    });

  } catch (error: any) {
    console.error('DELETE cycle error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cycle', details: error.message },
      { status: 500 }
    );
  }
}