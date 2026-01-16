'use client';

import GroupHeader from '@/components/groups/GroupHeader';
import GroupTabs from '@/components/groups/GroupTabs';
import GroupOverview from '@/components/groups/GroupOverview';
import MemberList from '@/components/groups/MemberList';
import PaymentTracker from '@/components/groups/PaymentTracker';
import CycleManagement from '@/components/groups/CycleManagement';
import GroupSettings from '@/components/groups/GroupSettings';
import PlaceholderTab from '@/components/groups/PlaceholderTab';
import { BarChart3, Bell, History, Loader2, Lock } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// ✅ Import custom auth hook
import { useAuth } from '@/components/providers/AuthProvider'; 

interface GroupData {
  group: any;
  members: any[];
  currentCycle: any;
  payments: any[];
  stats: any;
}

export default function GroupDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  // ✅ Use custom auth hook
  const { user } = useAuth(); 
  
  const groupId = params.id as string;
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/groups/${groupId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Group not found');
          return;
        }
        
        if (response.status === 401) {
          setError('Please login to view this group');
          router.push('/login');
          return;
        }
        
        if (response.status === 403) {
          setError('You are not a member of this group');
          return;
        }
        
        const errorText = await response.text();
        setError(`Server error: ${response.status}`);
        console.error('Error details:', errorText);
        return;
      }

      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.group) {
        setError('Group data not found in response');
        return;
      }

      setData(result);
    } catch (err: any) {
      console.error('Network error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 size={32} className="text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={fetchGroupData}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 font-medium"
              >
                Try Again
              </button>
              
              <button
                onClick={() => router.push('/groups')}
                className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                Back to Groups
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 size={32} className="text-gray-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Data</h1>
            <p className="text-gray-600 mb-6">No group data available.</p>
            
            <button
              onClick={() => router.push('/groups')}
              className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              Back to Groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { group, members = [], currentCycle = null, payments = [] } = data;

  // Format group data for components
  const formattedGroup = {
    _id: group._id.toString(),
    name: group.name,
    description: group.description || '',
    contributionAmount: group.contributionAmount,
    frequency: group.frequency,
    duration: group.duration,
    currentCycle: group.currentCycle || 0,
    totalAmount: group.totalAmount || 0,
    status: group.status || 'active',
    startDate: group.startDate,
    endDate: group.endDate,
    inviteCode: group.inviteCode,
    leader: {
      id: group.leaderId?._id?.toString() || group.leaderId?.toString() || '',
      name: group.leaderId?.name || 'You',
      email: group.leaderId?.email || '',
      avatar: group.leaderId?.avatar || '',
    },
    subLeaders: group.subLeaderIds?.map((subLeader: any) => ({
      id: subLeader._id?.toString() || subLeader.toString(),
      name: subLeader.name || 'Unknown',
      email: subLeader.email || '',
      avatar: subLeader.avatar || '',
    })) || [],
    bankAccount: group.bankAccount,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    // ✅ Use Duration as Fallback for Member Count
    memberCount: group.memberCount || members.length || group.duration || 0,
  };

  // Format members data
  const formattedMembers = members.map((member: any) => ({
    id: member._id.toString(),
    userId: member.userId?._id?.toString() || member.userId?.toString() || '',
    name: member.userId?.name || member.pendingMemberDetails?.name || 'Unknown Member',
    email: member.userId?.email || member.pendingMemberDetails?.email || '',
    phone: member.userId?.phone || member.pendingMemberDetails?.phone || '',
    avatar: member.userId?.avatar || '',
    role: member.role || 'member',
    memberNumber: member.memberNumber || 0,
    status: member.status || 'pending',
    hasReceived: member.hasReceived || false,
    receivedCycle: member.receivedCycle || 0,
    totalPaid: member.totalPaid || 0,
    totalReceived: member.totalReceived || 0,
    nextPaymentDue: member.nextPaymentDue,
    paymentStatus: member.paymentStatus || 'pending',
  }));

  // Format payments data
  const formattedPayments = payments.map((payment: any) => ({
    id: payment._id.toString(),
    memberName: payment.userId?.name || 'Unknown',
    memberId: payment.userId?._id?.toString() || payment.userId?.toString() || '',
    cycleNumber: payment.cycleNumber || currentCycle?.cycleNumber || 0,
    amount: payment.amount || 0,
    dueDate: payment.dueDate || currentCycle?.dueDate,
    paidDate: payment.paidAt,
    status: payment.status || 'pending',
    paymentMethod: payment.paymentMethod,
    verifiedBy: payment.verifiedBy,
    notes: payment.notes,
  }));

  // ==========================================
  // 🔐 ROLE BASED ACCESS CONTROL (RBAC) LOGIC
  // ==========================================
  
  // Safe ID extraction
  const currentUserId = user?.id || (user as any)?._id;

  // ✅ CRITICAL FIX: Robust User Identification (ID OR Email)
  // This ensures we find the user's role even if IDs formats mismatch
  const currentUserMemberRecord = formattedMembers.find(m => {
    const idMatch = m.userId === currentUserId;
    const emailMatch = user?.email && m.email?.toLowerCase() === user.email.toLowerCase();
    return idMatch || emailMatch;
  });
  
  // 1. Check Permissions based on Member Record
  // Leader: Either they own the group OR they are marked as leader in members list
  const isLeader = formattedGroup.leader.id === currentUserId || currentUserMemberRecord?.role === 'leader';
  
  // Sub-leader: Marked as sub_leader in members list
  const isSubLeader = currentUserMemberRecord?.role === 'sub_leader';

  // 2. Define Capabilities
  const permissions = {
    canManageMoney: isLeader,                  // Leader ONLY
    canManageMembers: isLeader || isSubLeader, // Leader & Sub-Leader
    canEditSettings: isLeader,                 // Leader ONLY
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <GroupOverview group={formattedGroup} />;
      
      case 'members':
        return (
          <MemberList 
            groupId={groupId}
            members={formattedMembers}
            currentCycle={currentCycle}
            // Passing updated permission logic
            canManage={permissions.canManageMembers} 
          />
        );
      
      case 'payments':
        return (
          <PaymentTracker 
            groupId={groupId}
            canManage={permissions.canManageMoney} 
          />
        );
      
      case 'cycles':
        return (
          <CycleManagement 
            groupId={groupId} 
            currentCycle={currentCycle} 
            canManage={permissions.canManageMoney}
          />
        );
        
      case 'analytics':
        return (
          <PlaceholderTab
            title="Analytics"
            description="Detailed analytics and insights for your group"
            icon={<BarChart3 size={32} className="text-primary" />}
          />
        );
      
      case 'notifications':
        return (
          <PlaceholderTab
            title="Notifications"
            description="Manage group notifications and alerts"
            icon={<Bell size={32} className="text-primary" />}
          />
        );
      
      case 'activity':
        return (
          <PlaceholderTab
            title="Activity History"
            description="Complete audit log of all group activities"
            icon={<History size={32} className="text-primary" />}
          />
        );
      
      case 'settings':
        // HIDE SETTINGS CONTENT IF NOT LEADER
        if (!permissions.canEditSettings) {
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
              <p className="text-gray-500 text-center max-w-sm mt-2">
                Only the Group Leader can access these settings.
              </p>
            </div>
          );
        }
        return <GroupSettings group={formattedGroup} />;
      
      default:
        return <GroupOverview group={formattedGroup} />;
    }
  };

  return (
    <div className="space-y-6">
      <GroupHeader group={formattedGroup} />
      
      {/* Passing isLeader for tab visibility */}
      <GroupTabs 
        activeTab={activeTab} 
        groupId={groupId} 
        isLeader={permissions.canEditSettings}
      />
      
      {renderTabContent()}
    </div>
  );
}