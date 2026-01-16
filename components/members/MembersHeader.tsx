'use client';

import { Users, Search, UserCircle } from 'lucide-react';

interface Props {
  onSearch: (value: string) => void;
  onRefresh: () => void;
  currentUserName?: string; 
}

export default function MembersHeader({ onSearch, currentUserName }: Props) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 mt-0 md:mt-5 lg:mt-0">
      {/* 1. Main Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="p-2 md:p-3 bg-primary/10 rounded-lg md:rounded-xl">
            {/* FIXED: Merged className and updated size */}
            <Users size={20} className="text-primary md:size-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Member Management</h1>
            <p className="text-gray-500 text-xs md:text-sm">
              Manage your ROSCA groups and members
            </p>
          </div>
        </div>
      </div>

      {/* 2. Current User Name Display (New Section Between Header & Search) */}
      {currentUserName && (
        <div className="flex items-center gap-1 md:gap-2 py-1">
            {/* FIXED: Updated canonical class size */}
            <UserCircle size={16} className="text-gray-400 md:size-5" />
            <span className="text-base md:text-lg font-semibold text-primary">
                {currentUserName}
            </span>
        </div>
      )}
      
      {/* 3. Search Bar */}
      <div className="relative">
        {/* FIXED: Merged className and updated size */}
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:size-5" />
        <input
          type="search"
          placeholder="Search by name, email, or phone..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm text-sm md:text-base"
        />
      </div>
    </div>
  );
}