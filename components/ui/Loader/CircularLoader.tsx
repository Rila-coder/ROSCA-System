"use client";

import { useState, useEffect, useRef } from "react";

interface CircularLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export default function CircularLoader({
  onComplete,
  duration = 2000,
}: CircularLoaderProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset progress whenever component mounts
    setProgress(0);

    const intervalTime = 30;
    const totalSteps = duration / intervalTime;
    const incrementPerStep = 100 / totalSteps;

    let currentProgress = 0;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      currentProgress += incrementPerStep;

      const roundedProgress = Math.min(Math.round(currentProgress), 100);
      setProgress(roundedProgress);

      if (roundedProgress >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Small delay for smooth transition
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 200);
      }
    }, intervalTime);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* ROSCA Logo/Text */}
      <div className="relative mb-8 text-center">
        <div className="text-5xl font-bold text-primary tracking-wider">
          ROSCA
        </div>
        <div className="text-sm text-text/60 mt-2">
          Rotating Savings & Credit Association
        </div>
      </div>

      {/* Animated Circle */}
      <div className="relative w-32 h-32">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 border-4 border-transparent rounded-full 
          border-t-primary border-r-secondary animate-spin-slow"></div>

        {/* Inner pulsing ring */}
        <div className="absolute inset-4 border-3 border-transparent rounded-full 
          border-b-accent border-l-success animate-pulse-slow"></div>

        {/* Center icon - Increased size for better visibility */}
        <div className="absolute inset-8 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* Circle representing the group */}
              <circle cx="12" cy="12" r="8" />
              
              {/* Dollar sign */}
              <path d="M12 8.5v7" />
              <path d="M14.5 7.5a2.5 2.5 0 0 1 0 5h-5a2.5 2.5 0 0 1 0-5" strokeLinecap="round" />
              
              {/* Rotation arrows */}
              <path d="M6 10l2 2-2 2" />
              <path d="M18 14l-2-2 2-2" />
            </svg>
          </div>
        </div>

        {/* Floating dots */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-accent animate-pulse"
            style={{
              top: `${50 - 40 * Math.sin((i * Math.PI) / 4)}%`,
              left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Loading Progress */}
      <div className="mt-8 text-center">
        <div className="text-text font-medium mb-2 w-48 mx-auto">
          Loading System... {progress}%
        </div>

        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto">
          <div
            className="h-full bg-secondary transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-2 text-xs text-text/40 italic">
          Preparing your savings experience...
        </div>
      </div>
    </div>
  );
}