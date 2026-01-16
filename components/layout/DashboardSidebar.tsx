"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Users,
  PlusCircle,
  BarChart3,
  Bell,
  History,
  CreditCard,
  ChevronRight,
  Wallet,
  TrendingUp,
  FileText,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  UserCircle,
  Loader2, // Ensure Loader2 is imported
} from "lucide-react";

// Static menu items definition
const baseMenuItems = [
  {
    title: "Home",
    icon: <Home size={18} />,
    path: "/",
  },
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    path: "/dashboard",
  },
  {
    title: "My Groups",
    icon: <Users size={18} />,
    path: "/groups",
  },
  {
    title: "Create Group",
    icon: <PlusCircle size={18} />,
    path: "/groups/create",
    accent: true,
  },
  {
    title: "Members",
    icon: <UserCircle size={18} />,
    path: "/members",
  },
  {
    title: "Payments",
    icon: <CreditCard size={18} />,
    path: "/payments",
  },
  {
    title: "Reports",
    icon: <BarChart3 size={18} />,
    path: "/reports",
  },
  {
    title: "Notifications",
    icon: <Bell size={18} />,
    path: "/notifications",
    id: "notifications",
  },
  {
    title: "Activity History",
    icon: <History size={18} />,
    path: "/activity",
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Notification State
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ NEW: Stats State
  const [statsLoading, setStatsLoading] = useState(true);
  const [quickStats, setQuickStats] = useState({
    totalSavings: 0,
    activeGroups: 0,
    pendingAmount: 0
  });

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch Notification Count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications?filter=unread&limit=1');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.counts?.unread || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notification count", error);
    }
  };

  // ✅ NEW: Fetch Quick Stats from Reports API
  const fetchQuickStats = async () => {
    try {
      // Re-using the reports API as it already calculates these totals per user
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        if (data.general) {
          setQuickStats({
            totalSavings: data.general.totalPaid || 0,
            activeGroups: data.general.activeGroups || 0,
            pendingAmount: data.general.totalPending || 0
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch quick stats", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();
    fetchQuickStats();

    // Listen for global updates
    const handleNotificationUpdate = () => {
      fetchUnreadCount();
      // Also refresh stats when notifications update (often means payment happened)
      fetchQuickStats(); 
    };

    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    // Poll every minute
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchQuickStats();
    }, 60000);

    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'token',
        oldValue: localStorage.getItem('token'),
        newValue: null,
      }));
      window.dispatchEvent(new Event('logout'));
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear();
      router.push("/");
    }
  };

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-23 right-4 z-40 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors"
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          fixed lg:sticky lg:top-3 left-0 z-40 h-screen lg:h-screen
          bg-white border-r border-gray-200 transition-transform duration-300
          ${collapsed ? "w-16" : "w-64"}
          min-[768px]:top-18
        `}
      >
        <div className="p-3 md:p-4 h-full flex flex-col lg:mt-5">
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-2 mb-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={`transform transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
              size={18}
            />
          </button>

          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden p-0">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  width={60}
                  height={60}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="flex flex-col leading-tight">
                <span className="text-xl font-bold text-primary">ROSCA</span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary/70 -mt-0.5">
                  Dashboard
                </span>
              </span>
            </Link>
            <button 
              onClick={() => setMobileOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {baseMenuItems.map((item) => {
              let badgeValue = null;
              if (item.id === 'notifications' && unreadCount > 0) {
                badgeValue = unreadCount > 99 ? '99+' : unreadCount;
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center ${
                    collapsed ? "justify-center" : "justify-between"
                  } px-3 py-2 rounded-lg transition-colors text-text hover:bg-gray-50 ${
                    item.accent ? "border border-primary/30" : ""
                  } ${isActive(item.path) ? "bg-primary/10" : ""}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${isActive(item.path) ? "text-primary" : "text-text/70"}`}>
                      {item.icon}
                    </div>
                    {!collapsed && <span className={`text-sm ${isActive(item.path) ? "text-primary font-medium" : ""}`}>
                      {item.title}
                    </span>}
                  </div>

                  {!collapsed && badgeValue && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[20px] text-center font-bold shadow-sm animate-pulse">
                      {badgeValue}
                    </span>
                  )}
                  {collapsed && badgeValue && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section - Logout and Quick Stats */}
          <div className="mt-auto space-y-3">
            
            {/* ✅ DYNAMIC QUICK STATS */}
            {!collapsed && !mobileOpen && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <h3 className="font-medium text-text text-sm mb-2 flex items-center justify-between">
                  Quick Stats
                  {statsLoading && <Loader2 size={12} className="animate-spin text-primary" />}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wallet size={14} className="text-primary" />
                      <span className="text-xs text-text/70">Total Savings</span>
                    </div>
                    <span className="font-semibold text-sm">
                        {statsLoading ? "..." : formatCurrency(quickStats.totalSavings)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs text-text/70">Active Groups</span>
                    </div>
                    <span className="font-semibold text-sm">
                        {statsLoading ? "..." : quickStats.activeGroups}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText size={14} className="text-yellow-500" />
                      <span className="text-xs text-text/70">Pending</span>
                    </div>
                    <span className="font-semibold text-sm">
                        {statsLoading ? "..." : formatCurrency(quickStats.pendingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex items-center ${
                collapsed ? "justify-center" : "justify-start"
              } w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors border border-red-200`}
            >
              <div className="flex items-center space-x-3">
                <LogOut size={18} />
                {!collapsed && <span className="text-sm">Logout</span>}
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}