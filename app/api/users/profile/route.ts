import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { verifyAuthToken } from '@/lib/utils/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Return current user data with default avatar if not set
    const defaultAvatar = '/Images/avatar.jpeg';
    const avatar = user.avatar && user.avatar !== defaultAvatar ? user.avatar : defaultAvatar;
    
    return NextResponse.json({ 
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: avatar
      }
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return NextResponse.json({ 
        error: 'Session expired. Please login again.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Server Error. Please try again later.' 
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, avatar } = body;
    
    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json({ 
        error: 'Name and phone number are required' 
      }, { status: 400 });
    }

    // Handle avatar logic
    const defaultAvatar = '/Images/avatar.jpeg';
    let avatarPath: string | null = user.avatar;
    
    if (avatar === null) {
      // Explicit request to use default avatar
      avatarPath = defaultAvatar;
    } else if (avatar === '') {
      // Empty string means no change - keep current
      avatarPath = user.avatar;
    } else if (avatar && avatar.startsWith('data:image')) {
      // Base64 image provided - store it in database
      // Note: For production, you might want to upload to cloud storage
      // and store only the URL, but for demo we'll store base64
      avatarPath = avatar;
    } else {
      // Invalid or no avatar provided - use default
      avatarPath = defaultAvatar;
    }

    // Ensure we don't store default avatar path if it's the same
    if (avatarPath === defaultAvatar) {
      // Store null instead of default path to save space
      avatarPath = null;
    }

    // Update user with validated data
    const updatedUser = await User.findByIdAndUpdate(
      user._id, 
      { 
        name: name.trim(), 
        phone: phone.trim(), 
        avatar: avatarPath 
      },
      { new: true, runValidators: true }
    ).select('name email phone avatar');

    if (!updatedUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Return the actual avatar URL (use default if null)
    const responseAvatar = updatedUser.avatar || defaultAvatar;

    return NextResponse.json({ 
      success: true,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: responseAvatar
      },
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({ 
        error: `${field} already exists` 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Update failed. Please try again.' 
    }, { status: 500 });
  }
}

// Additional endpoint to handle avatar removal specifically
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const user = await verifyAuthToken(req);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Set avatar to null (will use default)
    const updatedUser = await User.findByIdAndUpdate(
      user._id, 
      { avatar: null },
      { new: true }
    ).select('name email phone avatar');

    const defaultAvatar = '/Images/avatar.jpeg';

    return NextResponse.json({ 
      success: true,
      user: {
        name: updatedUser?.name,
        email: updatedUser?.email,
        phone: updatedUser?.phone,
        avatar: defaultAvatar
      },
      message: 'Avatar removed successfully'
    });
  } catch (error: any) {
    console.error('Avatar removal error:', error);
    return NextResponse.json({ 
      error: 'Failed to remove avatar' 
    }, { status: 500 });
  }
}