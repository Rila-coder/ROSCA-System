'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      setLoading(true);
      
      const res = await fetch('/api/auth/me', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // ✅ FIX: Check if we actually got a user back (api now returns 200 with null user for guests)
        if (data.user) {
          setUser(data.user);
          
          // Sync LocalStorage if missing (Google Login Case)
          if (!localStorage.getItem('token')) {
             localStorage.setItem('token', 'session-active');
          }
        } else {
          // Response was OK (200), but user is null -> Guest Mode
          setUser(null);
          localStorage.removeItem('token');
        }
      } else {
        // Fallback for real errors
        setUser(null);
        localStorage.removeItem('token'); 
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      // Small delay to ensure state updates propagate before ProtectedRoute checks
      setTimeout(() => {
        setLoading(false);
      }, 100);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('token');
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook
export function useAuth() {
  return useContext(AuthContext);
}