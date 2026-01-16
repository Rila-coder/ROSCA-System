"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
// ✅ Import the hook to sync with AuthProvider
import { useAuth } from "@/components/providers/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // ✅ Get the REAL auth state (handles Google Cookie check)
  const { user, loading: authLoading } = useAuth();
  
  const publicPaths = ['/login', '/register', '/forgot-password', '/'];
  const isPublicPage = publicPaths.includes(pathname);

  // Initialize loading state
  const [showLoader, setShowLoader] = useState(!isPublicPage);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Verifying your credentials...");

  // If public page, render immediately
  if (isPublicPage) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (isPublicPage) return;

    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;

    // Start progress bar - slower to match 2s
    progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + 2; // Slower increment
      });
    }, 40); // 40ms * 50 steps ~= 2s

    // Cycling messages
    messageInterval = setInterval(() => {
      if (progress < 30) setMessage("Verifying your credentials...");
      else if (progress < 60) setMessage("Connecting to ROSCA vault...");
      else if (progress < 90) setMessage("Preparing your dashboard...");
      else setMessage("Almost there...");
    }, 500); // Slower message updates

    // ✅ THE LOGIC CHECK
    const checkAuth = async () => {
      // 1. Wait for AuthProvider to finish checking cookies/localStorage
      if (authLoading) return;

      // 2. FORCE MINIMUM DELAY: Wait at least 2 seconds for the loader
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Check if we have a user
      if (user) {
        clearInterval(messageInterval);
        clearInterval(progressInterval);
        setProgress(100);
        setMessage("Access granted!");
        
        await new Promise((resolve) => setTimeout(resolve, 500)); // Visual pause at 100%
        setShowLoader(false);
      } else {
        // 4. No User found after check -> Redirect
        clearInterval(messageInterval);
        clearInterval(progressInterval);
        setProgress(100);
        setMessage("Redirecting to login...");
        
        await new Promise((resolve) => setTimeout(resolve, 800)); // Longer pause before redirect
        router.replace("/login");
      }
    };

    checkAuth();

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [pathname, isPublicPage, authLoading, user, router]);

  // Only show loader if we are on a protected page AND generally loading
  if (showLoader) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111827]">
        <div className="w-64 text-center">
          {/* Logo with Circular Loading */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-2 border-transparent border-t-[#14B8A6] border-r-[#14B8A6]/50 rounded-full animate-spin"></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 p-1">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded-full"
                  priority
                />
              </div>
            </div>
          </div>
          
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-[#14B8A6] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">{progress}%</p>
            <p className="text-gray-400 text-sm text-right">{message}</p>
          </div>
        </div>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}