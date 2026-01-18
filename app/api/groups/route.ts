import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';
import { PaymentCycle } from '@/lib/db/models/PaymentCycle'; // ✅ Imported
import { Activity } from '@/lib/db/models/Activity';
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
    // 1. A Member
    // 2. The Leader
    // 3. A Sub-Leader
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

    const groupIds = groups.map(g => g._id);

    // 1. Get member counts
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

    const memberCountMap = new Map();
    memberCounts.forEach(mc => {
      memberCountMap.set(mc._id.toString(), mc.count);
    });

    // ✅ 2. NEW: Get Completed Cycle Counts for Progress Bar
    const completedCycles = await PaymentCycle.aggregate([
      {
        $match: {
          groupId: { $in: groupIds },
          $or: [
            { status: 'completed' },
            { status: 'skipped' },
            { isCompleted: true },
            { isSkipped: true }
          ]
        }
      },
      {
        $group: {
          _id: '$groupId',
          count: { $sum: 1 }
        }
      }
    ]);

    const completedCyclesMap = new Map();
    completedCycles.forEach(c => {
      completedCyclesMap.set(c._id.toString(), c.count);
    });

    // Prepare response with roles
    const responseGroups = groups.map(group => {
      const membership = memberships.find(m => 
        m.groupId.toString() === group._id.toString()
      );

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

      // ✅ Calculate completion status
      const completedCount = completedCyclesMap.get(group._id.toString()) || 0;
      const duration = group.duration || 0;
      const isActuallyCompleted = group.status === 'completed' || (duration > 0 && completedCount >= duration);

      return {
        ...group.toObject(),
        _id: group._id.toString(),
        leaderId: group.leaderId?._id?.toString() || group.leaderId?.toString(),
        leaderDetails: group.leaderId, 
        subLeaderIds: group.subLeaderIds?.map((sub: any) => 
          sub?._id?.toString() || sub?.toString()
        ) || [],
        memberCount: memberCountMap.get(group._id.toString()) || group.duration || 0,
        myRole, 
        myStatus: membership?.status || 'pending',
        // ✅ Send exact progress data
        completedCyclesCount: completedCount,
        isCompleted: isActuallyCompleted
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
      targetMemberCount,
      leaderEmail
    } = body;

    if (!name || !contributionAmount || !frequency || !startDate || !targetMemberCount) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    const duration = Number(targetMemberCount);
    if (duration < 2) {
      return NextResponse.json(
        { error: 'At least 2 members required' },
        { status: 400 }
      );
    }

    let leaderUser = currentUser;
    if (leaderEmail) {
      leaderUser = await User.findOne({ email: leaderEmail.toLowerCase().trim() });
      if (!leaderUser) {
        return NextResponse.json(
          { error: 'Selected leader does not have an account. Please register first.' },
          { status: 400 }
        );
      }
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const totalAmount = Number(contributionAmount) * duration;

    const newGroup = await Group.create({
      name,
      description: description || '',
      contributionAmount: Number(contributionAmount),
      frequency: frequency.toLowerCase(),
      duration: duration,
      startDate: new Date(startDate),
      createdBy: currentUser._id,
      leaderId: leaderUser._id,
      subLeaderIds: [],
      status: 'active',
      currentCycle: 0,
      totalAmount,
      inviteCode,
      bankAccount: bankAccount?.bankName ? bankAccount : null,
    });

    await Activity.create({
      groupId: newGroup._id,
      userId: currentUser._id,
      type: 'group_created',
      description: `${currentUser.name} created group "${name}"`,
      metadata: {
        groupName: name,
        contributionAmount,
        frequency,
        duration,
        totalAmount,
        leaderName: leaderUser.name,
        creatorName: currentUser.name
      }
    });

    if (leaderUser._id.toString() !== currentUser._id.toString()) {
      await sendNotification({
        userId: leaderUser._id,
        type: NotificationType.GROUP,
        title: 'You are the Leader!',
        message: `You have been assigned as the Leader for group "${name}".`,
        groupId: newGroup._id,
        priority: 'high'
      });

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
      await sendNotification({
        userId: currentUser._id,
        type: NotificationType.GROUP,
        title: 'Group Created',
        message: `You created "${name}" and you are the Leader.`,
        groupId: newGroup._id,
        priority: 'medium'
      });
    }

    const memberPromises = members.map(async (memberData: any) => {
      let userId = null;
      let status = 'pending';
      let role = memberData.role || 'member';
      
      const isLeader = memberData.isLeader || 
        (memberData.email && leaderEmail && 
         memberData.email.toLowerCase() === leaderEmail.toLowerCase());
      
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
        
        if (existingUser._id.toString() !== currentUser._id.toString()) {
          await sendNotification({
            userId: existingUser._id,
            type: NotificationType.GROUP,
            title: 'Added to Group',
            message: `You have been added to "${name}". The Leader is ${leaderUser.name}.`,
            groupId: newGroup._id,
            priority: 'medium'
          });

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

      return GroupMember.create({
        groupId: newGroup._id,
        userId: userId,
        name: memberData.name,
        email: memberData.email.toLowerCase(),
        phone: memberData.phone,
        role: role,
        status: status,
        memberNumber: memberData.assignedNumber || memberData.drawNumber || null,
        totalPaid: 0,
        totalReceived: 0,
      });
    });

    await Promise.all(memberPromises);

    return NextResponse.json({ 
      success: true, 
      group: newGroup,
      message: 'Group created successfully'
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