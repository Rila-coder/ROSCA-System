"use client";

import { useState, useEffect } from "react";

export default function LoadingWrapper({ 
  children, 
  pageTitle = "Loading" 
}: { 
  children: React.ReactNode, 
  pageTitle?: string 
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-text mb-2">{pageTitle}</h2>
          <p className="text-text/60">Preparing the view...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}