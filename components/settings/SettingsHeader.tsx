'use client';

import { Settings, User, Shield, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SettingsHeader() {
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Get current date in a readable format
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Get time in 12-hour format
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
    
    setLastUpdated(`${formattedDate} at ${formattedTime}`);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Settings className="text-primary" size={28} />
        </div>
        
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">Settings</h1>
          <p className="text-text/60 text-sm md:text-base">
            Manage your account preferences, security, and profile information
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 text-sm">
        <div className="flex items-center space-x-1 text-success bg-success/10 px-3 py-1.5 rounded-full">
          <Shield size={14} />
          <span className="font-medium">Verified</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-1 text-text/60 bg-gray-100 px-3 py-1.5 rounded-full">
          <Calendar size={14} />
          <span className="text-xs">Updated: Today</span>
        </div>
        
        <div className="md:hidden flex items-center space-x-1 text-text/60">
          <Calendar size={12} />
          <span className="text-xs">Today</span>
        </div>
      </div>
    </div>
  );
}