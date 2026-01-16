import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { GroupMember } from '@/lib/db/models/GroupMember';

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const params = await context.params;

    // ✅ FETCH ONLY ELIGIBLE LEADERS
    // Rule: Must be 'active' AND have a real 'userId'
    const members = await GroupMember.find({ 
      groupId: params.groupsId, 
      status: 'active',
      userId: { $ne: null } 
    })
    .populate('userId', 'name email avatar')
    .select('userId role');

    console.log(`Found ${members.length} eligible members for leadership transfer.`);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}