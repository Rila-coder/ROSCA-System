import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { verifyAuthToken } from '@/lib/utils/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const sessionUser = await verifyAuthToken(req);
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { newPassword, confirmPassword } = await req.json();
    
    // Validate new passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ 
        error: 'New password and confirm password do not match' 
      }, { status: 400 });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Get full user
    const user = await User.findById(sessionUser._id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}