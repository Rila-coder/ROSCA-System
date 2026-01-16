import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from cookies
    const token = request.cookies.get('auth_token')?.value;

    // ✅ FIX: Return null user instead of 401 error to avoid console warnings
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      // Invalid token - clear it and return null user
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('auth_token');
      return response;
    }

    // Find user
    const user = await User.findById(decoded.userId)
      .select('name email phone avatar role isVerified createdAt')
      .lean();

    if (!user) {
      // User deleted from DB - clear cookie and return null
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('auth_token');
      return response;
    }

    // Ensure avatar has proper default
    const defaultAvatar = '/Images/avatar.jpeg';
    const avatar = user.avatar && user.avatar !== defaultAvatar 
      ? user.avatar 
      : defaultAvatar;

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: avatar,
        role: user.role,
        isVerified: user.isVerified,
        memberSince: user.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    
    // Even in error case (like expired token), cleaner to return null user for this specific endpoint
    const response = NextResponse.json({ user: null }, { status: 200 });
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      response.cookies.delete('auth_token');
    }
    
    return response;
  }
}

// Optional: Add POST method for quick user info updates
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, avatar } = body;

    // Update user with provided fields
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (avatar !== undefined) {
      const defaultAvatar = '/Images/avatar.jpeg';
      updateData.avatar = avatar === defaultAvatar ? null : avatar;
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('name email phone avatar');

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar || '/Images/avatar.jpeg',
      },
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}