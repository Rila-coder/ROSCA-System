import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { Payment } from '@/lib/db/models/Payment';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Group } from '@/lib/db/models/Group'; 
import { User } from '@/lib/db/models/User';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle';
import { verifyAuthToken } from '@/lib/utils/auth';

export async function GET(req: Request) {
  try {
    // 1. Connect & Auth
    await dbConnect();
    const user = await verifyAuthToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch User's Memberships
    const myMemberships = await GroupMember.find({ userId: user._id }).populate('groupId');
    
    // Safety check for new users with no groups
    if (!myMemberships || myMemberships.length === 0) {
      return NextResponse.json({ 
        groups: [], 
        general: { 
          id: user._id.toString(),
          name: user.name, 
          email: user.email, 
          totalPaid: 0, 
          totalPending: 0, 
          activeGroups: 0, 
          paymentHistory: [],
          chartData: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: new Array(12).fill(0),
            summary: { collected: 0, pending: 0 }
          }
        } 
      });
    }

    // Filter valid groups
    const validMemberships = myMemberships.filter(m => m.groupId);
    const groupIds = validMemberships.map(m => m.groupId._id);

    // 3. Fetch Payments
    const payments = await Payment.find({ groupId: { $in: groupIds } });

    // 4. Aggregate Group Data
    const groupsData = await Promise.all(validMemberships.map(async (membership) => {
      const group = membership.groupId;
      if (!group) return null;

      // ✅ FIX: Safe check for groupId presence
      const groupPayments = payments.filter(p => p.groupId && p.groupId.toString() === group._id.toString());
      
      const totalCollected = groupPayments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0);
      const totalPending = groupPayments.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);

      // --- DYNAMIC TIMELINE DATA GENERATION BASED ON FREQUENCY ---
      const duration = group.duration || 12;
      const frequency = group.frequency || 'monthly';
      const startDate = new Date(group.startDate);
      
      let timelineLabels: string[] = [];
      let timelineValues: number[] = new Array(duration).fill(0);

      // Generate labels based on frequency
      if (frequency === 'daily') {
        for (let i = 0; i < duration; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          timelineLabels.push(`Day ${i+1}`); // Or use date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        }
      } else if (frequency === 'weekly') {
        for (let i = 0; i < duration; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (i * 7));
          timelineLabels.push(`Week ${i+1}`); // Or use date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        }
      } else { // monthly
        for (let i = 0; i < duration; i++) {
          const date = new Date(startDate);
          date.setMonth(startDate.getMonth() + i);
          timelineLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
      }

      // Map payments to timeline based on cycle numbers
      groupPayments.filter(p => p.status === 'paid').forEach(payment => {
        if (payment.cycleNumber && payment.cycleNumber <= duration) {
          // Payment has a cycle number - map directly
          timelineValues[payment.cycleNumber - 1] += payment.amount;
        } else {
          // Fallback: Try to calculate cycle from date
          try {
            const paymentDate = new Date(payment.paidAt || payment.createdAt);
            if (!isNaN(paymentDate.getTime())) {
              let cycleIndex = 0;
              
              if (frequency === 'daily') {
                const diffDays = Math.floor((paymentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                cycleIndex = Math.max(0, Math.min(diffDays, duration - 1));
              } else if (frequency === 'weekly') {
                const diffWeeks = Math.floor((paymentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
                cycleIndex = Math.max(0, Math.min(diffWeeks, duration - 1));
              } else {
                const diffMonths = (paymentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (paymentDate.getMonth() - startDate.getMonth());
                cycleIndex = Math.max(0, Math.min(diffMonths, duration - 1));
              }
              
              timelineValues[cycleIndex] += payment.amount;
            }
          } catch (e) {
            console.error('Error mapping payment to timeline:', e);
          }
        }
      });

      // Member Count
      const memberCount = await GroupMember.countDocuments({ 
        groupId: group._id, 
        status: { $ne: 'removed' } 
      });

      // Calculate Target
      const contribution = group.contributionAmount || 0;
      const target = contribution * (memberCount || 1) * duration;

      // Fetch payment cycles for additional info
      const paymentCycles = await PaymentCycle.find({ 
        groupId: group._id 
      }).sort({ cycleNumber: 1 });

      return {
        id: group._id.toString(),
        name: group.name,
        role: membership.role,
        startDate: group.startDate,
        frequency,
        totalCollected,
        totalPending,
        target,
        monthlyData: timelineValues, // Keep for backward compatibility
        timelineData: timelineValues, // For backward compatibility
        timelineLabels: timelineLabels, // For backward compatibility
        chartData: { // NEW: Structured chart data
          labels: timelineLabels,
          values: timelineValues,
          summary: { collected: totalCollected, pending: totalPending }
        },
        memberCount, 
        status: group.status || 'active',
        currentCycle: group.currentCycle || 1,
        contributionAmount: contribution,
        duration: duration,
        paymentCycles: paymentCycles.map(pc => ({
          cycleNumber: pc.cycleNumber,
          dueDate: pc.dueDate,
          amount: pc.amount,
          status: pc.status,
          recipientName: pc.recipientName
        }))
      };
    }));

    const cleanGroupsData = groupsData.filter(Boolean);

    // 5. Build General Data
    // ✅ CRITICAL FIX: The error happened here. We must check if `p.userId` exists before .toString()
    // This handles Guest Payments (where userId is null) safely.
    const myPayments = payments.filter(p => p.userId && p.userId.toString() === user._id.toString());
    
    const myTotalPaid = myPayments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0);
    const myPending = myPayments.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0);

    // General Report Monthly Trend Data (Always 12 months for annual view)
    const generalMonthlyValues = new Array(12).fill(0);
    const generalMonthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    myPayments.filter(p => p.status === 'paid').forEach(p => {
      try {
        const d = p.paidAt || p.createdAt;
        if (d) {
           const date = new Date(d);
           if (!isNaN(date.getTime())) generalMonthlyValues[date.getMonth()] += p.amount;
        }
      } catch (e) {}
    });

    return NextResponse.json({
      groups: cleanGroupsData,
      general: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        totalPaid: myTotalPaid,
        totalPending: myPending,
        activeGroups: validMemberships.filter(m => m.status === 'active').length,
        paymentHistory: myPayments.map(p => ({
          amount: p.amount,
          date: p.paidAt || p.createdAt || new Date(),
          group: cleanGroupsData.find((g: any) => p.groupId && g.id === p.groupId.toString())?.name || 'Unknown',
          status: p.status
        })),
        // General Report Chart Data (12-month calendar view)
        monthlyData: generalMonthlyValues, // For backward compatibility
        chartData: {
          labels: generalMonthlyLabels,
          values: generalMonthlyValues,
          summary: { collected: myTotalPaid, pending: myPending }
        }
      }
    });

  } catch (error: any) {
    console.error('SERVER ERROR in Reports API:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}