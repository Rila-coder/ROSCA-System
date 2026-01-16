'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Info, Clock, Users, UserCircle, DollarSign, Building, RefreshCw } from 'lucide-react';

interface Activity {
  _id: string;
  groupId: {
    _id: string;
    name: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  type: string;
  description: string;
  metadata: any;
  createdAt: string;
}

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/activities/recent');
      
      if (!response.ok) {
        // Check if endpoint doesn't exist
        if (response.status === 404) {
          throw new Error('Activity feature not available yet');
        }
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment_made':
      case 'payment_verified':
      case 'money_distributed':
        return <DollarSign size={16} className="text-green-500" />;
      case 'member_added':
      case 'member_removed':
      case 'role_changed':
        return <UserCircle size={16} className="text-blue-500" />;
      case 'group_created':
      case 'group_updated':
      case 'settings_updated':
        return <Building size={16} className="text-purple-500" />;
      default:
        return <Info size={16} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-text">Loading activities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-text mb-2">Unable to load activities</h3>
          <p className="text-text/60 mb-4">{error}</p>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center mx-auto"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-text mb-2">No activities yet</h3>
          <p className="text-text/60">
            Activities will appear here when you or other group members perform actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="divide-y">
        {activities.map((activity) => (
          <div key={activity._id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">
                      {activity.description}
                    </p>
                    
                    {activity.groupId?.name && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-text/60">
                          in {activity.groupId.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    <div className="flex items-center text-xs text-text/40">
                      <Clock size={12} className="mr-1" />
                      <span>{formatDate(activity.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}