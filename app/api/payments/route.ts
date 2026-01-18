import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { Group } from '@/lib/db/models/Group'; // ✅ Imported Group Model
import { GroupMember } from '@/lib/db/models/GroupMember';
// ✅ Import PaymentCycle to ensure schema is registered for population
import { PaymentCycle } from '@/lib/db/models/PaymentCycle'; 
import { verifyAuthToken } from '@/lib/utils/auth';
import { sendNotification } from '@/lib/utils/notifications';
import { NotificationType } from '@/types/notification';

// --- GET: Fetch Payment Data ---
export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); 

    if (type === 'group' || type === 'all') {
      return await handleDownload(req, user);
    }

    const myMemberships = await GroupMember.find({ userId: user._id })
      .populate('groupId', 'name status'); // ✅ Fetch Status
    
    const myGroupIds = myMemberships.map(m => m.groupId._id || m.groupId);

    // ✅ FIX: Populate 'memberId' too so we can see Guest Names
    const payments = await Payment.find({ groupId: { $in: myGroupIds } })
      .populate('userId', 'name phone') // Global User Data
      .populate('memberId', 'name phone email') // Snapshot Group Data (Critical for Guests)
      .populate('groupId', 'name status') // ✅ Populate Status
      .populate({
          path: 'cycleId',
          select: 'cycleNumber status isSkipped', // ✅ Fetch Skipped Status
          strictPopulate: false 
      }) 
      .sort({ createdAt: -1 });

    const groupsMap = new Map();

    const getMyRole = (groupId: string) => {
      const membership = myMemberships.find(m => (m.groupId._id || m.groupId).toString() === groupId.toString());
      return membership ? membership.role : 'member';
    };

    payments.forEach((p: any) => {
      if (!p.groupId) return; // Only skip if Group is missing

      const groupId = (p.groupId._id || p.groupId).toString();
      const isGroupCompleted = p.groupId.status === 'completed'; // ✅ Check Completion
      
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          groupId: groupId,
          groupName: p.groupId.name || 'Unknown Group',
          myRole: getMyRole(groupId),
          isGroupCompleted: isGroupCompleted, // ✅ Add Flag
          cycles: new Map() 
        });
      }

      const groupEntry = groupsMap.get(groupId);
      const cycleKey = p.cycleId?.cycleNumber || p.cycleNumber || 1;
      const isCycleSkipped = p.cycleId?.isSkipped || p.cycleId?.status === 'skipped'; // ✅ Check Skipped

      if (!groupEntry.cycles.has(cycleKey)) {
        groupEntry.cycles.set(cycleKey, {
          cycleNumber: cycleKey,
          isSkipped: isCycleSkipped, // ✅ Add Flag
          payments: []
        });
      }

      // ✅ LOGIC FIX: Determine Identity (Registered vs Guest)
      let finalUserId = null;
      let displayName = 'Unknown Member';
      let displayPhone = 'N/A';

      if (p.userId) {
        // Case A: Registered User
        finalUserId = p.userId._id.toString();
        // Prioritize Snapshot Name if available (e.g. "Asma SK"), else Global Name
        displayName = p.memberId?.name || p.userId.name;
        displayPhone = p.memberId?.phone || p.userId.phone;
      } else if (p.memberId) {
        // Case B: Guest / Unregistered (No UserID, but has MemberID)
        // Use "guest-" prefix to make a unique ID string for frontend keys
        finalUserId = `guest-${p.memberId._id.toString()}`;
        displayName = p.memberId.name; // Snapshot Name
        displayPhone = p.memberId.phone;
      } else {
        // Case C: Broken Record (skip or handle gracefully)
        return; 
      }

      groupEntry.cycles.get(cycleKey).payments.push({
        id: p._id.toString(),
        userId: finalUserId,
        memberName: displayName,
        memberPhone: displayPhone,
        amount: p.amount || 0,
        status: p.status || 'pending', 
        method: p.paymentMethod ? p.paymentMethod.charAt(0).toUpperCase() + p.paymentMethod.slice(1) : 'Cash',
        paidDate: p.paidAt ? new Date(p.paidAt).toISOString() : null,
        // Check "My Payment" only if it's a real user ID match
        isMyPayment: p.userId && p.userId._id.toString() === user._id.toString()
      });
    });

    const groupedData: any[] = [];
    groupsMap.forEach(group => {
      const cyclesArray = Array.from(group.cycles.values());
      cyclesArray.sort((a: any, b: any) => a.cycleNumber - b.cycleNumber);
      
      groupedData.push({ 
        ...group, 
        cycles: cyclesArray,
        isLeader: group.myRole === 'leader',
        isSubLeader: group.myRole === 'sub_leader' || group.myRole === 'subleader'
      });
    });

    return NextResponse.json({
      groups: groupedData,
      currentUserId: user._id.toString(),
      userRoleInfo: {
        isLeaderInAnyGroup: groupedData.some(g => g.myRole === 'leader'),
        myGroupCount: groupedData.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// --- HELPER: Handle Downloads ---
async function handleDownload(req: Request, user: any) {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const groupId = url.searchParams.get('groupId');

    if (type === 'group' && groupId) {
      const membership = await GroupMember.findOne({ userId: user._id, groupId: groupId });
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

      // ✅ FIX 3: Also populate cycleId for downloads
      const paymentsData = await Payment.find({ groupId: groupId })
        .populate('userId', 'name phone')
        .populate('groupId', 'name')
        .populate('cycleId', 'cycleNumber') 
        .sort({ createdAt: 1 });

      let filteredPayments = paymentsData;
      if (membership.role === 'member') {
        filteredPayments = paymentsData.filter(p => p.userId._id.toString() === user._id.toString());
      }

      return NextResponse.json({
        success: true,
        type: 'group',
        userRole: membership.role,
        groupName: paymentsData[0]?.groupId?.name || 'Group',
        payments: filteredPayments.map(p => ({
          memberName: p.userId.name,
          memberPhone: p.userId.phone,
          amount: p.amount,
          // ✅ FIX 4: Use correct cycle number logic
          cycleNumber: p.cycleId?.cycleNumber || p.cycleNumber || 1,
          status: p.status,
          paymentMethod: p.paymentMethod || 'cash',
          paidAt: p.paidAt ? p.paidAt.toISOString() : null,
          userId: p.userId._id.toString()
        }))
      });
    } 
    else if (type === 'all') {
      const paymentsData = await Payment.find({ userId: user._id })
        .populate('userId', 'name phone')
        .populate('groupId', 'name')
        .populate('cycleId', 'cycleNumber')
        .sort({ groupId: 1, createdAt: 1 });

      return NextResponse.json({
        success: true,
        type: 'all',
        userName: user.name,
        payments: paymentsData.map(p => ({
          groupName: p.groupId.name,
          memberName: p.userId.name,
          amount: p.amount,
          // ✅ FIX 5: Use correct cycle number logic
          cycleNumber: p.cycleId?.cycleNumber || p.cycleNumber || 1,
          status: p.status,
          paymentMethod: p.paymentMethod || 'cash',
          paidAt: p.paidAt ? p.paidAt.toISOString() : null,
          userId: p.userId._id.toString()
        }))
      });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// --- POST: Handle Updates ---
export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { paymentId, action, method, groupId } = body;

    // --- CASE A: Send Reminder ---
    if (action === 'send_reminder') {
       if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
       return NextResponse.json({ success: true });
    }

    // --- CASE B: Update Payment ---
    if (paymentId) {
      const payment = await Payment.findById(paymentId);
      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

      // ✅ CHECK GROUP STATUS FIRST
      const group = await Group.findById(payment.groupId);
      if (group && group.status === 'completed') {
         return NextResponse.json({ error: 'Group is completed. Payments cannot be modified.' }, { status: 400 });
      }

      // Verify Leader Permission
      const membership = await GroupMember.findOne({ 
        userId: user._id, 
        groupId: payment.groupId 
      });
      
      if (!membership || membership.role !== 'leader') {
        return NextResponse.json({ error: 'Permission denied. Only Leaders can update payments.' }, { status: 403 });
      }

      // Handle Actions
      if (action === 'mark_paid') {
        payment.status = 'paid';
        payment.paymentMethod = 'cash'; 
        payment.paidAt = new Date(); 
        
        await sendNotification({
          userId: payment.userId.toString(),
          type: NotificationType.PAYMENT, 
          title: 'Payment Received',
          message: `Leader marked your payment of ₹${payment.amount} as PAID.`, 
          groupId: payment.groupId.toString(),
          priority: 'medium',
          data: {
            paymentId: payment._id,
            amount: payment.amount,
            cycleNumber: payment.cycleNumber
          }
        });
      } 
      else if (action === 'unmark_paid') {
        payment.status = 'pending';
        payment.paymentMethod = undefined;
        payment.paidAt = undefined; 
        
        await sendNotification({
          userId: payment.userId.toString(),
          type: NotificationType.ALERT, 
          title: 'Payment Status Changed',
          message: `Leader changed your payment status back to PENDING.`, 
          groupId: payment.groupId.toString(),
          priority: 'high', 
          data: {
            paymentId: payment._id,
            amount: payment.amount
          }
        });
      }
      else if (action === 'update_method') {
        const methodLower = method.toLowerCase();
        if (methodLower !== 'cash' && methodLower !== 'bank') {
          return NextResponse.json({ error: 'Invalid method. Use Cash or Bank.' }, { status: 400 });
        }
        payment.paymentMethod = methodLower;
      }

      try {
        await payment.validate();
      } catch (validationError: any) {
         console.error("Validation Error:", validationError);
         return NextResponse.json({ error: `Validation Error: ${validationError.message}` }, { status: 400 });
      }

      await payment.save();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('CRITICAL Error in POST:', error);
    return NextResponse.json({ error: 'Failed to process request', details: error.message }, { status: 500 });
  }
}

// --- DELETE: Remove Record ---
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });

    const payment = await Payment.findById(paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    // ✅ CHECK GROUP STATUS FIRST
    const group = await Group.findById(payment.groupId);
    if (group && group.status === 'completed') {
       return NextResponse.json({ error: 'Group is completed. Payments cannot be deleted.' }, { status: 400 });
    }

    const membership = await GroupMember.findOne({ 
      userId: user._id, 
      groupId: payment.groupId 
    });
    
    if (!membership || membership.role !== 'leader') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'You must mark as paid before deleting.' }, { status: 400 });
    }

    await Payment.findByIdAndDelete(paymentId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}