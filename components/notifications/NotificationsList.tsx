'use client';

import { 
  Bell, CheckCircle, AlertTriangle, 
  DollarSign, Info, X, Users, Crown, UserPlus, UserMinus
} from 'lucide-react';

interface Props {
  notifications: any[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void; // Optional action handler
}

// Simple time formatter
function timeAgo(dateString: string | Date) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "Just now";
}

export default function NotificationsList({ notifications, onMarkRead, onDelete, onAction }: Props) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign size={20} />;
      case 'alert': return <AlertTriangle size={20} />;
      case 'group': return <Users size={20} />;
      case 'system': return <Crown size={20} />;
      case 'reminder': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-green-100 text-green-600';
      case 'alert': return 'bg-red-100 text-red-600';
      case 'group': return 'bg-blue-100 text-blue-600';
      case 'system': return 'bg-purple-100 text-purple-600';
      case 'reminder': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Navigate to group if notification has groupId
    if (notification.data?.groupId && onAction) {
      onAction('navigate_to_group', notification.data.groupId);
    }
    
    // Mark as read when clicked
    if (!notification.isRead) {
      onMarkRead(notification._id);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <Bell size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
        <p className="text-gray-500">No new notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => (
        <div 
          key={n._id} 
          className={`relative p-4 rounded-xl border transition-all hover:shadow-md flex gap-4 cursor-pointer ${
            n.isRead ? 'bg-white border-gray-200' : 'bg-blue-50/20 border-blue-200'
          }`}
          onClick={() => handleNotificationClick(n)}
        >
          <div className={`p-3 rounded-full h-fit ${getStyles(n.type)}`}>
            {getIcon(n.type)}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className={`font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                  {n.title}
                </h4>
                {n.priority === 'high' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Important
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                {timeAgo(n.createdAt || n.sentAt)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">{n.message}</p>
            
            {/* Show notification data if available */}
            {n.data && (
              <div className="mt-2 text-xs text-gray-500">
                {n.data.cycleNumber && `Cycle #${n.data.cycleNumber}`}
                {n.data.amount && ` • Amount: ₹${n.data.amount}`}
              </div>
            )}
            
            <div className="flex gap-4 mt-3">
              {!n.isRead && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(n._id);
                  }}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCircle size={12} /> Mark Read
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(n._id);
                }}
                className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1"
              >
                <X size={12} /> Remove
              </button>
            </div>
          </div>

          {!n.isRead && (
            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </div>
      ))}
    </div>
  );
}