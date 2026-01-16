'use client';

import { useState, useEffect } from 'react';
import NotificationsHeader from '@/components/notifications/NotificationsHeader';
import NotificationsList from '@/components/notifications/NotificationsList';
import LoadingWrapper from '@/components/layout/LoadingWrapper';
import toast from 'react-hot-toast';

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      
      if (res.ok) {
        // Check if data has notifications array
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.counts?.unread || 0);
        } else if (Array.isArray(data)) {
          // Backward compatibility: if API returns array directly
          setNotifications(data);
          const unread = data.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        } else {
          console.error('Unexpected response format:', data);
          setNotifications([]);
          setUnreadCount(0);
        }
      } else {
        console.error('Failed to fetch notifications:', data);
        toast.error('Failed to load notifications');
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action: string, id?: string) => {
    try {
      // Optimistic Update
      if (action === 'mark_read') {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success('Marked as read');
      } else if (action === 'mark_all_read') {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All marked as read');
      } else if (action === 'delete') {
        const notificationToDelete = notifications.find(n => n._id === id);
        if (notificationToDelete && !notificationToDelete.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n._id !== id));
        toast.success('Notification removed');
      } else if (action === 'delete_all') {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('All cleared');
      }

      await fetch('/api/notifications', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action, id })
      });
      
      // Refresh data to ensure sync
      fetchData();
    } catch (e) {
      toast.error('Action failed');
      // Revert optimistic update
      fetchData();
    }
  };

  return (
    <LoadingWrapper pageTitle="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        <NotificationsHeader 
          unreadCount={unreadCount} 
          onMarkAllRead={() => handleAction('mark_all_read')}
          onClearAll={() => handleAction('delete_all')}
        />
        
        <NotificationsList 
          notifications={notifications} 
          onMarkRead={(id) => handleAction('mark_read', id)}
          onDelete={(id) => handleAction('delete', id)}
        />
      </div>
    </LoadingWrapper>
  );
}