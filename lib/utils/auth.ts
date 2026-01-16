import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import connectDB from '@/lib/db/connect';
import { User } from '@/lib/db/models';

export async function getServerSession() {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = (await cookieStore).get('auth_token')?.value;
    
    if (!token) {
      return null;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return null;
    }
    
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

// NEW: Function to get authenticated user for API routes
export async function getAuthenticatedUser() {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = (await cookieStore).get('auth_token')?.value;
    
    if (!token) {
      return null;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// NEW: Function to verify JWT token from headers (for API requests)
export async function verifyAuthToken(request: Request) {
  try {
    // First try to get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookies
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.split('=').map(c => c.trim());
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['auth_token'] || '';
      }
    }
    
    if (!token) {
      return null;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    await connectDB();
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}