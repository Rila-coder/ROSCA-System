"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const comingSoonPath = "/public-invite/relocat";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleFeatures = () => setIsFeaturesOpen(!isFeaturesOpen);

  // Memoized check function to prevent unnecessary re-renders
  const checkLoginStatus = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("token");
        const nowLoggedIn = !!token;
        
        if (isLoggedIn !== nowLoggedIn) {
          setIsLoggedIn(nowLoggedIn);
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        setIsLoggedIn(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Check on mount and pathname change
    checkLoginStatus();
    
    // 1. Listen for standard storage events (works across tabs)
    window.addEventListener('storage', checkLoginStatus);
    
    // 2. Listen for custom 'auth-change' event (works in same tab)
    window.addEventListener('auth-change', checkLoginStatus);
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('auth-change', checkLoginStatus);
    };
  }, [pathname, checkLoginStatus]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Clear ALL storage logic
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.clear();
        
        // Clear standard cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }

      setIsLoggedIn(false);
      setIsMenuOpen(false);
      
      // Notify other parts of the app that auth changed
      window.dispatchEvent(new Event('auth-change'));
      
      router.push("/");
      router.refresh();
      
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear();
      setIsLoggedIn(false);
      router.push("/");
    }
  };

  // Check login status when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkLoginStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkLoginStatus]);

  /* --- RENDER SECTION (No design changes below) --- */
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden p-0">
              <Image
                src="/Images/rosca_logo.png"
                alt="ROSCA Logo"
                width={60}
                height={60}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold text-primary sm:block">
              ROSCA
            </span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            <Link href="/" className="text-text hover:text-primary transition-colors font-medium">Home</Link>
            <Link href={`${comingSoonPath}?title=How It Works`} className="text-text hover:text-primary transition-colors font-medium">How It Works</Link>

            <div className="relative group">
              <button className="flex items-center space-x-1 text-text hover:text-primary transition-colors font-medium">
                <span>Features</span>
                <ChevronDown size={16} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  <Link href="../../groups/" className="block px-4 py-2 text-text hover:bg-primary/5 hover:text-primary">Group Management</Link>
                  <Link href="../../payments/" className="block px-4 py-2 text-text hover:bg-primary/5 hover:text-primary">Payment Tracking</Link>
                  <Link href="../../members/" className="block px-4 py-2 text-text hover:bg-primary/5 hover:text-primary">Members Management</Link>
                  <Link href="../../reports/" className="block px-4 py-2 text-text hover:bg-primary/5 hover:text-primary">Analytics</Link>
                </div>
              </div>
            </div>

            {isLoggedIn && (
              <Link href="/dashboard" className="text-text hover:text-primary transition-colors font-medium">Dashboard</Link>
            )}
            
            <Link href={`${comingSoonPath}?title=Contact`} className="text-text hover:text-primary transition-colors font-medium">Contact</Link>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow">Get Started</Link>
                <button onClick={handleLogout} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center space-x-2">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors font-medium">Login</Link>
                <Link href="/dashboard" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm hover:shadow">Get Started</Link>
              </>
            )}
          </div>

          <button onClick={toggleMenu} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="space-y-3">
              <Link href="/" className="block px-4 py-3 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Home</Link>
              <Link href={`${comingSoonPath}?title=How It Works`} className="block px-4 py-3 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>How It Works</Link>
              <div className="space-y-2">
                <button onClick={toggleFeatures} className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-primary/5 transition-colors font-medium">
                  <span>Features</span>
                  <ChevronDown size={18} className={`transition-transform ${isFeaturesOpen ? "rotate-180" : ""}`} />
                </button>
                {isFeaturesOpen && (
                  <div className="ml-6 space-y-2 border-l border-gray-200 pl-4">
                    <Link href="../../groups" className="block px-4 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Group Management</Link>
                    <Link href="../../payments" className="block px-4 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Payment Tracking</Link>
                    <Link href="../../members" className="block px-4 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Members Management</Link>
                    <Link href="../../reports" className="block px-4 py-2 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Analytics</Link>
                  </div>
                )}
              </div>
              {isLoggedIn && (
                <Link href="/dashboard" className="block px-4 py-3 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              )}
              <Link href={`${comingSoonPath}?title=Contact`} className="block px-4 py-3 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              <div className="pt-4 space-y-3">
                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard" className="block px-4 py-3 text-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full px-4 py-3 text-center text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center space-x-2">
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block px-4 py-3 text-center text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Login</Link>
                    <Link href="/dashboard" className="block px-4 py-3 text-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}