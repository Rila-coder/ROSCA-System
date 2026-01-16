import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { Activity } from '@/lib/db/models/Activity';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { sendNotification } from '@/lib/utils/notifications';
import { NotificationType } from '@/types/notification';

export async function GET() {
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

    // Find groups where user is a member
    const memberships = await GroupMember.find({ 
      userId: user._id,
      status: { $ne: 'removed' }
    });
    const memberGroupIds = memberships.map(m => m.groupId);

    // Find groups where user is:
    // 1. A Member (via GroupMember)
    // 2. The Leader (via Group.leaderId)
    // 3. A Sub-Leader (via Group.subLeaderIds)
    const groups = await Group.find({
      $or: [
        { _id: { $in: memberGroupIds } },
        { leaderId: user._id },
        { subLeaderIds: user._id }
      ]
    })
    .populate('leaderId', 'name email avatar')
    .populate('subLeaderIds', 'name email avatar')
    .sort({ createdAt: -1 });

    // Get member counts for all groups
    const groupIds = groups.map(g => g._id);
    const memberCounts = await GroupMember.aggregate([
      {
        $match: {
          groupId: { $in: groupIds },
          status: { $ne: 'removed' }
        }
      },
      {
        $group: {
          _id: '$groupId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of groupId -> memberCount
    const memberCountMap = new Map();
    memberCounts.forEach(mc => {
      memberCountMap.set(mc._id.toString(), mc.count);
    });

    // Prepare response with roles
    const responseGroups = groups.map(group => {
      // Find membership for this group
      const membership = memberships.find(m => 
        m.groupId.toString() === group._id.toString()
      );

      // Determine user's role in this group
      let myRole = 'member';
      
      if (group.leaderId?._id?.toString() === user._id.toString() || 
          group.leaderId?.toString() === user._id.toString()) {
        myRole = 'leader';
      } else if (group.subLeaderIds?.some((sub: any) => 
        sub?._id?.toString() === user._id.toString() || 
        sub?.toString() === user._id.toString()
      )) {
        myRole = 'sub_leader';
      } else if (membership) {
        myRole = membership.role || 'member';
      }

      return {
        ...group.toObject(),
        _id: group._id.toString(),
        leaderId: group.leaderId?._id?.toString() || group.leaderId?.toString(),
        leaderDetails: group.leaderId, // Keep this for display
        subLeaderIds: group.subLeaderIds?.map((sub: any) => 
          sub?._id?.toString() || sub?.toString()
        ) || [],
        memberCount: memberCountMap.get(group._id.toString()) || group.duration || 0,
        myRole, // 'leader', 'sub_leader', or 'member'
        myStatus: membership?.status || 'pending'
      };
    });

    return NextResponse.json({ 
      success: true, 
      groups: responseGroups 
    });

  } catch (error: any) {
    console.error('❌ Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get current user (The Creator)
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    
    const { 
      name, 
      description, 
      contributionAmount, 
      frequency, 
      startDate,
      bankAccount,
      members = [],
      targetMemberCount, // From Gemini's update
      leaderEmail // The user selected as "Leader" in the form (from original)
    } = body;

    // Validation (combined from both)
    if (!name || !contributionAmount || !frequency || !startDate || !targetMemberCount) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Duration handling - use targetMemberCount from Gemini's update
    const duration = Number(targetMemberCount);
    if (duration < 2) {
      return NextResponse.json(
        { error: 'At least 2 members required' },
        { status: 400 }
      );
    }

    // Leader handling (from original, with fallback)
    let leaderUser = currentUser; // Default to current user
    if (leaderEmail) {
      leaderUser = await User.findOne({ email: leaderEmail.toLowerCase().trim() });
      if (!leaderUser) {
        return NextResponse.json(
          { error: 'Selected leader does not have an account. Please register first.' },
          { status: 400 }
        );
      }
    }

    // Generate invite code (from Gemini's update, simplified)
    // const inviteCode = `ROSCA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Calculate total amount
    const totalAmount = Number(contributionAmount) * duration;

    // Create Group with RBAC fields (combined from both)
    const newGroup = await Group.create({
      name,
      description: description || '',
      contributionAmount: Number(contributionAmount),
      frequency: frequency.toLowerCase(),
      duration: duration,
      startDate: new Date(startDate),
      
      // Role assignment
      createdBy: currentUser._id,   // Always the person logged in
      leaderId: leaderUser._id,     // Leader (from selection or current user)
      subLeaderIds: [],             // Initialize empty
      
      status: 'active',
      currentCycle: 0,
      totalAmount,
      inviteCode,
      bankAccount: bankAccount?.bankName ? bankAccount : null,
    });

    // ✅ ACTIVITY LOG: Log group creation
    await Activity.create({
      groupId: newGroup._id,
      userId: currentUser._id,
      type: 'group_created',
      description: `${currentUser.name} created group "${name}"`,
      metadata: {
        groupName: name,
        contributionAmount: contributionAmount,
        frequency: frequency,
        duration: duration,
        totalAmount: totalAmount,
        leaderName: leaderUser.name,
        creatorName: currentUser.name
      }
    });

    // Handle notifications for the leader (from original)
    if (leaderUser._id.toString() !== currentUser._id.toString()) {
      // Notify Leader if different from creator
      await sendNotification({
        userId: leaderUser._id,
        type: NotificationType.GROUP,
        title: 'You are the Leader!',
        message: `You have been assigned as the Leader for group "${name}".`,
        groupId: newGroup._id,
        priority: 'high'
      });

      // ✅ ACTIVITY LOG: Log leader assignment
      await Activity.create({
        groupId: newGroup._id,
        userId: currentUser._id,
        type: 'role_changed',
        description: `${currentUser.name} assigned ${leaderUser.name} as the Leader of "${name}"`,
        metadata: {
          groupName: name,
          assignedLeader: leaderUser.name,
          assignedBy: currentUser.name
        }
      });
    } else {
      // If creator is also leader, confirm it
      await sendNotification({
        userId: currentUser._id,
        type: NotificationType.GROUP,
        title: 'Group Created',
        message: `You created "${name}" and you are the Leader.`,
        groupId: newGroup._id,
        priority: 'medium'
      });
    }

    // Process members (adapted to use Gemini's snapshot approach)
    const memberPromises = members.map(async (memberData: any) => {
      let userId = null;
      let status = 'pending';
      let role = memberData.role || 'member';
      
      // Check if member is leader
      const isLeader = memberData.isLeader || 
        (memberData.email && leaderEmail && 
         memberData.email.toLowerCase() === leaderEmail.toLowerCase());
      
      // Check if member is creator
      const isCreator = memberData.email && 
        memberData.email.toLowerCase() === currentUser.email.toLowerCase();
      
      // Find existing user
      const existingUser = await User.findOne({ 
        email: memberData.email.toLowerCase() 
      });
      
      if (existingUser) {
        userId = existingUser._id;
        status = 'active';
        
        if (isLeader) {
          role = 'leader';
        } else if (memberData.role) {
          role = memberData.role;
        } else {
          role = 'member';
        }
        
        // Send notifications for non-creator members
        if (existingUser._id.toString() !== currentUser._id.toString()) {
          await sendNotification({
            userId: existingUser._id,
            type: NotificationType.GROUP,
            title: 'Added to Group',
            message: `You have been added to "${name}". The Leader is ${leaderUser.name}.`,
            groupId: newGroup._id,
            priority: 'medium'
          });

          // ✅ ACTIVITY LOG: Log member addition
          await Activity.create({
            groupId: newGroup._id,
            userId: currentUser._id,
            type: 'member_added',
            description: `${currentUser.name} added ${existingUser.name} to group "${name}"`,
            metadata: {
              groupName: name,
              memberName: existingUser.name,
              memberEmail: existingUser.email,
              role: role,
              addedBy: currentUser.name
            }
          });
        }
      } else if (isLeader) {
        role = 'leader';
      }

      // Create GroupMember with snapshot data (from Gemini's update)
      return GroupMember.create({
        groupId: newGroup._id,
        userId: userId,
        // Snapshot data (from Gemini)
        name: memberData.name,
        email: memberData.email.toLowerCase(),
        phone: memberData.phone,
        role: role,
        status: status,
        memberNumber: memberData.assignedNumber || memberData.drawNumber || null,
        
        // Additional financial fields from original
        totalPaid: 0,
        totalReceived: 0,
        
        // Additional fields from original (if needed)
        // joinedAt: new Date(),
        // hasReceived: false,
        // receivedCycle: 0
      });
    });

    await Promise.all(memberPromises);

    return NextResponse.json({ 
      success: true, 
      group: newGroup,
      message: 'Group created successfully with dynamic duration and notifications sent'
    });

  } catch (error: any) {
    console.error('❌ Error creating group:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation Error', details: error.message },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate group or member found', details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    );
  }
}