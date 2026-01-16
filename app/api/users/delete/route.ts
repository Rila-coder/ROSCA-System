import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Payment } from '@/lib/db/models/Payment';
import { Group } from '@/lib/db/models/Group';
import { Activity } from '@/lib/db/models/Activity';
import { Notification } from '@/lib/db/models/Notification';
import { verifyAuthToken } from '@/lib/utils/auth';

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    
    // Verify authentication
    const sessionUser = await verifyAuthToken(req);
    if (!sessionUser) {
      return NextResponse.json({ 
        error: 'Unauthorized: Please login again' 
      }, { status: 401 });
    }

    // Get deletion reason from request body
    let deletionReason = 'No reason provided';
    try {
      const body = await req.json();
      deletionReason = body.reason || deletionReason;
    } catch (e) {
      // No body provided, use default reason
    }

    console.log(`Starting account deletion for user: ${sessionUser.email} (${sessionUser._id})`);
    console.log(`Deletion reason: ${deletionReason}`);

    // Get full user data for validation
    const user = await User.findById(sessionUser._id);
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user is a leader of any active groups
    const userGroupsAsLeader = await Group.find({ leader: user._id });
    
    if (userGroupsAsLeader.length > 0) {
      // User is a leader of some groups - check if there are other members
      const groupsWithMultipleMembers = await Promise.all(
        userGroupsAsLeader.map(async (group) => {
          const memberCount = await GroupMember.countDocuments({ 
            groupId: group._id,
            status: 'active',
            userId: { $ne: user._id } // Exclude the current user
          });
          return { group, memberCount };
        })
      );

      // Check if any group has only this user as member
      const soleMemberGroups = groupsWithMultipleMembers.filter(
        g => g.memberCount === 0
      );

      if (soleMemberGroups.length > 0) {
        const groupNames = soleMemberGroups.map(g => g.group.name).join(', ');
        return NextResponse.json({ 
          error: `You are the only member in group(s): ${groupNames}. Please delete or transfer these groups before deleting your account.` 
        }, { status: 400 });
      }

      // User has groups but there are other members
      console.log(`User ${user.email} is leader of ${userGroupsAsLeader.length} groups with other members`);
    }

    // Start deletion process
    try {
      let deletionSummary = {
        user: false,
        memberships: 0,
        payments: 0,
        activities: 0,
        notifications: 0,
        groupsTransferred: 0
      };

      // 1. Delete all activities
      const deletedActivities = await Activity.deleteMany({ 
        userId: user._id 
      });
      deletionSummary.activities = deletedActivities.deletedCount;
      console.log(`Deleted ${deletionSummary.activities} activity records`);

      // 2. Delete all notifications
      const deletedNotifications = await Notification.deleteMany({ 
        userId: user._id 
      });
      deletionSummary.notifications = deletedNotifications.deletedCount;
      console.log(`Deleted ${deletionSummary.notifications} notification records`);

      // 3. Delete all group memberships
      const deletedMemberships = await GroupMember.deleteMany({ 
        userId: user._id 
      });
      deletionSummary.memberships = deletedMemberships.deletedCount;
      console.log(`Deleted ${deletionSummary.memberships} group memberships`);

      // 4. Delete all payment records
      const deletedPayments = await Payment.deleteMany({ 
        userId: user._id 
      });
      deletionSummary.payments = deletedPayments.deletedCount;
      console.log(`Deleted ${deletionSummary.payments} payment records`);

      // 5. Handle groups where user is a leader
      if (userGroupsAsLeader.length > 0) {
        for (const group of userGroupsAsLeader) {
          // Find the next eligible member to promote
          const nextMember = await GroupMember.findOne({
            groupId: group._id,
            userId: { $ne: user._id },
            status: 'active'
          }).sort({ joinedAt: 1 });

          if (nextMember) {
            // Promote this member to leader
            await Group.findByIdAndUpdate(group._id, {
              leader: nextMember.userId
            });
            console.log(`Promoted user ${nextMember.userId} to leader of group ${group.name}`);
            deletionSummary.groupsTransferred++;
          }
        }
      }

      // 6. Log the deletion in activities before deleting user
      try {
        await Activity.create({
          type: 'account_deletion',
          userId: user._id,
          groupId: null,
          metadata: {
            reason: deletionReason,
            email: user.email,
            name: user.name,
            deletedData: deletionSummary
          },
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        });
      } catch (logError) {
        console.error('Failed to log deletion activity:', logError);
      }

      // 7. Finally, delete the user account
      const deletedUser = await User.findByIdAndDelete(user._id);
      
      if (!deletedUser) {
        throw new Error('Failed to delete user account');
      }

      deletionSummary.user = true;
      console.log(`Successfully deleted user account: ${user.email}`);

      return NextResponse.json({ 
        success: true,
        message: 'Account and all associated data deleted successfully',
        summary: deletionSummary,
        note: 'All data has been permanently removed. You will be redirected to the login page.'
      });

    } catch (dbError: any) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to delete account data. Please try again later.' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Account deletion error:', error);
    
    // More specific error messages
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return NextResponse.json({ 
        error: 'Session expired. Please login again.' 
      }, { status: 401 });
    }

    if (error.message?.includes('network') || error.message?.includes('connection')) {
      return NextResponse.json({ 
        error: 'Network error. Please check your connection and try again.' 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: 'Internal server error during account deletion' 
    }, { status: 500 });
  }
}

// Optional: Add GET method to check deletion eligibility
export async function GET(req: Request) {
  try {
    await dbConnect();
    
    const sessionUser = await verifyAuthToken(req);
    if (!sessionUser) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Check user groups and memberships
    const userGroupsAsLeader = await Group.find({ leader: sessionUser._id });
    const groupMemberships = await GroupMember.find({ userId: sessionUser._id });
    const paymentCount = await Payment.countDocuments({ userId: sessionUser._id });
    const activityCount = await Activity.countDocuments({ userId: sessionUser._id });

    const canDelete = userGroupsAsLeader.length === 0 || 
      userGroupsAsLeader.every(async group => {
        const memberCount = await GroupMember.countDocuments({ 
          groupId: group._id,
          status: 'active',
          userId: { $ne: sessionUser._id }
        });
        return memberCount > 0;
      });

    return NextResponse.json({
      canDelete,
      userDetails: {
        email: sessionUser.email,
        name: sessionUser.name,
        memberSince: sessionUser.createdAt
      },
      accountSummary: {
        groupsLed: userGroupsAsLeader.length,
        groupsJoined: groupMemberships.length,
        paymentsMade: paymentCount,
        activities: activityCount
      },
      warnings: userGroupsAsLeader.length > 0 ? 
        [`You are a leader of ${userGroupsAsLeader.length} group(s). These will be transferred to other members.`] : 
        [],
      nextSteps: canDelete ? [] : [
        'Transfer group leadership for groups where you are the only member',
        'Leave all groups you are part of',
        'Ensure all payments are settled'
      ]
    });

  } catch (error) {
    console.error('Deletion eligibility check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check deletion eligibility' 
    }, { status: 500 });
  }
}