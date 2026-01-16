import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import { User } from '@/lib/db/models/User';
import { generateToken } from '@/lib/utils/jwt';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', req.url));
    }

    // 1. Exchange code for Google Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google Token Error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url));
    }

    // 2. Get User Profile from Google
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );
    
    const googleUser = await userResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    // 3. Database Logic
    await connectDB();

    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.picture,
        provider: 'google',
        isVerified: true, // Google emails are verified
      });
    } else {
      // Update existing user avatar if missing
      if (!user.avatar) {
        user.avatar = googleUser.picture;
        await user.save();
      }
    }

    // 4. Generate JWT Token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 5. Create Response & Set Cookie
    const response = NextResponse.redirect(new URL('/dashboard', req.url));

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // ✅ FIX: Changed from 'strict' to 'lax' to allow redirect
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Google Callback Error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', req.url));
  }
}