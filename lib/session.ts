// app/api/test-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    console.log('Test Auth - Session found:', !!session);
    console.log('Test Auth - User email:', session?.user?.email);
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session or user found',
        hasSession: !!session,
        hasUser: !!session?.user
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: session.user.id || 'no-id',
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
        avatar: session.user.avatar,
        role: session.user.role,
      }
    });
  } catch (error: any) {
    console.error('Test Auth Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}