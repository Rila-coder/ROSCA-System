"use client";

import { useState, useEffect } from "react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingPayments from "@/components/dashboard/UpcomingPayments";
import YourGroups from "@/components/dashboard/YourGroups";
import QuickActions from "@/components/dashboard/QuickActions";
import LoadingWrapper from "@/components/layout/LoadingWrapper";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LoadingWrapper pageTitle="Dashboard">
      <div className="space-y-6 md:space-y-8 mt-0 md:mt-5 lg:mt-0">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-4 md:p-6 text-white shadow-md">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">
            Welcome back, {data?.userName?.split(" ")[0]}! 👋
          </h1>
          <p className="opacity-90 text-sm md:text-base">
            Here's what's happening with your savings groups today.
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardStats stats={data?.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Your Groups */}
            <YourGroups groups={data?.groups} />

            {/* Recent Activity */}
            <RecentActivity activities={data?.recentActivity} />
          </div>

          {/* Right Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Upcoming Payments */}
            <UpcomingPayments payments={data?.upcomingPayments} />
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}
