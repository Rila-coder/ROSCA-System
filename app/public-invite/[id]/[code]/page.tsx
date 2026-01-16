"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle,
  Clock,
  XCircle,
  Crown,
  Shield,
  ArrowRight,
  Users,
  DollarSign,
  Calendar,
  Copy,
  TrendingUp,
  Info,
  Target,
  Award,
  Globe,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// --- Components ---

const StatusBadge = ({
  hasPaid,
  status,
}: {
  hasPaid: boolean;
  status: string;
}) => {
  if (status === "pending")
    return (
      <span className="shrink-0 px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 border border-gray-200">
        <Clock size={12} /> <span className="hidden sm:inline">Pending</span><span className="sm:hidden">Wait</span>
      </span>
    );
  if (hasPaid)
    return (
      <span className="shrink-0 px-2.5 py-1 bg-[#14b8a6]/10 text-[#14b8a6] text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 border border-[#14b8a6]/20">
        <CheckCircle size={12} /> Paid
      </span>
    );
  return (
    <span className="shrink-0 px-2.5 py-1 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 border border-[#f59e0b]/20">
      <AlertCircle size={12} /> Due
    </span>
  );
};

const DonutChart = ({
  data,
}: {
  data: { paid: number; pending: number; late: number };
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvasRef.current.width = rect.width * dpr;
    canvasRef.current.height = rect.height * dpr;

    // Normalize coordinate system to use css pixels.
    ctx.scale(dpr, dpr);

    const total = data.paid + data.pending + data.late;
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10; // Responsive radius
    const thickness = 15;

    ctx.clearRect(0, 0, width, height);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = thickness;
      ctx.stroke();
      return;
    }

    let startAngle = -0.5 * Math.PI;
    const colors = { paid: "#14b8a6", pending: "#f59e0b", late: "#ef4444" };

    const drawSlice = (value: number, color: string) => {
      if (value === 0) return;
      const sliceAngle = (value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.stroke();

      startAngle += sliceAngle;
    };

    drawSlice(data.paid, colors.paid);
    drawSlice(data.pending, colors.pending);
    drawSlice(data.late, colors.late);
  }, [data]);

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', maxWidth: '200px', maxHeight: '200px' }} className="mx-auto" />
  );
};

export default function PublicGroupPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params?.id || !params?.code) return;

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/groups/${params.id}/settings/public/${params.code}`
        );
        if (!res.ok) throw new Error("Group not found");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError("Invalid link or group does not exist");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.code]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  // ✅ Helper to resolve names correctly (Snapshot > User > Unknown)
  const resolveMemberName = (member: any) => {
    // 1. Snapshot Name (Edited/Guest Name)
    if (member.name) return member.name;
    // 2. Linked User Name (Registered)
    if (member.userId?.name) return member.userId.name;
    // 3. Legacy Pending Details
    if (member.pendingMemberDetails?.name)
      return member.pendingMemberDetails.name;
    // 4. Fallback
    return "Unknown Member";
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] p-4">
        <div className="relative mb-6">
          {/* Spinning Ring */}
          <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin"></div>

          {/* Centered Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-8 h-8 md:w-10 md:h-10">
              <Image
                src="/Images/rosca_logo.png"
                alt="Rosca Logo"
                fill
                className="object-contain animate-pulse"
              />
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#1e3a8a] mb-1">
          Loading Group Details
        </h2>
        <p className="text-sm text-gray-500">Please wait...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] p-4 sm:p-6">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 sm:p-8 text-center border border-gray-100">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={32} className="text-red-500 sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{error}</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            The invite link may have expired, or the group is no longer
            available. Please contact the administrator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#1e3a8a] text-white rounded-xl hover:bg-[#1e3a8a]/90 transition-all font-medium"
          >
            Return Home
          </Link>
        </div>
      </div>
    );

  const { group, stats, members, activeCycleNumber, activeCycleDueDate } = data;

  const leader = members.find((m: any) => m.role === "leader");
  const subLeaders = members.filter((m: any) => m.role === "sub_leader");
  const regularMembers = members.filter((m: any) => m.role === "member");
  const pendingMembers = members.filter((m: any) => m.status === "pending");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalInCycle = stats.currentCycleStats.total || 1;
  const collectedInCycle = stats.currentCycleStats.paid;
  const progressPercent = Math.round((collectedInCycle / totalInCycle) * 100);
  const totalCycles = group.duration || 12;
  const completedCycles = activeCycleNumber - 1;
  const completionRate = Math.round((completedCycles / totalCycles) * 100);

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-slate-800">
      {/* --- Navbar --- */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 relative">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg sm:text-xl font-bold text-[#1e3a8a] tracking-tight">
                ROSCA
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleCopyLink}
                className="hidden sm:flex items-center gap-2 px-3 py-2 sm:px-4 text-[#1e3a8a] bg-[#1e3a8a]/5 hover:bg-[#1e3a8a]/10 rounded-lg transition-colors text-xs sm:text-sm font-semibold"
              >
                {copied ? <CheckCircle size={14} className="sm:w-4 sm:h-4"/> : <Copy size={14} className="sm:w-4 sm:h-4" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
              {/* Mobile Copy Icon Only */}
              <button
                onClick={handleCopyLink}
                className="sm:hidden flex items-center justify-center w-9 h-9 text-[#1e3a8a] bg-[#1e3a8a]/5 rounded-lg"
              >
                {copied ? <CheckCircle size={18}/> : <Copy size={18} />}
              </button>

              <Link
                href="/register"
                className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-all font-medium text-xs sm:text-sm flex items-center gap-2 shadow-sm whitespace-nowrap"
              >
                Join Group
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* --- Hero Section --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-center justify-between">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-[#1e3a8a] rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
                <Globe size={12} /> Public Group Dashboard
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {group.name}
              </h1>

              <p className="text-gray-500 text-base sm:text-lg max-w-2xl leading-relaxed">
                {group.description ||
                  "A professionally managed rotating savings and credit association with complete transparency and security."}
              </p>

              <div className="grid grid-cols-2 sm:flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Target size={16} className="text-[#14b8a6] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase truncate">
                      Total Goal
                    </span>
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {formatCurrency(
                        group.contributionAmount *
                          group.memberCount *
                          totalCycles
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Calendar size={16} className="text-[#1e3a8a] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase truncate">
                      Start Date
                    </span>
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {formatDate(group.startDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Pool Feature Card */}
            <div className="w-full lg:w-auto lg:min-w-[300px]">
              <div className="bg-gradient-to-br from-[#1e3a8a] to-[#172554] rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-blue-200 text-sm font-medium">
                    <Award size={18} />
                    Total Pool Collected
                  </div>
                  <div className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                    {formatCurrency(stats.totalCollected)}
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${completionRate}%` }}
                      className="h-full bg-[#14b8a6]"
                    ></div>
                  </div>
                  <p className="text-xs text-blue-200 mt-2">
                    Life-time collection across {completedCycles} cycles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Key Metrics Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          {[
            {
              label: "Contribution",
              value: formatCurrency(group.contributionAmount),
              sub: `${group.frequency} payment`,
              icon: DollarSign,
              color: "text-[#14b8a6]",
              bg: "bg-[#14b8a6]/10",
            },
            {
              label: "Total Members",
              value: group.memberCount,
              sub: `${group.memberCount - pendingMembers.length} Active`,
              icon: Users,
              color: "text-[#1e3a8a]",
              bg: "bg-[#1e3a8a]/10",
            },
            {
              label: "Current Cycle",
              value: `#${activeCycleNumber}`,
              sub: `${completionRate}% Completed`,
              icon: TrendingUp,
              color: "text-[#f59e0b]",
              bg: "bg-[#f59e0b]/10",
            },
            {
              label: "Duration",
              value: `${group.duration} Cycles`,
              sub: activeCycleDueDate
                ? `Due: ${formatDate(activeCycleDueDate)}`
                : "Ongoing",
              icon: Clock,
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">
                  {stat.label}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 truncate">
                  {stat.value}
                </h3>
                <p className="text-xs text-gray-500 truncate">{stat.sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.bg} shrink-0 ml-3`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* --- LEFT COLUMN: Members --- */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Leadership */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield size={20} className="text-[#1e3a8a]" />
                  Administration
                </h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Leader Card */}
                  {leader && (
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 sm:p-5 flex items-center gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1e3a8a] text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-md shrink-0">
                        {/* ✅ Fixed Name Display for Leader */}
                        {resolveMemberName(leader).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            {resolveMemberName(leader)}
                          </h3>
                          <span className="px-2 py-0.5 bg-[#f59e0b] text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1 shrink-0">
                            <Crown size={10} /> Leader
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                          <span className="text-xs sm:text-sm truncate">Joined {formatDate(leader.joinedAt)}</span>
                          <StatusBadge
                            hasPaid={leader.hasPaidCurrentCycle}
                            status={leader.status}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub Leaders */}
                  {subLeaders.map((sub: any) => (
                    <div
                      key={sub._id}
                      className="border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 text-[#1e3a8a] rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {/* ✅ Fixed Name Display for Sub Leaders */}
                        {resolveMemberName(sub).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {resolveMemberName(sub)}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          Co-Leader
                        </div>
                      </div>
                      <div className="ml-auto shrink-0">
                        <StatusBadge
                          hasPaid={sub.hasPaidCurrentCycle}
                          status={sub.status}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Users size={20} className="text-gray-500" />
                    Members List
                  </h2>
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  {regularMembers.length} Active
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {regularMembers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {regularMembers.map((member: any, i: number) => {
                      // ✅ Fixed Name Display
                      const name = resolveMemberName(member);
                      return (
                        <div
                          key={member._id}
                          className={`p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            i % 2 === 0 ? "md:border-r border-gray-100" : ""
                          }`}
                        >
                          <div className="w-9 h-9 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm border border-gray-200 shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {name}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              Joined {formatDate(member.joinedAt)}
                            </p>
                          </div>
                          <StatusBadge
                            hasPaid={member.hasPaidCurrentCycle}
                            status={member.status}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Users className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-gray-500 font-medium">
                      No members joined yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: Sidebar --- */}
          <div className="space-y-6">
            {/* Cycle Status Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900">Payment Status</h3>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Cycle {activeCycleNumber}
                </span>
              </div>

              <div className="relative h-48 w-full mb-6 flex items-center justify-center">
                <DonutChart data={stats.currentCycleStats} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-gray-900">
                    {progressPercent}%
                  </span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Collected
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14b8a6]"></span>{" "}
                    Paid
                  </span>
                  <span className="font-bold text-gray-900">
                    {stats.currentCycleStats.paid}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>{" "}
                    Pending
                  </span>
                  <span className="font-bold text-gray-900">
                    {stats.currentCycleStats.pending}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>{" "}
                    Late
                  </span>
                  <span className="font-bold text-gray-900">
                    {stats.currentCycleStats.late}
                  </span>
                </div>
              </div>
            </div>

            {/* How It Works (Clean) */}
            <div className="bg-[#1e3a8a] text-white rounded-2xl p-6 shadow-md">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Info size={20} className="text-[#14b8a6]" />
                How it works
              </h3>
              <ul className="space-y-4 relative">
                {/* Connecting Line */}
                <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-white/20"></div>

                <li className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-[#14b8a6] text-[#1e3a8a] flex items-center justify-center text-xs font-bold shrink-0 z-10">
                    1
                  </div>
                  <div className="text-sm text-blue-100">
                    Contribute{" "}
                    <strong>{formatCurrency(group.contributionAmount)}</strong>{" "}
                    every {group.frequency}.
                  </div>
                </li>
                <li className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-[#14b8a6] text-[#1e3a8a] flex items-center justify-center text-xs font-bold shrink-0 z-10">
                    2
                  </div>
                  <div className="text-sm text-blue-100">
                    One member receives the total pool via lottery or rotation.
                  </div>
                </li>
                <li className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-[#14b8a6] text-[#1e3a8a] flex items-center justify-center text-xs font-bold shrink-0 z-10">
                    3
                  </div>
                  <div className="text-sm text-blue-100">
                    Repeat until everyone has received the pool once.
                  </div>
                </li>
              </ul>

              <Link
                href="/register"
                className="mt-6 w-full bg-white text-[#1e3a8a] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
              >
                Start Saving Now <ArrowRight size={16} />
              </Link>
            </div>

            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 text-sm">
                    Pending Approval
                  </h4>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingMembers.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingMembers.slice(0, 3).map((m: any) => {
                    // ✅ Fixed Name Display for Pending
                    const name = resolveMemberName(m);
                    return (
                      <div
                        key={m._id}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate min-w-0 flex-1">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Bottom CTA --- */}
        <div className="mt-8 sm:mt-12 bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#14b8a6]/10 text-[#14b8a6] rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Ready to join this Circle?
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-6 text-sm sm:text-base">
            Secure your spot in this savings group. Verified members only.
            Bank-grade security.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-[#1e3a8a] text-white rounded-xl font-semibold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto block"
            >
              Join Group
            </Link>
            <Link
              href="/"
              className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all w-full sm:w-auto block"
            >
              Learn More
            </Link>
          </div>
        </div>
      </main>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center sm:flex sm:justify-between sm:text-left items-center">
          <div className="text-sm text-gray-500 mb-4 sm:mb-0">
            © 2024 ROSCA System. All rights reserved.
          </div>
          <div className="flex justify-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/privacy" className="hover:text-[#1e3a8a]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#1e3a8a]">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-[#1e3a8a]">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}