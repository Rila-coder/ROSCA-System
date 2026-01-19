'use client';

import Link from 'next/link';
import { 
  Users, 
  ArrowRight, 
  Loader2, 
  RefreshCw, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Trophy, 
  DollarSign,
  AlertTriangle, // ✅ Imported for skipped warning
  XCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function YourGroups({ groups: initialGroups }: { groups: any[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [groupProgressData, setGroupProgressData] = useState<Record<string, {
    progress: number;
    completedCycles: number;
    skippedCycles: number; // ✅ Track skipped cycles
    nextDraw: string;
    isLoading: boolean;
  }>>({});

  useEffect(() => {
    // Load real-time progress data
    loadRealTimeProgress(initialGroups);
    
    // Listen for cycle updates
    const handleCycleUpdate = () => {
      console.log("Cycle update detected in YourGroups component");
      loadRealTimeProgress(initialGroups);
    };
    
    window.addEventListener('cycleUpdated', handleCycleUpdate);
    window.addEventListener('groupUpdated', handleCycleUpdate);
    
    return () => {
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
      window.removeEventListener('groupUpdated', handleCycleUpdate);
    };
  }, [initialGroups]);

  // Fetch cycle data for a specific group
  const fetchGroupCycleData = async (groupId: string) => {
    if (!groupId) return null;
    
    try {
      const response = await fetch(`/api/groups/${groupId}/cycles?t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.cycles || [];
      }
    } catch (error) {
      console.error(`Failed to fetch cycles for group ${groupId}:`, error);
    }
    return null;
  };

  // ✅ FIXED: Calculate real progress based on STRICT completion
  const calculateRealProgress = (group: any, cycles: any[] = []) => {
    const duration = group.duration || 1;
    let completedCount = 0;
    let skippedCount = 0;
    
    if (cycles.length > 0) {
      // Count specific statuses
      completedCount = cycles.filter((c: any) => 
        c.status === 'completed' || c.isCompleted === true
      ).length;
      skippedCount = cycles.filter((c: any) => 
        c.status === 'skipped' || c.isSkipped === true
      ).length;
    } else {
      // Fallback if API hasn't loaded yet
      if (group.status === 'completed') {
         // Default assumption, though accurate loading fixes this
         completedCount = duration; 
      } else {
         completedCount = group.completedCyclesCount || (group.currentCycle > 0 ? group.currentCycle - 1 : 0);
      }
    }
    
    // ✅ Progress is % of COMPLETED cycles only. Skipped does not add to progress bar.
    let progress = Math.round((completedCount / duration) * 100);
    
    // Ensure bounds
    progress = Math.min(100, Math.max(0, progress));
    
    return { progress, completedCycles: completedCount, skippedCycles: skippedCount };
  };

  // ✅ FIXED: Calculate next draw info with Skip Awareness
  const calculateNextDraw = (group: any, completedCycles: number, skippedCycles: number) => {
    const duration = group.duration || 1;
    const totalProcessed = completedCycles + skippedCycles;

    // Check if timeline is finished
    if (group.status === "completed" || totalProcessed >= duration) {
       if (skippedCycles > 0) {
          return "Action Needed"; // ⚠️ Warning if skipped
       }
       return "All Cycles Done"; // 🏆 Success if clean
    }
    
    if (group.status !== "active" || !group.startDate) {
      return "Not Started";
    }
    
    try {
      const startDate = new Date(group.startDate);
      const frequency = group.frequency || "monthly";
      const frequencyDays =
        frequency === "daily" ? 1 : 
        frequency === "weekly" ? 7 : 30;
      
      const nextCycleNumber = totalProcessed + 1;
      
      // Calculate next cycle date
      const daysToNextCycle = frequencyDays * nextCycleNumber;
      const nextDate = new Date(
        startDate.getTime() + daysToNextCycle * 24 * 60 * 60 * 1000
      );
      const daysLeft = Math.ceil(
        (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 7) {
        return `${daysLeft} days`;
      } else if (daysLeft > 3) {
        return `${daysLeft} days`;
      } else if (daysLeft > 0) {
        return `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
      } else if (daysLeft === 0) {
        return "Today";
      } else {
        return "Overdue";
      }
    } catch (e) {
      return "N/A";
    }
  };

  // Load real-time progress for all groups
  const loadRealTimeProgress = async (groupsList: any[]) => {
    const progressData: Record<string, any> = {};
    
    // Initialize with loading state
    groupsList.forEach(group => {
      progressData[group._id] = {
        progress: 0,
        completedCycles: 0,
        skippedCycles: 0,
        nextDraw: "Loading...",
        isLoading: true
      };
    });
    
    setGroupProgressData(progressData);
    
    // Fetch cycle data for each group in parallel
    const fetchPromises = groupsList.map(async (group) => {
      try {
        const cycles = await fetchGroupCycleData(group._id);
        const { progress, completedCycles, skippedCycles } = calculateRealProgress(group, cycles);
        const nextDraw = calculateNextDraw(group, completedCycles, skippedCycles);
        
        return {
          groupId: group._id,
          data: {
            progress,
            completedCycles,
            skippedCycles,
            nextDraw,
            isLoading: false
          }
        };
      } catch (error) {
        console.error(`Error loading progress for group ${group._id}:`, error);
        
        // Fallback to static calculation
        const { progress, completedCycles, skippedCycles } = calculateRealProgress(group, []);
        const nextDraw = calculateNextDraw(group, completedCycles, skippedCycles);
        
        return {
          groupId: group._id,
          data: {
            progress,
            completedCycles,
            skippedCycles,
            nextDraw,
            isLoading: false
          }
        };
      }
    });
    
    const results = await Promise.all(fetchPromises);
    
    // Update progress data
    const updatedProgressData = { ...progressData };
    results.forEach(result => {
      if (result && result.groupId) {
        updatedProgressData[result.groupId] = result.data;
      }
    });
    
    setGroupProgressData(updatedProgressData);
  };

  // Refresh progress for a specific group
  const refreshGroupProgress = async (groupId: string) => {
    const group = groups.find(g => g._id === groupId);
    if (!group) return;
    
    setGroupProgressData(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        isLoading: true
      }
    }));
    
    try {
      const cycles = await fetchGroupCycleData(groupId);
      const { progress, completedCycles, skippedCycles } = calculateRealProgress(group, cycles);
      const nextDraw = calculateNextDraw(group, completedCycles, skippedCycles);
      
      setGroupProgressData(prev => ({
        ...prev,
        [groupId]: {
          progress,
          completedCycles,
          skippedCycles,
          nextDraw,
          isLoading: false
        }
      }));
      
      toast.success(`Updated ${group.name} progress`);
    } catch (error) {
      console.error(`Error refreshing progress for group ${groupId}:`, error);
      setGroupProgressData(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          isLoading: false
        }
      }));
      toast.error(`Failed to update ${group.name} progress`);
    }
  };

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">No Active Groups</h2>
        <p className="text-gray-500 text-sm mb-4">You haven't joined any savings groups yet.</p>
        <Link href="/groups/create" className="text-primary font-medium hover:underline">
          Create a Group &rarr;
        </Link>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  // ✅ Updated Icon Logic
  const getNextDrawIcon = (nextDraw: string) => {
    if (nextDraw === 'All Cycles Done') return <Trophy size={12} className="text-emerald-500" />;
    if (nextDraw === 'Action Needed') return <AlertTriangle size={12} className="text-amber-500" />;
    if (nextDraw === 'Completed') return <Trophy size={12} className="text-emerald-500" />;
    
    if (nextDraw === 'Today') return <AlertCircle size={12} className="text-red-500" />;
    if (nextDraw === 'Overdue') return <XCircle size={12} className="text-red-500" />;
    
    if (nextDraw.includes('day')) {
      const days = parseInt(nextDraw);
      if (days > 7) return <Calendar size={12} className="text-green-500" />;
      if (days > 3) return <Clock size={12} className="text-yellow-500" />;
      return <Clock size={12} className="text-orange-500" />;
    }
    return <Calendar size={12} className="text-gray-400" />;
  };

  // ✅ Updated Color Logic
  const getNextDrawColor = (nextDraw: string) => {
    if (nextDraw === 'All Cycles Done') return 'text-emerald-600 font-medium';
    if (nextDraw === 'Action Needed') return 'text-amber-600 font-bold';
    if (nextDraw === 'Completed') return 'text-emerald-600 font-medium';
    
    if (nextDraw === 'Today') return 'text-red-600 font-bold';
    if (nextDraw === 'Overdue') return 'text-red-600 font-bold';
    
    if (nextDraw.includes('day')) {
      const days = parseInt(nextDraw);
      if (days > 7) return 'text-green-600';
      if (days > 3) return 'text-yellow-600';
      return 'text-orange-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Your Groups</h2>
        <Link href="/groups" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
          View All <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const progressData = groupProgressData[group._id] || {
            progress: 0,
            completedCycles: 0,
            skippedCycles: 0,
            nextDraw: "Loading...",
            isLoading: true
          };

          const duration = group.duration || 1;
          
          // Current cycle display: (Completed + Skipped + 1), capped at duration
          const currentCycleDisplay = Math.min(
             duration, 
             progressData.completedCycles + progressData.skippedCycles + (progressData.nextDraw.includes('Done') || progressData.nextDraw.includes('Action') ? 0 : 1)
          );
          
          const isCompleted = group.status === 'completed';
          // Perfectly done only if ALL completed AND NO skips
          const isPerfectlyDone = isCompleted && progressData.skippedCycles === 0;

          return (
            <Link key={group._id} href={`/groups/${group._id}`} className="block">
              <div className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 hover:shadow-md transition-all bg-gray-50/50 group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-primary">
                      <Users size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            refreshGroupProgress(group._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-opacity"
                          title="Refresh progress"
                          disabled={progressData.isLoading}
                        >
                          {progressData.isLoading ? (
                            <Loader2 size={12} className="animate-spin text-primary" />
                          ) : (
                            <RefreshCw size={12} className="text-primary" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {group.memberCount || group.members || 0} Members • {group.frequency || 'Monthly'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize whitespace-nowrap ${getStatusBadge(group.status)}`}>
                    {group.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Pool Value</span>
                    <span className="font-bold text-gray-900">{formatCurrency(group.totalAmount || group.totalPool || 0)}</span>
                  </div>
                  
                  {/* Progress Section */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-primary">
                        {/* Status Text based on condition */}
                        {isPerfectlyDone ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Trophy size={10} />
                            All Cycles Completed
                          </span>
                        ) : progressData.skippedCycles > 0 && currentCycleDisplay === duration ? (
                           <span className="flex items-center gap-1 text-amber-600">
                             <AlertTriangle size={10} />
                             Cycle Limit Reached
                           </span>
                        ) : (
                          `Cycle ${currentCycleDisplay}/${duration}`
                        )}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {progressData.isLoading ? (
                            <Loader2 size={8} className="animate-spin inline" />
                          ) : (
                            `${progressData.progress}%`
                          )}
                        </span>
                        
                        {/* Next Draw Badge */}
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded text-[10px]">
                            {getNextDrawIcon(progressData.nextDraw)}
                            <span className={getNextDrawColor(progressData.nextDraw)}>
                              {progressData.nextDraw}
                            </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-primary/10 relative">
                        {progressData.isLoading && (
                          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded"></div>
                        )}
                        <div 
                          style={{ width: `${progressData.progress}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                            isPerfectlyDone 
                                ? 'bg-emerald-500' 
                                : (progressData.skippedCycles > 0 && progressData.progress < 100 && currentCycleDisplay === duration)
                                ? 'bg-amber-500' // Amber bar if finished with skips
                                : 'bg-primary'
                          }`}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>
                        {group.startDate 
                          ? new Date(group.startDate).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'No start date'
                        }
                      </span>
                      <span className={`font-medium ${isCompleted ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {isPerfectlyDone 
                            ? 'Successfully Ended' 
                            : progressData.skippedCycles > 0 && currentCycleDisplay === duration 
                            ? 'Action Needed (Skips)' 
                            : `${duration - currentCycleDisplay} cycles left`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}