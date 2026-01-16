// app/api/users/check/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { exists: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email (case insensitive)
    // We select 'avatar' so we can show the Leader's profile picture in the UI
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('_id name email phone avatar');

    return NextResponse.json({ 
      exists: !!user,
      user: user || null
    });

  } catch (error: any) {
    console.error('❌ Error checking user:', error);
    return NextResponse.json({ 
      exists: false,
      error: error.message 
    }, { status: 500 });
  }
}