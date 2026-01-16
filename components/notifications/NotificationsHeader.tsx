'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';

interface Props {
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export default function NotificationsHeader({ unreadCount, onMarkAllRead, onClearAll }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mt-0 md:mt-5 lg:mt-0">
      
      <div className="flex items-center gap-4">
        <div className="relative p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onMarkAllRead}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <CheckCheck size={16} /> Mark all read
        </button>
        <button 
          onClick={() => {
            if(confirm('Clear all notifications? This cannot be undone.')) onClearAll();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
        >
          <Trash2 size={16} /> Clear All
        </button>
      </div>

    </div>
  );
}