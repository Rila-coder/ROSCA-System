import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { User } from '@/lib/db/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ groups: [], members: [] });
    }

    await connectDB();
    const currentUser = await User.findOne({ email: session.user.email });

    // 1. Find IDs of groups the user belongs to (Security Scope)
    const myMemberships = await GroupMember.find({ 
      userId: currentUser._id,
      status: { $ne: 'removed' }
    });
    const myGroupIds = myMemberships.map(m => m.groupId);

    // 2. Search Groups (Name matches query AND user is a member)
    const groups = await Group.find({
      _id: { $in: myGroupIds },
      name: { $regex: query, $options: 'i' }
    }).select('name description _id').limit(5);

    // 3. Search Members (Correct Logic: Search Snapshot Name OR User Name)
    // We need to find members within MY groups where either their snapshot name OR their user name matches
    
    // Step A: Find users matching the name (Global Search)
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('_id');
    const matchingUserIds = matchingUsers.map(u => u._id);

    // Step B: Find memberships in MY groups that match either:
    // 1. The Global User ID found above
    // 2. The Snapshot Name directly (for guests or edited names)
    const members = await GroupMember.find({
      groupId: { $in: myGroupIds },
      $or: [
        { userId: { $in: matchingUserIds } }, // Matches global profile name
        { name: { $regex: query, $options: 'i' } } // Matches snapshot name (e.g. "Asma SK")
      ]
    })
    .populate('userId', 'name email avatar')
    .populate('groupId', 'name')
    .limit(5);

    // 4. Format Results (Prioritize Snapshot Name)
    const results = {
      groups: groups.map(g => ({
        type: 'group',
        id: g._id,
        title: g.name,
        subtitle: 'Group',
        url: `/groups/${g._id}`
      })),
      members: members.map(m => {
        // ✅ CRITICAL FIX: Use Snapshot Name First
        // 1. m.name (Snapshot/Edited Name)
        // 2. m.userId.name (Global Name)
        // 3. m.pendingMemberDetails.name (Legacy/Guest Name)
        const displayName = m.name || m.userId?.name || m.pendingMemberDetails?.name || 'Unknown';
        
        return {
          type: 'member',
          id: m._id,
          title: displayName, // Now shows "Asma SK" correctly
          subtitle: `Member in ${m.groupId.name}`,
          image: m.userId?.avatar || null,
          url: `/groups/${m.groupId._id}/?tab=members`
        };
      })
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Search Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}