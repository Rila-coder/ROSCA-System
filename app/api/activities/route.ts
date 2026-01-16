import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/utils/jwt';
import connectDB from '@/lib/db/connect';
import { Activity } from '@/lib/db/models/Activity';
import { User } from '@/lib/db/models/User';
import { Group } from '@/lib/db/models/Group';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();
    
    // Get user from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const type = searchParams.get('type');

    // Build query
    const query: any = {};

    // Show user's activities and activities from groups they belong to
    // First, get all groups the user belongs to
    const userGroups = await Group.find({
      $or: [
        { createdBy: user._id },
        { leaderId: user._id },
        { subLeaderIds: user._id }
      ]
    }).select('_id');

    const groupIds = userGroups.map(g => g._id);

    // Query: User's activities OR activities in user's groups
    query.$or = [
      { userId: user._id },
      { groupId: { $in: groupIds } }
    ];

    // Add type filter if provided
    if (type && type !== 'all') {
      query.type = type;
    }

    // Fetch activities with pagination
    const activities = await Activity.find(query)
      .populate('userId', 'name email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Activity.countDocuments(query);

    return NextResponse.json({
      success: true,
      activities,
      total,
      page,
      limit,
      hasMore: skip + activities.length < total
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}