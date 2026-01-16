import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Logout successful',
    });

    // Clear auth cookie
    response.cookies.delete('auth_token');
    
    // Also clear any other auth-related cookies
    response.cookies.delete('refresh_token');
    response.cookies.delete('user_data');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}