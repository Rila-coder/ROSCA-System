"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Users,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertCircle,
  Crown,
  Shield,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Eye,
  Settings,
} from "lucide-react";
import LoadingWrapper from "@/components/layout/LoadingWrapper";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalManaged: 0,
    completedGroups: 0,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/groups", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch groups");
      }

      // Format the data properly
      const formattedGroups = (data.groups || []).map((group: any) => {
        return {
          ...group,
          _id: group._id?.toString() || group._id,
          leaderId: group.leaderId?.toString() || group.leaderId,
          leaderDetails: group.leaderDetails || null, // Keep leader details
          subLeaderIds: (group.subLeaderIds || []).map(
            (sub: any) => sub?.toString() || sub
          ),
          memberCount: group.memberCount || group.duration || 0,
          myRole: group.myRole || "member",
          myStatus: group.myStatus || "pending",
        };
      });

      setGroups(formattedGroups);

      // Calculate stats
      const activeGroups = formattedGroups.filter(
        (g: any) => g.status === "active"
      ).length;
      const completedGroups = formattedGroups.filter(
        (g: any) => g.status === "completed"
      ).length;
      const totalManaged = formattedGroups.reduce(
        (sum: number, g: any) => sum + (g.totalAmount || 0),
        0
      );

      setStats({
        totalGroups: formattedGroups.length,
        activeGroups,
        totalManaged,
        completedGroups,
      });
    } catch (err: any) {
      console.error("❌ Error fetching groups:", err);
      const errorMsg = err.message || "Failed to load groups.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getGroupStats = (group: any) => {
    const duration = group.duration || 1;
    const currentCycle = group.currentCycle || 0;
    const progress = Math.round((currentCycle / duration) * 100);

    // Calculate next draw date
    let nextDraw = "Completed";
    let nextDrawColor = "text-gray-600";
    let nextDrawIcon = <CheckCircle size={12} className="text-gray-400" />;

    if (group.status === "active" && group.startDate) {
      try {
        const startDate = new Date(group.startDate);
        const frequency = group.frequency || "monthly";
        const frequencyDays =
          frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
        const daysToNextCycle = frequencyDays * (currentCycle + 1);
        const nextDate = new Date(
          startDate.getTime() + daysToNextCycle * 24 * 60 * 60 * 1000
        );
        const daysLeft = Math.ceil(
          (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft > 7) {
          nextDraw = `${daysLeft} days`;
          nextDrawColor = "text-green-600";
          nextDrawIcon = <Calendar size={12} className="text-green-500" />;
        } else if (daysLeft > 3) {
          nextDraw = `${daysLeft} days`;
          nextDrawColor = "text-yellow-600";
          nextDrawIcon = <Clock size={12} className="text-yellow-500" />;
        } else if (daysLeft > 0) {
          nextDraw = `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
          nextDrawColor = "text-orange-600";
          nextDrawIcon = <Clock size={12} className="text-orange-500" />;
        } else if (daysLeft === 0) {
          nextDraw = "Today";
          nextDrawColor = "text-red-600 font-bold";
          nextDrawIcon = <AlertCircle size={12} className="text-red-500" />;
        } else {
          nextDraw = "Overdue";
          nextDrawColor = "text-red-600 font-bold";
          nextDrawIcon = <XCircle size={12} className="text-red-500" />;
        }
      } catch (e) {
        nextDraw = "N/A";
      }
    } else if (group.status === "completed") {
      nextDrawColor = "text-purple-600";
      nextDrawIcon = <CheckCircle size={12} className="text-purple-500" />;
    }

    return {
      progress: Math.min(100, Math.max(0, progress)),
      nextDraw,
      nextDrawColor,
      nextDrawIcon,
      duration,
      currentCycle,
    };
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        text: "Active",
        bg: "bg-green-50",
        textColor: "text-green-700",
        border: "border-green-200",
        icon: <TrendingUp size={12} className="text-green-500" />,
      },
      completed: {
        text: "Completed",
        bg: "bg-purple-50",
        textColor: "text-purple-700",
        border: "border-purple-200",
        icon: <CheckCircle size={12} className="text-purple-500" />,
      },
      pending: {
        text: "Pending",
        bg: "bg-yellow-50",
        textColor: "text-yellow-700",
        border: "border-yellow-200",
        icon: <Clock size={12} className="text-yellow-500" />,
      },
    };

    return (
      badges[status as keyof typeof badges] || {
        text: status,
        bg: "bg-gray-50",
        textColor: "text-gray-600",
        border: "border-gray-200",
        icon: <AlertCircle size={12} className="text-gray-400" />,
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <LoadingWrapper pageTitle="Loading Your Groups">
        <div className="min-h-screen flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading your groups...</p>
          </div>
        </div>
      </LoadingWrapper>
    );
  }

  return (
    <LoadingWrapper pageTitle="My Groups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              My Groups
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage all your ROSCA savings groups
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={fetchGroups}
              disabled={loading}
              className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Refresh groups"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : (
                <RefreshCw size={20} className="text-gray-600" />
              )}
            </button>
            <Link
              href="/groups/create"
              className="flex-1 sm:flex-none justify-center bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm active:transform active:scale-95"
            >
              <PlusCircle size={20} />
              <span className="whitespace-nowrap">Create Group</span>
            </Link>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchGroups}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Stats - Smart Grid Layout (2x2 on Mobile, 4x1 on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
              {stats.totalGroups}
            </div>
            <div className="text-xs md:text-sm text-gray-600 font-medium">Total Groups</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-green-600 mb-1">
              {stats.activeGroups}
            </div>
            <div className="text-xs md:text-sm text-gray-600 font-medium">Active</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">
              {stats.completedGroups}
            </div>
            <div className="text-xs md:text-sm text-gray-600 font-medium">Completed</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 text-center shadow-sm hover:shadow-md transition-shadow col-span-1">
            <div className="text-lg md:text-3xl font-bold text-blue-600 mb-1 truncate">
              {/* Responsive text size for money to prevent break */}
              <span className="md:hidden">₹{(stats.totalManaged / 1000).toFixed(1)}k</span>
              <span className="hidden md:inline">₹{stats.totalManaged.toLocaleString()}</span>
            </div>
            <div className="text-xs md:text-sm text-gray-600 font-medium">Total Managed</div>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {groups.map((group) => {
            const groupStats = getGroupStats(group);
            const statusBadge = getStatusBadge(group.status);

            // ✅ CORRECT ROLE from API
            const myRole = group.myRole; // 'leader', 'sub_leader', or 'member'

            // ✅ CORRECT LEADER NAME - Use leaderDetails from API
            const isLeader = myRole === "leader";
            const leaderName = isLeader
              ? "You"
              : group.leaderDetails?.name || "Unknown";

            // Member Count
            const memberCount = group.memberCount;

            return (
              <div
                key={group._id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow hover:border-primary/30 relative group flex flex-col"
              >
                {/* Role Badge Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  {myRole === "leader" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] md:text-xs font-bold rounded-full border border-yellow-200 shadow-sm backdrop-blur-sm">
                      <Crown size={10} /> Leader
                    </span>
                  )}
                  {myRole === "sub_leader" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] md:text-xs font-bold rounded-full border border-blue-200 shadow-sm backdrop-blur-sm">
                      <Shield size={10} /> Sub-leader
                    </span>
                  )}
                  {myRole === "member" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] md:text-xs font-medium rounded-full border border-gray-200">
                      <User size={10} /> Member
                    </span>
                  )}
                </div>

                <Link href={`/groups/${group._id}`} className="block p-4 md:p-5 flex-1">
                  <div className="flex items-center justify-between mb-2 pr-16">
                    <h3 className="font-bold text-gray-900 truncate text-lg leading-tight">
                      {group.name}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${statusBadge.bg} ${statusBadge.textColor} ${statusBadge.border}`}
                    >
                      {statusBadge.icon}
                      <span className="font-medium">{statusBadge.text}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Metrics Row - Flex wrap for mobile safety */}
                    <div className="flex flex-wrap items-center justify-between text-sm gap-y-2">
                      <div className="flex items-center space-x-1.5 bg-gray-50 px-2 py-1 rounded-md">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-700 font-medium">
                          {memberCount}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-gray-50 px-2 py-1 rounded-md">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-gray-900 font-semibold">
                          ₹{group.contributionAmount?.toLocaleString() || "0"}{" "}
                          <span className="text-gray-500 font-normal text-xs">{group.frequency || "mo"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm border-t border-dashed border-gray-100 pt-2">
                      <div className="flex items-center space-x-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-600 text-xs md:text-sm">
                          Cycle {group.currentCycle || 0}/{group.duration || 0}
                        </span>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        Total: ₹{group.totalAmount?.toLocaleString() || "0"}
                      </div>
                    </div>

                    {/* ✅ FIXED: Leader Display with proper name */}
                    <div className="text-xs md:text-sm text-gray-600 truncate flex items-center gap-1.5">
                      <span className="text-gray-400">Leader:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                           {leaderName.charAt(0)}
                        </div>
                        <span
                          className={`font-medium ${
                            isLeader ? "text-primary" : "text-gray-900"
                          }`}
                        >
                          {leaderName}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-semibold text-gray-700">
                          {groupStats.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            group.status === "completed"
                              ? "bg-green-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${groupStats.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] sm:text-xs text-gray-500 mt-2">
                        <span>Next draw:</span>
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                          {groupStats.nextDrawIcon}
                          <span className={`${groupStats.nextDrawColor} font-medium`}>
                            {groupStats.nextDraw}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 flex justify-between items-center gap-2">
                  <Link
                    href={`/groups/${group._id}`}
                    className="flex-1 text-sm text-primary hover:text-primary-dark hover:bg-white border border-transparent hover:border-gray-200 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye size={16} />
                    View
                  </Link>
                  <div className="w-px h-4 bg-gray-200"></div>
                  <Link
                    href={`/groups/${group._id}?tab=settings`}
                    className="flex-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Create New Group Card */}
          <Link
            href="/groups/create"
            className="bg-gray-50/50 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 rounded-xl p-6 text-center flex flex-col items-center justify-center transition-colors min-h-[300px] group"
          >
            <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <PlusCircle
                size={28}
                className="text-primary"
              />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              Create New Group
            </h3>
            <p className="text-gray-500 text-sm mb-5 max-w-[200px]">
              Start a new ROSCA savings group with friends or family
            </p>
            <div className="inline-flex items-center gap-1 text-primary text-sm font-bold group-hover:underline decoration-2 underline-offset-4">
              <span>Get Started</span>
              <ArrowUpRight size={16} />
            </div>
          </Link>
        </div>

        {/* Empty State */}
        {groups.length === 0 && !loading && !error && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <Users size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first ROSCA group to start managing savings circles
              with friends, family, or colleagues.
            </p>
            <Link
              href="/groups/create"
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2 transition-colors shadow-sm hover:shadow-md"
            >
              <PlusCircle size={20} />
              <span>Create Your First Group</span>
            </Link>
          </div>
        )}

        {/* Role Summary */}
        {groups.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {groups.length}
                </span>{" "}
                groups
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-600">Leader:</span>
                  <span className="font-semibold text-gray-900">
                    {groups.filter((g) => g.myRole === "leader").length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600">Sub-leader:</span>
                  <span className="font-semibold text-gray-900">
                    {groups.filter((g) => g.myRole === "sub_leader").length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                  <span className="text-gray-600">Member:</span>
                  <span className="font-semibold text-gray-900">
                    {groups.filter((g) => g.myRole === "member").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadingWrapper>
  );
}