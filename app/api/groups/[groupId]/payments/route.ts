import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { User } from '@/lib/db/models/User';
import { GroupMember } from '@/lib/db/models/GroupMember';

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
    const groupId = params.groupsId || params.groupId || params.id;

    // =================================================================
    // 🔍 STEP 1: FIND THE CORRECT ACTIVE CYCLE
    // =================================================================
    let currentCycle = null;
    
    // Priority 1: Strictly find 'active' status cycle
    currentCycle = await PaymentCycle.findOne({ 
      groupId, 
      status: 'active' 
    });

    // Priority 2: If no active, find upcoming cycle
    if (!currentCycle) {
      currentCycle = await PaymentCycle.findOne({ 
        groupId, 
        status: 'upcoming' 
      }).sort('cycleNumber');
    }

    // Priority 3: Legacy fallback
    if (!currentCycle) {
      currentCycle = await PaymentCycle.findOne({ 
        groupId,
        $or: [
          { status: { $exists: false } },
          { status: { $nin: ['completed', 'skipped'] } }
        ],
        $and: [
          { isCompleted: false },
          { isSkipped: false }
        ]
      }).sort('cycleNumber');
    }

    // =================================================================
    // 🔍 STEP 2: FETCH PAYMENTS
    // =================================================================
    let rawPayments = [];

    if (currentCycle) {
      // Only fetch payments for the current cycle
      rawPayments = await Payment.find({ cycleId: currentCycle._id })
        .populate('userId', 'name email phone avatar') // Global User Data
        .populate('memberId') // ✅ Snapshot Group Data
        .sort({ createdAt: -1 });
    }

    // =================================================================
    // 🛠️ STEP 3: FORMAT DATA (FIXED NAME PRIORITY)
    // =================================================================
    const formattedPayments = rawPayments.map((p: any) => {
      const realUser = p.userId;
      const memberInfo = p.memberId; 
      const pendingData = memberInfo?.pendingMemberDetails;

      // ✅ CRITICAL FIX: Look at memberInfo (Snapshot) FIRST
      // 1. memberInfo.name = The name edited in the group (e.g., "Asma SK")
      // 2. realUser.name = The global account name (e.g., "Asma")
      const displayName = memberInfo?.name || realUser?.name || pendingData?.name || 'Unknown Member';
      
      const displayPhone = memberInfo?.phone || realUser?.phone || pendingData?.phone || 'N/A';
      const displayEmail = memberInfo?.email || realUser?.email || pendingData?.email || '';
      
      // Avatar usually comes from Real User, fallback to null
      const displayAvatar = realUser?.avatar || null;

      return {
        _id: p._id,
        amount: p.amount,
        status: p.status,
        dueDate: currentCycle?.dueDate,
        paidAt: p.paidAt,
        verifiedBy: p.verifiedBy,
        notes: p.notes,
        cycleId: p.cycleId,
        
        // Unified user object expected by frontend
        userId: {
          _id: realUser?._id || memberInfo?._id || null,
          name: displayName, // ✅ Now sends "Asma SK"
          phone: displayPhone,
          email: displayEmail,
          avatar: displayAvatar
        }
      };
    });

    return NextResponse.json({ 
      currentCycle: currentCycle || null,
      payments: formattedPayments 
    });

  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      error: 'Failed to load payment data',
      details: error.message 
    }, { status: 500 });
  }
}