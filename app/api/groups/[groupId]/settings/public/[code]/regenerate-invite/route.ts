import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { User } from '@/lib/db/models/User';
import crypto from 'crypto';

export async function POST(
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
    
    // ✅ Extract both groupId and the current code from the URL path
    const params = await context.params;
    const groupId = params.groupId; // From [groupId]
    const currentCode = params.code; // From [code]

    if (!groupId) {
        return NextResponse.json({ error: 'Missing Group ID' }, { status: 400 });
    }

    // Find group by ID (and optionally verify the old code matches)
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Security Check: Only leader can regenerate invite
    if (!group.leaderId.equals(user._id)) {
      return NextResponse.json({ error: 'Only leader can regenerate invite link' }, { status: 403 });
    }

    // Generate new code
    const newInviteCode = `ROSCA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    
    group.inviteCode = newInviteCode;
    await group.save();

    return NextResponse.json({ 
        success: true, 
        inviteCode: newInviteCode,
        message: 'Invite link regenerated successfully' 
    });

  } catch (error: any) {
    console.error('Error regenerating invite:', error);
    return NextResponse.json({ error: 'Failed to regenerate invite' }, { status: 500 });
  }
}