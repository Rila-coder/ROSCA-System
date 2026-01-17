'use client';

import { useState, useEffect } from 'react';
import {
  Users, Calendar, DollarSign, Clock,
  MoreVertical, Share2, Edit,
  Shield, Crown, Loader2, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

interface GroupHeaderProps {
  group: {
    _id: string;
    name: string;
    description: string;
    contributionAmount: number;
    frequency: string;
    duration: number;
    currentCycle: number;
    totalAmount: number;
    status: string;
    startDate: string;
    endDate: string;
    inviteCode: string;
    leader?: { id: string; name: string; email?: string; avatar?: string };
    subLeaders?: Array<{ id: string; name: string; email?: string; avatar?: string }>;
    memberCount?: number;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    };
    createdAt: string;
    updatedAt: string;
    targetMemberCount?: number;
  };
}

export default function GroupHeader({ group }: GroupHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // State to hold the "Real" names from the Member Snapshot
  const [leaderDisplayName, setLeaderDisplayName] = useState(group.leader?.name || 'Unknown');
  const [subLeaderDisplayNames, setSubLeaderDisplayNames] = useState<any[]>(group.subLeaders || []);

  // ✅ 1. Determine if group is completed (Database status OR calculated logic)
  const isGroupCompleted = 
    group.status === 'completed' || 
    (group.duration > 0 && group.currentCycle === null) || // Backend sets currentCycle to null on completion
    (group.duration > 0 && group.currentCycle > group.duration);

  // Fetch Member Data to get Correct Names (Snapshot Names)
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!group._id) return;
      try {
        const response = await fetch(`/api/groups/${group._id}/members?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          const members = data.members || [];

          // Update Leader Name
          if (group.leader?.id) {
            const leaderMember = members.find((m: any) =>
               (m.userId?._id || m.userId) === group.leader?.id
            );
            if (leaderMember) {
               setLeaderDisplayName(leaderMember.name || leaderMember.userId?.name || group.leader.name);
            }
          }

          // Update Sub-leader Names
          if (group.subLeaders && group.subLeaders.length > 0) {
             const updatedSubs = group.subLeaders.map(sub => {
                const subMember = members.find((m: any) =>
                   (m.userId?._id || m.userId) === sub.id
                );
                return {
                   ...sub,
                   name: subMember ? (subMember.name || subMember.userId?.name || sub.name) : sub.name
                };
             });
             setSubLeaderDisplayNames(updatedSubs);
          }
        }
      } catch (error) {
        console.error("Failed to fetch member details for header", error);
      }
    };

    fetchMemberDetails();
  }, [group]);

  // Safety check
  if (!group) return <div className="card h-48 animate-pulse bg-gray-100" />;

  const isLeader = user && group.leader && (user.id === group.leader.id || (user as any)._id === group.leader.id);

  // ✅ 2. Progress Calculation
  const calculateProgress = () => {
    if (isGroupCompleted) return 100; // Force 100% if completed
    if (!group.duration || group.duration === 0) return 0;
    
    // Default to 1 if null, prevents division errors
    const current = group.currentCycle || 1; 
    return Math.round(((current - 1) / group.duration) * 100);
  };

  // ✅ 3. Remaining Cycles Logic
  const cyclesRemaining = isGroupCompleted ? 0 : Math.max(0, (group.duration || 0) - (group.currentCycle || 0));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const handleEditGroup = () => {
    setShowDropdown(false);
    router.push(`/groups/${group._id}?tab=settings`);
  };

  const handleShare = () => {
    setShowDropdown(false);
    router.push(`/groups/${group._id}?tab=settings`);
  };

  const getDaysRemaining = () => {
    if (isGroupCompleted) return 0;
    if (!group.endDate) return 0;
    const endDate = new Date(group.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="card mt-0 md:mt-5 lg:mt-0 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        
        {/* Left side - Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text truncate max-w-full">
                  {group.name || 'Untitled Group'}
                </h1>
                
                {/* ✅ 4. Updated Status Badge */}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1 ${
                  isGroupCompleted
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : group.status === 'active'
                    ? 'bg-success/10 text-success'
                    : group.status === 'forming'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isGroupCompleted ? (
                    <>
                      <CheckCircle size={12} /> Completed
                    </>
                  ) : (
                    group.status ? group.status.charAt(0).toUpperCase() + group.status.slice(1) : 'Unknown'
                  )}
                </span>
              </div>

              <p className="text-text/60 text-sm mb-4 break-words line-clamp-2 hover:line-clamp-none transition-all">
                {group.description || 'No description'}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-6 text-sm">
                <div className="flex items-center gap-2 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                  <Users size={16} className="text-text/40 flex-shrink-0" />
                  <span className="truncate font-medium text-text/80">{group.memberCount || 0} members</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                  <DollarSign size={16} className="text-text/40 flex-shrink-0" />
                  <span className="truncate font-medium text-text/80">
                    {formatCurrency(group.contributionAmount)} <span className="text-xs text-text/50">{group.frequency}</span>
                  </span>
                </div>
                
                {/* ✅ 5. Cycle Info Updates based on completion */}
                <div className="flex items-center gap-2 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                  <Calendar size={16} className="text-text/40 flex-shrink-0" />
                  <span className={`truncate font-medium ${isGroupCompleted ? 'text-green-600' : 'text-text/80'}`}>
                    {isGroupCompleted 
                        ? `All ${group.duration || 0} Cycles Completed`
                        : group.currentCycle > 0
                        ? `Cycle ${group.currentCycle}/${group.duration || 0}`
                        : `Not Started (${group.duration || 0} Cycles)`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                  <Clock size={16} className="text-text/40 flex-shrink-0" />
                  <span className="truncate font-medium text-text/80">Ends {formatDate(group.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Actions Dropdown - Hidden if completed or user not leader */}
            {isLeader && !isGroupCompleted && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <MoreVertical size={20} className="text-text/60" />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button onClick={handleEditGroup} className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-text/80">
                        <Edit size={16} /> <span>Edit Group</span>
                      </button>
                      <button onClick={handleShare} className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-text/80">
                        <Share2 size={16} /> <span>Share Group</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ✅ 6. Progress Bar with Dynamic Color */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-text/70">
                 {isGroupCompleted ? "Group Successfully Completed" : "Group Progress"}
              </span>
              <span className={`font-bold ${isGroupCompleted ? 'text-green-600' : 'text-primary'}`}>
                {calculateProgress()}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                // If completed -> GREEN, Else -> BLUE (Primary)
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isGroupCompleted ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between text-xs text-text/50 mt-1.5 gap-1">
              <span>Started: {formatDate(group.startDate)}</span>
              <span className={`font-medium ${isGroupCompleted ? 'text-green-600' : 'text-text/70'}`}>
                {isGroupCompleted ? "Successfully Ended" : `${getDaysRemaining()} days remaining`}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Stats & Leadership */}
        <div className="w-full lg:w-72 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {/* Total Pool Card */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 sm:p-5 flex flex-col justify-center">
            <div className="text-sm text-text/60 mb-1 font-medium">Total Pool Amount</div>
            <div className="text-xl sm:text-2xl font-bold text-primary truncate">
              {formatCurrency(group.totalAmount)}
            </div>
            <div className="text-xs text-text/50 mt-1">
              {isGroupCompleted ? "All cycles completed" : `${cyclesRemaining} cycles remaining`}
            </div>
          </div>

          {/* Leadership Card */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-text/40">Leadership</div>
              <Shield size={14} className="text-primary/60" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-accent/10 p-1 rounded-full shrink-0">
                    <Crown size={12} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium text-text truncate max-w-[120px] sm:max-w-[140px]">
                    {leaderDisplayName}
                  </span>
                </div>
                <span className="text-xs text-text/40 shrink-0">Leader</span>
              </div>

              {subLeaderDisplayNames.map((subLeader: any) => (
                <div key={subLeader.id} className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gray-500">S</span>
                    </div>
                    <span className="text-sm text-text/70 truncate max-w-[120px] sm:max-w-[140px]">
                      {subLeader.name}
                    </span>
                  </div>
                  <span className="text-xs text-text/40 shrink-0">Sub</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}