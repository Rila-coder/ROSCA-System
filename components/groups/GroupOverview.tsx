"use client";

import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Download,
  Share2,
  Bell,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Hash,
  EyeOff,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { useAuth } from "@/components/providers/AuthProvider";

interface GroupOverviewProps {
  group: any;
  // userRole removed from interface as we calculate it internally now
}

// Pie Chart Component
const PaymentPieChart = ({
  data,
}: {
  data: { paid: number; pending: number; late: number };
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total
    const total = data.paid + data.pending + data.late;
    if (total === 0) {
      // Draw empty circle
      ctx.beginPath();
      ctx.arc(75, 75, 70, 0, Math.PI * 2);
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Draw "No Data" text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No Data", 75, 75);
      return;
    }

    // Colors
    const colors = {
      paid: "#10b981", // green-500
      pending: "#f59e0b", // yellow-500
      late: "#ef4444", // red-500
    };

    let startAngle = 0;

    // Function to draw a slice
    const drawSlice = (value: number, color: string, label: string) => {
      if (value === 0) return;

      const sliceAngle = (value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(75, 75);
      ctx.arc(75, 75, 70, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Draw slice border
      ctx.beginPath();
      ctx.arc(75, 75, 70, startAngle, endAngle);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    };

    // Draw slices
    drawSlice(data.paid, colors.paid, "Paid");
    drawSlice(data.pending, colors.pending, "Pending");
    drawSlice(data.late, colors.late, "Late");
  }, [data]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={150} height={150} />

      {/* Center text */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-lg font-bold text-text">
          {data.paid + data.pending + data.late}
        </div>
        <div className="text-xs text-text/60">Total</div>
      </div>
    </div>
  );
};

export default function GroupOverview({ group }: GroupOverviewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCollected: 0,
    activeMembers: 0,
    nextDraw: "",
    completionRate: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [upcomingDraws, setUpcomingDraws] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [activeCyclePayments, setActiveCyclePayments] = useState<any[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // --- PERMISSION LOGIC (FIXED) ---
  const currentUserId = user?.id || (user as any)?._id;
  // Handle different data structures for leader ID
  const leaderId = group?.leader?.id || group?.leader?._id || group?.leader;

  // Calculate if current user is leader
  const isLeader = currentUserId && leaderId && currentUserId.toString() === leaderId.toString();

  // Leader Only Permission for "Mark Paid"
  const canManagePayments = isLeader;

  useEffect(() => {
    if (group?._id) {
      fetchOverviewData();
      fetchCycles();
    }
  }, [group?._id]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/groups/${group._id}/overview?t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        if (response.status === 404) {
          throw new Error("Overview API not found");
        }
        throw new Error(`Failed to fetch overview data: ${response.status}`);
      }

      const data = await response.json();

      const apiTotalCollected =
        data.stats?.totalCollected || data.totalCollected || 0;
      const apiMemberCount = data.memberCount || 0;
      const apiActiveMembers = data.stats?.activeMembers || 0;

      setStats({
        totalCollected: apiTotalCollected,
        activeMembers: apiActiveMembers,
        nextDraw: data.stats?.nextDraw || "No upcoming draws",
        completionRate: data.stats?.completionRate || 0,
      });

      setRecentPayments(data.recentPayments || []);
      setUpcomingDraws(data.upcomingDraws || []);
      setMemberCount(apiMemberCount);
      setTotalCollected(apiTotalCollected);
      setLastRefreshed(new Date());
    } catch (error: any) {
      console.error("❌ Error fetching overview data:", error);
      toast.error(error.message || "Failed to load overview data");

      setStats({
        totalCollected: group.collectedAmount || 0,
        activeMembers: group.activeMemberCount || 0,
        nextDraw: "No upcoming draws",
        completionRate: 0,
      });
      setMemberCount(group.memberCount || 0);
      setTotalCollected(group.collectedAmount || 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    try {
      const response = await fetch(
        `/api/groups/${group._id}/cycles?t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCycles(data.cycles || []);

        const foundActive = data.cycles.find((cycle: any) => {
          return cycle.status === "active";
        });

        setActiveCycle(foundActive || null);

        if (foundActive) {
          fetchActiveCyclePayments(foundActive._id);
        } else {
          setActiveCyclePayments([]);
        }
      }
    } catch (error) {
      console.error("Error fetching cycles:", error);
    }
  };

  const fetchActiveCyclePayments = async (cycleId: string) => {
    try {
      const response = await fetch(
        `/api/groups/${group._id}/payments?cycleId=${cycleId}&t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const data = await response.json();
        setActiveCyclePayments(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching active cycle payments:", error);
    }
  };

  const isCurrentUser = (paymentUserId: string) => {
    if (!user) return false;
    const currentUserId = user.id || (user as any)._id;
    return paymentUserId === currentUserId;
  };

  const canViewReceipt = (payment: any) => {
    if (payment.status !== "paid") return false;
    // Leader can view all receipts, members can only view their own
    if (canManagePayments) return true;
    return isCurrentUser(payment.userId?._id);
  };

  const hasActiveCycle = () => {
    return !!activeCycle && activeCycle.status === "active";
  };

  const getCycleStatus = (cycle: any) => {
    if (cycle.status) return cycle.status;
    if (cycle.isSkipped) return "skipped";
    if (cycle.isCompleted) return "completed";
    return "active";
  };

  const getActiveCyclePayments = () => {
    if (!hasActiveCycle()) return [];
    if (activeCyclePayments.length > 0) {
      return activeCyclePayments;
    }
    return recentPayments.filter(
      (payment) =>
        payment.cycleId === activeCycle._id ||
        payment.cycleNumber === activeCycle.cycleNumber
    );
  };

  // Get payment statistics for pie chart
  const getPaymentStats = () => {
    const payments = getActiveCyclePayments();
    return {
      paid: payments.filter((p) => p.status === "paid").length,
      pending: payments.filter((p) => p.status === "pending").length,
      late: payments.filter((p) => p.status === "late").length,
      total: payments.length,
    };
  };

  const handleSendReminder = async () => {
    if (!hasActiveCycle()) {
      toast.error("No active cycle to send reminders for");
      return;
    }

    // Only leaders can send reminders
    if (!canManagePayments) {
      toast.error("You don't have permission to send reminders");
      return;
    }

    try {
      const response = await fetch(
        `/api/groups/${group._id}/payments/remind-all`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Reminders sent to ${data.count} members`);
      } else {
        toast.error("Failed to send reminders");
      }
    } catch (error) {
      toast.error("Failed to send reminders");
    }
  };

  const handleInviteMembers = async () => {
    try {
      const response = await fetch(`/api/groups/${group._id}/invite`);
      if (!response.ok) throw new Error("Failed to get invite link");
      const data = await response.json();
      const inviteLink = `${window.location.origin}/invite/${data.inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy invite link");
    }
  };

  // Generate PDF Report for all users
  const handleGeneratePDFReport = async () => {
    try {
      toast.loading("Generating PDF report...");

      const paymentStats = getPaymentStats();
      const doc = new jsPDF();

      // Page configuration
      const pageHeight = doc.internal.pageSize.height; // 297mm for A4
      const footerHeight = 20;
      const bottomMargin = 20;
      const printableHeight = pageHeight - bottomMargin - footerHeight;

      // Helper: Check if we need a new page
      let y = 50; // Start Y position

      const checkPageBreak = (requiredSpace: number) => {
        if (y + requiredSpace > printableHeight) {
          doc.addPage();
          y = 20; // Reset Y for new page
          return true;
        }
        return false;
      };

      // --- Helper: Draw Pie Slice ---
      const drawPieSlice = (
        centerX: number,
        centerY: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        color: [number, number, number]
      ) => {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);

        const angleToRad = (deg: number) => (deg * Math.PI) / 180;
        const startRad = angleToRad(startAngle);
        const startX = radius * Math.cos(startRad);
        const startY = radius * Math.sin(startRad);

        const vectors: any[] = [[startX, startY]];
        const step = 5;
        let currentAngle = startAngle;

        while (currentAngle < endAngle) {
          const nextAngle = Math.min(currentAngle + step, endAngle);
          const currRad = angleToRad(currentAngle);
          const nextRad = angleToRad(nextAngle);
          const currX = radius * Math.cos(currRad);
          const currY = radius * Math.sin(currRad);
          const nextX = radius * Math.cos(nextRad);
          const nextY = radius * Math.sin(nextRad);
          vectors.push([nextX - currX, nextY - currY]);
          currentAngle = nextAngle;
        }

        doc.lines(vectors, centerX, centerY, [1, 1], "FD", true);
      };

      // 1. Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 40, "F");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("GROUP OVERVIEW REPORT", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Group: ${group.name}`, 105, 30, { align: "center" });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 36, {
        align: "center",
      });

      // 2. Group Summary
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Group Summary", 20, y);

      y += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);

      const drawSummaryRow = (label: string, value: string, x = 20) => {
        doc.text(label, x, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(value, x + 70, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        y += 8;
      };

      drawSummaryRow("Total Members:", memberCount.toString());
      drawSummaryRow("Total Collected:", formatCurrency(totalCollected));
      drawSummaryRow(
        "Active Cycle:",
        hasActiveCycle() ? `Cycle #${activeCycle.cycleNumber}` : "None"
      );
      if (hasActiveCycle() && activeCycle.recipientName) {
        drawSummaryRow("Current Recipient:", activeCycle.recipientName);
      }

      // 3. Payment Statistics Title
      checkPageBreak(30);
      y += 10;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Payment Statistics", 20, y);

      y += 10;
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text(`Cycle #${activeCycle?.cycleNumber || "N/A"} Overview`, 20, y);

      // 4. Pie Chart
      checkPageBreak(80);

      y += 40; // Center Y of pie
      const centerX = 105;
      const centerY = y;
      const radius = 30;

      if (paymentStats.total > 0) {
        let currentAngle = 0;
        const slices = [
          {
            value: paymentStats.paid,
            color: [16, 185, 129] as [number, number, number],
          },
          {
            value: paymentStats.pending,
            color: [245, 158, 11] as [number, number, number],
          },
          {
            value: paymentStats.late,
            color: [239, 68, 68] as [number, number, number],
          },
        ];

        slices.forEach((slice) => {
          if (slice.value > 0) {
            const sliceAngle = (slice.value / paymentStats.total) * 360;
            const endAngle = currentAngle + sliceAngle;
            drawPieSlice(
              centerX,
              centerY,
              radius,
              currentAngle,
              endAngle,
              slice.color
            );
            currentAngle = endAngle;
          }
        });
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.circle(centerX, centerY, radius, "FD");
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(10);
        doc.text("No Data", centerX, centerY, { align: "center" });
      }

      // 5. Breakdown Table
      checkPageBreak(50);
      y += 45; // Space after chart

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Payment Status Breakdown", 20, y);

      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const statusData = [
        { status: "Paid", count: paymentStats.paid, color: [16, 185, 129] },
        {
          status: "Pending",
          count: paymentStats.pending,
          color: [245, 158, 11],
        },
        { status: "Late", count: paymentStats.late, color: [239, 68, 68] },
      ];

      statusData.forEach((item, index) => {
        const rowY = y + index * 15;

        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(20, rowY, 8, 8, "F");
        doc.setTextColor(0, 0, 0);
        doc.text(item.status, 35, rowY + 6);
        doc.text(item.count.toString(), 120, rowY + 6, { align: "right" });
        const percentage =
          paymentStats.total > 0
            ? ((item.count / paymentStats.total) * 100).toFixed(1)
            : "0";
        doc.text(`${percentage}%`, 180, rowY + 6, { align: "right" });
      });
      y += statusData.length * 15;

      // 6. Active Cycle Details
      if (hasActiveCycle()) {
        checkPageBreak(60);

        y += 10;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Active Cycle Details", 20, y);

        y += 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        const cycleDetails = [
          ["Cycle Number:", `#${activeCycle.cycleNumber}`],
          ["Recipient:", activeCycle.recipientName || "Not assigned"],
          [
            "Due Date:",
            activeCycle.dueDate ? formatDate(activeCycle.dueDate) : "Not set",
          ],
          ["Total Amount:", formatCurrency(totalCollected)],
        ];

        cycleDetails.forEach(([label, value]) => {
          doc.text(label, 20, y);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(value, 70, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          y += 8;
        });
      }

      // 7. Footer
      const footerY = 280;

      if (y > footerY - 10) {
        doc.addPage();
      }

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This report was generated by ROSCA System", 105, footerY, {
        align: "center",
      });
      doc.text("All financial information is confidential", 105, footerY + 5, {
        align: "center",
      });

      const fileName = `GroupOverview_${group.name.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);

      toast.dismiss();
      toast.success("PDF report downloaded successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    if (!hasActiveCycle()) {
      toast.error("Cannot mark as paid - no active cycle");
      return;
    }

    const payment =
      activeCyclePayments.find((p) => p._id === paymentId) ||
      recentPayments.find((p) => p._id === paymentId);
    const amountToAdd = payment?.amount || 0;

    try {
      const response = await fetch(
        `/api/groups/${group._id}/payments/${paymentId}/mark-paid`,
        { method: "PUT" }
      );

      if (response.ok) {
        // Optimistic Update
        setActiveCyclePayments((prev) =>
          prev.map((p) =>
            p._id === paymentId
              ? { ...p, status: "paid", paidAt: new Date().toISOString() }
              : p
          )
        );

        // Update Total Collected immediately
        setTotalCollected((prev) => prev + amountToAdd);

        // Refresh data in background
        await fetchOverviewData();
        if (activeCycle) {
          fetchActiveCyclePayments(activeCycle._id);
        }

        toast.success("Payment marked as paid");
      } else {
        toast.error("Failed to update payment");
      }
    } catch (error) {
      toast.error("Failed to update payment");
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    if (!hasActiveCycle()) {
      toast.error("Cannot download receipt - no active cycle");
      return;
    }
    try {
      toast.loading("Generating PDF receipt...");
      const response = await fetch(
        `/api/groups/${group._id}/payments/${paymentId}/receipt`
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to fetch receipt data");
      const data = result.data;
      const doc = new jsPDF();

      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, 210, 40, "F");
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT RECEIPT", 105, 25, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${data.groupName.toUpperCase()} • Cycle #${activeCycle.cycleNumber}`,
        105,
        35,
        { align: "center" }
      );

      let y = 60;
      const leftCol = 20;
      const rightCol = 120;
      const drawRow = (label: string, value: string, isBold = false) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(label, leftCol, y);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(value, rightCol, y);
        doc.setDrawColor(230, 230, 230);
        doc.line(leftCol, y + 3, 190, y + 3);
        y += 12;
      };

      drawRow("Receipt ID", data.receiptId.toUpperCase());
      drawRow("Date Paid", new Date(data.date).toLocaleDateString());
      drawRow("Cycle Number", `#${activeCycle.cycleNumber}`);
      drawRow("Member Name", data.memberName, true);
      drawRow("Mobile Number", data.memberPhone);
      drawRow("Email", data.memberEmail);
      drawRow("Payment Method", data.method);

      y += 5;
      doc.setFillColor(235, 248, 235);
      doc.roundedRect(15, y, 180, 25, 3, 3, "F");
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.text("Total Amount Paid", 25, y + 16);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs. ${data.amount.toLocaleString()}`, 180, y + 16, {
        align: "right",
      });

      doc.setTextColor(0, 128, 0);
      doc.setFontSize(10);
      doc.text("STATUS: PAID & VERIFIED", 105, y + 40, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for your contribution.", 105, 280, {
        align: "center",
      });
      doc.text("Generated by ROSCA System", 105, 285, { align: "center" });

      doc.save(
        `Receipt_Cycle_${activeCycle.cycleNumber}_${data.memberName}.pdf`
      );
      toast.dismiss();
      toast.success("PDF Receipt downloaded");
    } catch (error) {
      toast.dismiss();
      console.error(error);
      toast.error("Could not generate PDF");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={14} className="text-success" />;
      case "pending":
        return <Clock size={14} className="text-accent" />;
      case "late":
        return <XCircle size={14} className="text-error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-success/10 text-success";
      case "pending":
        return "bg-accent/10 text-accent";
      case "late":
        return "bg-error/10 text-error";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    else if (date.toDateString() === yesterday.toDateString())
      return "Yesterday";
    else
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
  };

  const renderCycleStatusWarning = () => {
    const lastCycle = cycles[cycles.length - 1];
    const lastCycleStatus = lastCycle ? getCycleStatus(lastCycle) : null;

    if (cycles.length === 0) {
      return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <PlayCircle className="text-blue-500 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">
                No cycles started yet
              </h4>
              <p className="text-blue-700 text-sm mb-2">
                Start your first cycle to begin collecting payments.
              </p>
              <Link
                href={`/groups/${group._id}?tab=cycles`}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Go to Cycle Management →
              </Link>
            </div>
          </div>
        </div>
      );
    } else if (!hasActiveCycle()) {
      if (lastCycleStatus === "skipped") {
        return (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <PauseCircle className="text-orange-500 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-orange-800 mb-1">
                  Cycle Skipped
                </h4>
                <p className="text-orange-700 text-sm mb-2">
                  The current cycle is skipped. No payments can be collected or
                  tracked. Start an upcoming cycle to collect payments.
                </p>
                <Link
                  href={`/groups/${group._id}?tab=cycles`}
                  className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800 text-sm font-medium"
                >
                  Start Upcoming Cycle →
                </Link>
              </div>
            </div>
          </div>
        );
      } else if (lastCycleStatus === "completed") {
        return (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-500 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-green-800 mb-1">
                  Cycle Completed
                </h4>
                <p className="text-green-700 text-sm mb-2">
                  Start the next cycle to continue collecting payments.
                </p>
                <Link
                  href={`/groups/${group._id}?tab=cycles`}
                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Start Next Cycle →
                </Link>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">
                  No Active Cycle
                </h4>
                <p className="text-yellow-700 text-sm mb-2">
                  Check cycle management to start or activate a cycle. Payments
                  are disabled until a cycle is active.
                </p>
                <Link
                  href={`/groups/${group._id}?tab=cycles`}
                  className="inline-flex items-center gap-1 text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                >
                  Go to Cycle Management →
                </Link>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const overviewStats = [
    {
      title: "Total Collected",
      value: formatCurrency(totalCollected),
      change: totalCollected > 0 ? "+12.5%" : "No data",
      trend: totalCollected > 0 ? "up" : "neutral",
      icon: <DollarSign className="text-success" size={20} />,
    },
    {
      title: "Active Members",
      value: `${stats.activeMembers}/${memberCount}`,
      change:
        memberCount - stats.activeMembers > 0
          ? `${memberCount - stats.activeMembers} pending`
          : "All active",
      trend: stats.activeMembers === memberCount ? "up" : "neutral",
      icon: <Users className="text-primary" size={20} />,
    },
    {
      title: "Active Cycle",
      value: hasActiveCycle() ? `Cycle #${activeCycle.cycleNumber}` : "None",
      change: hasActiveCycle()
        ? `${activeCycle.recipientName || "Not assigned"} to receive`
        : "No active cycle",
      trend: hasActiveCycle() ? "up" : "neutral",
      icon: <Hash className="text-accent" size={20} />,
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      change: stats.completionRate > 0 ? "+3% from last" : "No data",
      trend: stats.completionRate > 0 ? "up" : "neutral",
      icon: <TrendingUp className="text-secondary" size={20} />,
    },
  ];

  const paymentStats = getPaymentStats();

  if (loading && !recentPayments.length) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Group Overview</h2>
          <p className="text-text/60">
            Summary and quick actions for your group
            <span className="text-xs text-text/40 ml-2 block sm:inline mt-1 sm:mt-0">
              Last updated:{" "}
              {lastRefreshed.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            fetchOverviewData();
            fetchCycles();
          }}
          disabled={loading}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors self-end sm:self-auto"
          title="Refresh data"
        >
          <RefreshCw
            size={18}
            className={`text-text/60 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {!hasActiveCycle() && renderCycleStatusWarning()}

      {/* Overview Cards - Smart Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">{stat.icon}</div>
              <div
                className={`flex items-center text-sm ${
                  stat.trend === "up"
                    ? "text-success"
                    : stat.trend === "down"
                    ? "text-error"
                    : "text-text/60"
                }`}
              >
                {stat.trend === "up" && <ArrowUpRight size={16} />}
                {stat.trend === "down" && <ArrowDownRight size={16} />}
                <span className="truncate max-w-[100px] text-right">
                  {stat.change}
                </span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-text mb-1 truncate">
              {stat.value}
            </div>
            <div className="text-sm text-text/60">{stat.title}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Updated Payment Trends with Pie Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <h3 className="text-lg font-bold text-text">Payment Trends</h3>
                <p className="text-text/60 text-sm">
                  {hasActiveCycle()
                    ? `Cycle #${activeCycle.cycleNumber} Analysis`
                    : "Payment status overview"}
                </p>
              </div>
              {/* Download button visible to ALL users */}
              <button
                onClick={handleGeneratePDFReport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium w-full sm:w-auto"
                title="Download PDF Report"
              >
                <Download size={16} />
                Download Report
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              {/* Pie Chart Section */}
              <div className="flex-1 w-full">
                <div className="mb-4 text-center">
                  <h4 className="font-semibold text-text mb-2">
                    Payment Distribution
                  </h4>
                  {hasActiveCycle() && (
                    <p className="text-sm text-text/60">
                      Cycle #{activeCycle.cycleNumber}
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <PaymentPieChart data={paymentStats} />
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success shrink-0"></div>
                    <span className="text-sm text-text/60">
                      Paid ({paymentStats.paid})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent shrink-0"></div>
                    <span className="text-sm text-text/60">
                      Pending ({paymentStats.pending})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error shrink-0"></div>
                    <span className="text-sm text-text/60">
                      Late ({paymentStats.late})
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics Section */}
              <div className="flex-1 w-full">
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-sm font-medium text-primary mb-2">
                      Cycle Summary
                    </div>
                    <div className="text-xs text-primary/70 space-y-1">
                      {hasActiveCycle() ? (
                        <>
                          <div className="flex justify-between">
                            <span>Cycle:</span>
                            <span className="font-semibold">
                              #{activeCycle.cycleNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recipient:</span>
                            <span className="font-semibold truncate max-w-[150px]">
                              {activeCycle.recipientName || "Not assigned"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Due:</span>
                            <span className="font-semibold">
                              {activeCycle.dueDate
                                ? formatDate(activeCycle.dueDate)
                                : "Not set"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div>No active cycle</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center p-2 sm:p-3 bg-success/10 rounded-lg border border-success/20">
                      <div className="text-xl sm:text-2xl font-bold text-success mb-1">
                        {paymentStats.paid}
                      </div>
                      <div className="text-[10px] sm:text-xs text-success font-medium">
                        Paid
                      </div>
                      <div className="text-[10px] sm:text-xs text-success/70 mt-1">
                        {paymentStats.total > 0
                          ? (
                              (paymentStats.paid / paymentStats.total) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="text-xl sm:text-2xl font-bold text-accent mb-1">
                        {paymentStats.pending}
                      </div>
                      <div className="text-[10px] sm:text-xs text-accent font-medium">
                        Pending
                      </div>
                      <div className="text-[10px] sm:text-xs text-accent/70 mt-1">
                        {paymentStats.total > 0
                          ? (
                              (paymentStats.pending / paymentStats.total) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-error/10 rounded-lg border border-error/20">
                      <div className="text-xl sm:text-2xl font-bold text-error mb-1">
                        {paymentStats.late}
                      </div>
                      <div className="text-[10px] sm:text-xs text-error font-medium">
                        Late
                      </div>
                      <div className="text-[10px] sm:text-xs text-error/70 mt-1">
                        {paymentStats.total > 0
                          ? (
                              (paymentStats.late / paymentStats.total) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-text mb-2">
                      Collection Progress
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-success h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            paymentStats.total > 0
                              ? (paymentStats.paid / paymentStats.total) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs text-text/60 mt-2">
                      <span>Col: {paymentStats.paid}</span>
                      <span>
                        Rem: {paymentStats.pending + paymentStats.late}
                      </span>
                      <span>Tot: {paymentStats.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-text/60">
                <p className="mb-2 font-medium">📊 Report Includes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-text/60 rounded-full"></span>
                    Group summary
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-text/60 rounded-full"></span>
                    Payment charts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-text/60 rounded-full"></span>
                    Status breakdown
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-text/60 rounded-full"></span>
                    Active cycle info
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Upcoming Draws */}
        <div className="space-y-6">
          {/* Upcoming Draws */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text">Upcoming Draws</h3>
              <Link
                href={`/groups/${group._id}?tab=cycles`}
                className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingDraws.length > 0 ? (
                upcomingDraws.map((draw) => (
                  <div
                    key={draw._id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2 text-sm sm:text-base">
                          <Hash size={12} className="text-text/60 shrink-0" />
                          Cycle #{draw.cycleNumber}
                        </div>
                        <div className="text-xs sm:text-sm text-text/60 truncate max-w-[120px] sm:max-w-[150px]">
                          {draw.recipientName || "Unknown Member"}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${
                          draw.status === "upcoming"
                            ? "bg-accent/10 text-accent"
                            : draw.status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {draw.status}
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-text">
                      {formatCurrency(draw.amount)}
                    </div>
                    <div className="text-xs sm:text-sm text-text/60 mt-1">
                      Due: {draw.dueDate ? formatDate(draw.dueDate) : "N/A"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-text/60">
                  <Calendar
                    size={24}
                    className="mx-auto mb-2 text-text/40"
                  />
                  <p className="text-sm">No upcoming draws scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔒 Recent Payments - SMART RESPONSIVE TABLE (Cards on mobile, Table on Desktop) */}
      {hasActiveCycle() && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h3 className="text-lg font-bold text-text">
                Cycle #{activeCycle.cycleNumber} Payments
              </h3>
              <p className="text-text/60 text-sm">
                Payment activities for current cycle
              </p>
            </div>
            <Link
              href={`/groups/${group._id}?tab=payments`}
              className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors"
            >
              View All →
            </Link>
          </div>

          {getActiveCyclePayments().length > 0 ? (
            <>
              {/* DESKTOP VIEW: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Member
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Cycle
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Amount
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Date
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Status
                      </th>
                      <th className="text-left py-3 text-sm font-medium text-text/60">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getActiveCyclePayments().map((payment) => {
                      const isPaymentOwner = isCurrentUser(
                        payment.userId?._id
                      );
                      const canViewThisReceipt = canViewReceipt(payment);

                      return (
                        <tr
                          key={payment._id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3">
                            <div className="font-medium">
                              {payment.memberName ||
                                payment.userId?.name ||
                                "Unknown"}
                            </div>
                            <div className="text-xs text-text/60">
                              {payment.userId?.phone || "No phone"}
                              {isPaymentOwner && (
                                <span className="ml-2 text-primary text-xs font-bold">
                                  (You)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Hash size={12} className="text-text/60" />
                              <span className="font-medium text-primary">
                                #{activeCycle.cycleNumber}
                              </span>
                              {activeCycle.recipientId ===
                                payment.userId?._id && (
                                <span className="text-xs text-success ml-2">
                                  (Recipient)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 font-medium">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="py-3 text-text/60">
                            {payment.paidAt
                              ? formatDate(payment.paidAt)
                              : payment.dueDate
                              ? formatDate(payment.dueDate)
                              : "N/A"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${getStatusColor(
                                payment.status
                              )}`}
                            >
                              {getStatusIcon(payment.status)}
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {payment.status === "paid" ? (
                              canViewThisReceipt ? (
                                <button
                                  onClick={() =>
                                    handleDownloadReceipt(payment._id)
                                  }
                                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 transition-colors flex items-center gap-1"
                                >
                                  <Download size={12} />
                                  Receipt
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded text-gray-600 text-sm">
                                  <EyeOff size={12} className="text-gray-400" />
                                  <span>Read Only</span>
                                </div>
                              )
                            ) : canManagePayments ? (
                              <button
                                onClick={() => handleMarkAsPaid(payment._id)}
                                className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark transition-colors"
                              >
                                Mark Paid
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded text-gray-600 text-sm">
                                <EyeOff size={12} className="text-gray-400" />
                                <span>Read Only</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW: Cards */}
              <div className="md:hidden space-y-3">
                {getActiveCyclePayments().map((payment) => {
                  const isPaymentOwner = isCurrentUser(payment.userId?._id);
                  const canViewThisReceipt = canViewReceipt(payment);

                  return (
                    <div
                      key={payment._id}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50/30"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {payment.memberName ||
                              payment.userId?.name ||
                              "Unknown"}
                            {isPaymentOwner && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text/60">
                            {payment.userId?.phone}
                          </div>
                        </div>
                        <div className="font-bold text-sm">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs mb-3">
                        <div className="flex items-center gap-2 text-text/60">
                          <span>
                            Date:{" "}
                            {payment.paidAt
                              ? formatDate(payment.paidAt)
                              : payment.dueDate
                              ? formatDate(payment.dueDate)
                              : "N/A"}
                          </span>
                          {activeCycle.recipientId ===
                            payment.userId?._id && (
                            <span className="text-success font-medium">
                              • Recipient
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(
                            payment.status
                          )}`}
                        >
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        {payment.status === "paid" ? (
                          canViewThisReceipt ? (
                            <button
                              onClick={() => handleDownloadReceipt(payment._id)}
                              className="w-full sm:w-auto px-3 py-1.5 bg-blue-100 text-blue-600 rounded text-xs font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <Download size={14} />
                              Download Receipt
                            </button>
                          ) : (
                            <div className="w-full text-center py-1 bg-gray-100 rounded text-gray-500 text-xs flex items-center justify-center gap-1">
                              <EyeOff size={12} /> Read Only
                            </div>
                          )
                        ) : canManagePayments ? (
                          <button
                            onClick={() => handleMarkAsPaid(payment._id)}
                            className="w-full sm:w-auto px-4 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary-dark transition-colors"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <div className="w-full text-center py-1 bg-gray-100 rounded text-gray-500 text-xs flex items-center justify-center gap-1">
                            <EyeOff size={12} /> Read Only
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <DollarSign size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-text/60">
                No payments yet for Cycle #{activeCycle.cycleNumber}
              </p>
              <p className="text-sm text-text/40 mt-1">
                Payments will appear here once members start contributing
              </p>
              <button
                onClick={handleSendReminder}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium w-full sm:w-auto"
              >
                Send Payment Reminders
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🔒 Show message if no active cycle (instead of payments table) */}
      {!hasActiveCycle() && cycles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <PauseCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">
            Payments Temporarily Disabled
          </h3>
          <p className="text-text/60 mb-4 max-w-md mx-auto">
            Payments can only be tracked and managed when there's an active
            cycle. Please start or activate a cycle to continue collecting
            payments.
          </p>
          <Link
            href={`/groups/${group._id}?tab=cycles`}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            <PlayCircle size={16} />
            Go to Cycle Management
          </Link>
        </div>
      )}
    </div>
  );
}