import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Activity } from '@/lib/db/models/Activity';
import { User } from '@/lib/db/models/User';
import { GroupMember } from '@/lib/db/models/GroupMember';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ activities: [] });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ activities: [] });
    }

    // Get all groups where user is a member
    const userMemberships = await GroupMember.find({ 
      userId: user._id,
      status: { $in: ['active', 'pending'] }
    });

    const userGroupIds = userMemberships.map(m => m.groupId);

    // If user has no groups, return empty
    if (userGroupIds.length === 0) {
      return NextResponse.json({ activities: [] });
    }

    // Fetch recent activities from user's groups
    const activities = await Activity.find({
      groupId: { $in: userGroupIds }
    })
    .populate('groupId', 'name')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(20); // Limit to 20 most recent activities

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ activities: [] });
  }
}