"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ IMPORT ROUTER
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  PlayCircle,
  PauseCircle,
  TrendingUp,
  Download,
  Loader2,
  RefreshCw,
  Zap,
  Trophy,
  FileText,
  Receipt,
  AlertTriangle // ✅ Imported AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface CycleManagementProps {
  groupId: string;
  canManage?: boolean;
  currentCycle?: any;
  members?: any[];
}

type CycleStatus = "completed" | "active" | "upcoming" | "skipped";

export default function CycleManagement({ 
  groupId, 
  canManage = false,
  members = [] 
}: CycleManagementProps) {
  const router = useRouter(); // ✅ INITIALIZE ROUTER
  const [cycles, setCycles] = useState<any[]>([]);
  const [groupDuration, setGroupDuration] = useState<number>(0); 
  const [groupName, setGroupName] = useState<string>("ROSCA Group"); 
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchCycles();
  }, [groupId]);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/groups/${groupId}/cycles?t=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cycles");
      }

      const data = await response.json();
      setCycles(data.cycles || []);
      setGroupDuration(data.totalDuration || 0); 
      setGroupName(data.groupName || "ROSCA Group"); 

      const activeCycle = data.cycles.find(
        (c: any) => getCycleStatus(c) === "active"
      );
      const upcomingCycle = data.cycles.find(
        (c: any) => getCycleStatus(c) === "upcoming"
      );
      
      setSelectedCycle(
        activeCycle || upcomingCycle || data.cycles[0] || null
      );
    } catch (error) {
      toast.error("Failed to load cycles");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCycle = async (cycleId: string) => {
    if (!canManage) return; 
    if (!confirm("Are you sure you want to complete this cycle?")) return;

    try {
      setProcessing(cycleId);

      const response = await fetch(
        `/api/groups/${groupId}/cycles/${cycleId}/complete`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          toast.error(data.message || data.error);
        } else {
          toast.error("Failed to complete cycle");
        }
        return;
      }

      // ✅ FIX: Refresh the page data so the Group Header updates immediately
      router.refresh(); 

      await fetchCycles();
      toast.success(data.message || "Cycle completed successfully!");
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  const handleSkipCycle = async (cycleId: string) => {
    if (!canManage) return;
    const cycle = cycles.find((c) => c._id === cycleId);
    if (!cycle) return;

    if (
      confirm(
        `Skip cycle ${cycle.cycleNumber}? The recipient will receive money later.`
      )
    ) {
      try {
        setProcessing(cycleId);

        const response = await fetch(
          `/api/groups/${groupId}/cycles/${cycleId}/skip`,
          { method: "POST" }
        );

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Failed to skip cycle");
          return;
        }

        router.refresh(); 
        await fetchCycles();
        toast.success(`Cycle ${cycle.cycleNumber} skipped`);
      } catch (error) {
        toast.error("Failed to skip cycle");
      } finally {
        setProcessing(null);
      }
    }
  };

  const handleUnskipCycle = async (cycleId: string) => {
    if (!canManage) return;
    const activeCycle = cycles.find((c) => getCycleStatus(c) === "active");

    let confirmMessage =
      "Reactivate this cycle? You will be able to collect payments again.";

    if (activeCycle) {
      confirmMessage = `⚠️ Cycle #${activeCycle.cycleNumber} is currently running.\n\nIf you reactivate this old cycle, Cycle #${activeCycle.cycleNumber} will be SKIPPED automatically.\n\nDo you want to proceed?`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      setProcessing(cycleId);

      const response = await fetch(
        `/api/groups/${groupId}/cycles/${cycleId}/unskip`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to unskip cycle");
        return;
      }

      router.refresh(); 
      await fetchCycles();
      toast.success(data.message || "Cycle reactivated!");
    } catch (error) {
      toast.error("Failed to unskip cycle");
    } finally {
      setProcessing(null);
    }
  };

  const handleActivateCycle = async (cycleId: string) => {
    if (!canManage) return;
    const cycle = cycles.find((c) => c._id === cycleId);
    if (!cycle) return;

    if (!confirm(`Activate Cycle ${cycle.cycleNumber}? This will make it active and start collecting payments.`)) return;

    try {
      setProcessing(cycleId);

      const response = await fetch(
        `/api/groups/${groupId}/cycles/${cycleId}/activate`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to activate cycle");
        return;
      }

      router.refresh(); 
      await fetchCycles();
      toast.success(`Cycle ${cycle.cycleNumber} activated!`);
    } catch (error) {
      toast.error("Failed to activate cycle");
    } finally {
      setProcessing(null);
    }
  };

  const handleStartNextCycle = async () => {
    if (!canManage) return;
    try {
      setProcessing("next");
      
      const response = await fetch(`/api/groups/${groupId}/cycles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: new Date().toISOString().split("T")[0],
          isUpcomingCycle: false, 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          toast.error(data.error || data.message || "Failed to start cycle");
          await fetchCycles();
          return;
        }
        throw new Error("Failed to start next cycle");
      }

      router.refresh(); 
      await fetchCycles();
      toast.success("Next cycle started successfully!");
    } catch (error: any) {
      console.error("Start cycle error:", error);
      toast.error(error.message || "Failed to start next cycle");
    } finally {
      setProcessing(null);
    }
  };

  const handleStartUpcomingCycle = async () => {
    if (!canManage) return;
    try {
      setProcessing("upcoming");
      
      const response = await fetch(`/api/groups/${groupId}/cycles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: new Date().toISOString().split("T")[0],
          isUpcomingCycle: true, 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          toast.error(data.error || data.message || "Failed to start upcoming cycle");
          await fetchCycles();
          return;
        }
        throw new Error("Failed to start upcoming cycle");
      }

      router.refresh(); 
      await fetchCycles();
      toast.success("Upcoming cycle created! Click 'Let's Active' to activate it.");
    } catch (error: any) {
      console.error("Start upcoming cycle error:", error);
      toast.error(error.message || "Failed to start upcoming cycle");
    } finally {
      setProcessing(null);
    }
  };

  const handleExportSchedule = async () => {
    if (!canManage) {
      toast.error("Only group leader can export schedule");
      return;
    }

    if (!isTimelineFull()) {
      toast.error("Export schedule is only available when all cycles are completed");
      return;
    }

    try {
      setGeneratingPDF(true);
      toast.loading("Generating cycle schedule PDF...");

      const doc = new jsPDF();
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("COMPLETE CYCLE SCHEDULE", 105, 18, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text(`Group: ${groupName} • Generated: ${new Date().toLocaleDateString()}`, 105, 25, { align: "center" });
      
      let y = 40;
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("GROUP SUMMARY", 20, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      
      doc.text(`Group Name: ${groupName}`, 20, y);
      y += 7;
      doc.text(`Total Cycles: ${stats.totalCycles}`, 20, y);
      y += 7;
      doc.text(`Completed Cycles: ${stats.completedCycles}`, 20, y);
      y += 7;
      doc.text(`Skipped Cycles: ${stats.skippedCycles}`, 20, y);
      y += 7;
      doc.text(`Total Distributed: ₹${stats.totalDistributed.toLocaleString()}`, 20, y);
      
      y += 15;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("CYCLE DETAILS", 20, y);
      
      y += 10;
      
      const tableData = cycles.map(cycle => {
        const status = getCycleStatus(cycle);
        const recipientName = getRecipientName(cycle);
        const amount = cycle.amount || 0;
        const dueDate = cycle.dueDate ? new Date(cycle.dueDate).toLocaleDateString() : 'N/A';
        const completedDate = cycle.completedAt ? new Date(cycle.completedAt).toLocaleDateString() : 'N/A';
        
        return [
          `#${cycle.cycleNumber}`,
          recipientName,
          `₹${amount.toLocaleString()}`,
          status.charAt(0).toUpperCase() + status.slice(1),
          dueDate,
          completedDate
        ];
      });
      
      autoTable(doc, {
        startY: y,
        head: [['Cycle', 'Recipient', 'Amount', 'Status', 'Due Date', 'Completed Date']],
        body: tableData,
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY;
      y = finalY + 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("FINAL STATISTICS", 20, y);
      
      y += 15;
      const summaryStats = [
        ["Total Cycles Completed", `${stats.completedCycles} of ${stats.totalCycles}`],
        ["Total Amount Distributed", `₹${stats.totalDistributed.toLocaleString()}`],
        ["Average Per Cycle", `₹${(stats.totalDistributed / stats.completedCycles).toLocaleString()}`],
        ["Success Rate", `${((stats.completedCycles / stats.totalCycles) * 100).toFixed(1)}%`]
      ];
      
      summaryStats.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(label, 20, y);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(59, 130, 246);
        doc.text(value, 100, y);
        
        y += 7;
      });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by ROSCA System • Total Records: ${cycles.length}`, 105, 285, { align: "center" });
      doc.text("All cycles successfully completed!", 105, 290, { align: "center" });
      
      const fileName = `${groupName.replace(/\s+/g, '_')}_Complete_Schedule_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.dismiss();
      toast.success('Schedule PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleGenerateReceipt = async (cycleId: string) => {
    if (!canManage) {
      toast.error("Only group leader can generate receipts");
      return;
    }

    const cycle = cycles.find(c => c._id === cycleId);
    if (!cycle) {
      toast.error("Cycle not found");
      return;
    }

    if (getCycleStatus(cycle) !== "completed") {
      toast.error("Receipt can only be generated for completed cycles");
      return;
    }

    try {
      setGeneratingReceipt(cycleId);
      toast.loading(`Generating receipt for Cycle #${cycle.cycleNumber}...`);

      const recipientName = getRecipientName(cycle);
      const amount = cycle.amount || 0;
      const completedDate = cycle.completedAt ? new Date(cycle.completedAt).toLocaleDateString() : 'N/A';
      const dueDate = cycle.dueDate ? new Date(cycle.dueDate).toLocaleDateString() : 'N/A';
      const receiptId = `REC-${cycle.cycleNumber.toString().padStart(3, '0')}-${cycle._id.slice(-6).toUpperCase()}`;
      
      const doc = new jsPDF();
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("CYCLE COMPLETION RECEIPT", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text(`Group: ${groupName} • Receipt No: ${receiptId}`, 105, 30, { align: "center" });
      
      let y = 55;
      
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, y, 180, 50, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("RECIPIENT DETAILS", 105, y + 10, { align: "center" });
      
      y += 15;
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Name:", 25, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(recipientName, 80, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Cycle Number:", 25, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`#${cycle.cycleNumber}`, 80, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Amount Received:", 25, y);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text(`₹${amount.toLocaleString()}`, 80, y);
      
      y += 20;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("CYCLE INFORMATION", 105, y, { align: "center" });
      
      y += 15;
      const details = [
        ["Due Date", dueDate],
        ["Completed Date", completedDate],
        ["Status", "Completed"],
        ["Payment Verified", "Yes"]
      ];
      
      details.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(label, 25, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(value, 100, y);
        y += 7;
      });
      
      y += 10;
      
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(75, y, 60, 20, 10, 10, 'F');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("COMPLETED", 105, y + 13, { align: "center" });
      
      y += 35;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("This is an official ROSCA completion receipt.", 105, y, { align: "center" });
      y += 5;
      doc.text("Thank you for your participation in the ROSCA group!", 105, y, { align: "center" });
      y += 5;
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, y, { align: "center" });
      
      doc.setFontSize(6);
      doc.setTextColor(200, 200, 200);
      doc.text("Scan QR code to verify receipt", 105, 270, { align: "center" });
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(85, 255, 40, 40);
      doc.text("QR Code", 105, 265, { align: "center" });
      
      const fileName = `Receipt_Cycle_${cycle.cycleNumber}_${recipientName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      
      toast.dismiss();
      toast.success(`Receipt for Cycle #${cycle.cycleNumber} downloaded!`);
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast.dismiss();
      toast.error('Failed to generate receipt');
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const getRecipientName = (cycle: any) => {
    if (!cycle) return "Unknown";
    
    if (members.length > 0) {
      const winner = members.find(m => 
        m._id === cycle.recipientId || 
        m._id === cycle.recipientId?._id ||
        (m.userId && m.userId.toString() === cycle.recipientId?.toString())
      );
      
      if (winner) {
        return winner.name || "Unknown"; 
      }
    }
    
    return cycle.recipientName || cycle.recipientId?.name || "Unknown";
  };

  const getStatusIcon = (status: CycleStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} />;
      case "active":
        return <PlayCircle size={16} />;
      case "upcoming":
        return <Clock size={16} />;
      case "skipped":
        return <PauseCircle size={16} />;
    }
  };

  const getStatusColor = (status: CycleStatus) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "active":
        return "bg-primary/10 text-primary border-primary/20";
      case "upcoming":
        return "bg-accent/10 text-accent border-accent/20";
      case "skipped":
        return "bg-error/10 text-error border-error/20";
    }
  };

  const getCycleStatus = (cycle: any): CycleStatus => {
    if (cycle.status) {
      return cycle.status as CycleStatus;
    }

    if (cycle.isSkipped) {
      return "skipped";
    } else if (cycle.isCompleted) {
      return "completed";
    } else {
      const completedCycles = cycles.filter(
        (c: any) => c.isCompleted && !c.isSkipped
      ).length;
      const skippedCycles = cycles.filter((c: any) => c.isSkipped).length;
      const processedCycles = completedCycles + skippedCycles;

      if (cycle.cycleNumber <= processedCycles + 1) {
        return "active";
      } else {
        return "upcoming";
      }
    }
  };

  // ✅ NEW: Check if cycle timeline is full (processed >= duration)
  const isTimelineFull = () => {
    if (groupDuration === 0) return false;
    
    // Count total PROCESSED (Completed or Skipped)
    const processedCount = cycles.filter(
        (c) => c.status === "completed" || c.status === "skipped" || c.isCompleted || c.isSkipped
    ).length;

    // Check if we've handled as many cycles as possible
    return processedCount >= groupDuration;
  };

  // ✅ NEW: Check for skipped cycles
  const hasSkippedCycles = () => {
    return cycles.some((c) => c.status === "skipped" || c.isSkipped);
  };

  const shouldShowStartNextCycle = () => {
    if (isTimelineFull()) return false; // Stop if duration met

    const hasActiveCycle = cycles.some((c) => getCycleStatus(c) === "active");
    const hasUpcomingCycle = cycles.some(
      (c) => getCycleStatus(c) === "upcoming"
    );
    const lastCycle = cycles[cycles.length - 1];
    const lastCycleCompleted =
      lastCycle && getCycleStatus(lastCycle) === "completed";

    return (
      !hasActiveCycle &&
      !hasUpcomingCycle &&
      cycles.length > 0 &&
      lastCycleCompleted
    );
  };

  const shouldShowStartUpcomingCycle = () => {
    if (isTimelineFull()) return false; // Stop if duration met

    const hasActiveCycle = cycles.some((c) => getCycleStatus(c) === "active");
    const hasUpcomingCycle = cycles.some(
      (c) => getCycleStatus(c) === "upcoming"
    );
    const lastCycle = cycles[cycles.length - 1];
    const lastCycleSkipped =
      lastCycle && getCycleStatus(lastCycle) === "skipped";

    return (
      !hasActiveCycle &&
      !hasUpcomingCycle &&
      cycles.length > 0 &&
      lastCycleSkipped
    );
  };

  const canStartFirstCycle = () => {
    return cycles.length === 0;
  };

  const stats = {
    totalCycles: cycles.length,
    completedCycles: cycles.filter(
      (c) => c.status === "completed" || (c.isCompleted && !c.isSkipped)
    ).length,
    skippedCycles: cycles.filter((c) => c.status === "skipped" || c.isSkipped)
      .length,
    activeCycles: cycles.filter((c) => c.status === "active").length,
    upcomingCycles: cycles.filter((c) => c.status === "upcoming").length,
    totalDistributed: cycles
      .filter(
        (c) => c.status === "completed" || (c.isCompleted && !c.isSkipped)
      )
      .reduce((sum, c) => sum + (c.amount || 0), 0),
    remainingAmount: cycles
      .filter((c) => c.status === "active" || c.status === "upcoming")
      .reduce((sum, c) => sum + (c.amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-text">
            Cycle Management
          </h2>
          <p className="text-text/60 text-sm">
            Manage ROSCA cycles and distributions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCycles}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh cycles"
          >
            <RefreshCw size={18} className="text-text/60" />
          </button>
          
          {canManage && isTimelineFull() && !hasSkippedCycles() && (
            <button 
              onClick={handleExportSchedule}
              disabled={generatingPDF}
              className={`px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors ${
                generatingPDF ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Export complete cycle schedule as PDF"
            >
              {generatingPDF ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span className="hidden xs:inline">Export Schedule</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-text/60">Total Cycles</div>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-text">
            {stats.totalCycles}
          </div>
          <div className="text-xs sm:text-sm text-text/60">
            {/* Show info about remaining or skipped */}
            {isTimelineFull() 
                ? (stats.skippedCycles > 0 ? `${stats.skippedCycles} skipped` : "All processed") 
                : `${groupDuration - (stats.completedCycles + stats.skippedCycles)} remaining`
            }
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-text/60">Distributed</div>
            <DollarSign size={16} className="text-success" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-success">
            ₹{stats.totalDistributed.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-text/60">
            {stats.completedCycles} cycles
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-text/60">Active Cycle</div>
            <PlayCircle size={16} className="text-accent" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-accent">
            {isTimelineFull() 
                ? (hasSkippedCycles() ? "Skipped" : "None") 
                : `#${cycles.find((c) => c.status === "active")?.cycleNumber || "-"}`
            }
          </div>
          <div className="text-xs sm:text-sm text-text/60">
             {isTimelineFull() 
                ? (hasSkippedCycles() ? "Action Needed" : "Group Completed") 
                : "In progress"
             }
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-text/60">Remaining</div>
            <DollarSign size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            ₹{stats.remainingAmount.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-text/60">
            {stats.activeCycles + stats.upcomingCycles} cycles
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:flex-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="font-bold text-text text-lg">Cycles Timeline</h3>

              {canManage && (
                <>
                  {canStartFirstCycle() && (
                    <button
                      onClick={handleStartNextCycle}
                      disabled={processing === "next"}
                      className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-dark flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing === "next" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <PlayCircle size={14} />
                      )}
                      <span>Start First Cycle</span>
                    </button>
                  )}

                  {shouldShowStartNextCycle() && (
                    <button
                      onClick={handleStartNextCycle}
                      disabled={processing === "next"}
                      className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-dark flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing === "next" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <PlayCircle size={14} />
                      )}
                      <span>Start Next Cycle</span>
                    </button>
                  )}

                  {shouldShowStartUpcomingCycle() && (
                    <button
                      onClick={handleStartUpcomingCycle}
                      disabled={processing === "upcoming"}
                      className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-dark flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing === "upcoming" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Clock size={14} />
                      )}
                      <span>Start Upcoming Cycle</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              {cycles.map((cycle) => {
                const status = getCycleStatus(cycle);
                const isProcessing = processing === cycle._id;
                const recipientName = getRecipientName(cycle);

                return (
                  <div
                    key={cycle._id}
                    className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedCycle?._id === cycle._id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-primary/30"
                    }`}
                    onClick={() => setSelectedCycle(cycle)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            status === "completed"
                              ? "bg-success/10"
                              : status === "skipped"
                              ? "bg-error/10"
                              : status === "upcoming"
                              ? "bg-accent/10"
                              : "bg-primary/10"
                          }`}
                        >
                          <span
                            className={`font-bold text-sm sm:text-base ${
                              status === "completed"
                                ? "text-success"
                                : status === "skipped"
                                ? "text-error"
                                : status === "upcoming"
                                ? "text-accent"
                                : "text-primary"
                            }`}
                          >
                            #{cycle.cycleNumber}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {recipientName}
                          </div>
                          <div className="text-xs sm:text-sm text-text/60">
                            {status === "completed"
                              ? `Completed ${new Date(
                                  cycle.completedAt
                                ).toLocaleDateString()}`
                              : status === "skipped"
                              ? `Skipped ${new Date(
                                  cycle.completedAt
                                ).toLocaleDateString()}`
                              : `Due ${new Date(
                                  cycle.dueDate
                                ).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div
                          className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                            status === "completed"
                              ? "bg-success/10 text-success"
                              : status === "skipped"
                              ? "bg-error/10 text-error"
                              : status === "upcoming"
                              ? "bg-accent/10 text-accent"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {getStatusIcon(status)}
                          <span className="capitalize truncate">{status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <div className="text-xs sm:text-sm text-text/60">
                          Amount
                        </div>
                        <div className="font-bold text-sm sm:text-base">
                          ₹{cycle.amount?.toLocaleString() || "0"}
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <>
                        {status === "skipped" ? (
                          <div className="mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnskipCycle(cycle._id);
                              }}
                              disabled={isProcessing}
                              className="w-full px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-dark flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                              Unskip / Reactivate
                            </button>
                          </div>
                        ) : status === "active" ? (
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteCycle(cycle._id);
                              }}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-success text-white rounded text-sm hover:bg-success/90 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle size={14} />
                              )}
                              Mark as Completed
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSkipCycle(cycle._id);
                              }}
                              disabled={isProcessing}
                              className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <PauseCircle size={14} />
                              )}
                              Skip Cycle
                            </button>
                          </div>
                        ) : status === "upcoming" ? (
                          <div className="mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivateCycle(cycle._id);
                              }}
                              disabled={isProcessing}
                              className="w-full px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-dark flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Zap size={14} />
                              )}
                              Let's Active This Cycle
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ✅ BANNER LOGIC: Smart Switch between "Success" and "Warning" */}
            {isTimelineFull() && (
                <div className={`mt-8 mb-4 p-8 border rounded-2xl text-center shadow-sm relative overflow-hidden animate-in fade-in zoom-in duration-500 ${
                    hasSkippedCycles() ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
                }`}>
                    
                    {/* Background decorations */}
                    {!hasSkippedCycles() && (
                        <>
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-200 rounded-full opacity-20 blur-xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-emerald-300 rounded-full opacity-20 blur-xl"></div>
                        </>
                    )}

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 animate-bounce">
                            {hasSkippedCycles() ? (
                                <AlertTriangle className="text-amber-500 w-8 h-8" fill="currentColor" />
                            ) : (
                                <Trophy className="text-yellow-500 w-8 h-8" fill="currentColor" />
                            )}
                        </div>
                        
                        {hasSkippedCycles() ? (
                             <>
                                <h3 className="text-2xl font-bold text-amber-800 mb-2">Cycle Limit Reached</h3>
                                <p className="text-amber-700 max-w-md mx-auto">
                                    You have reached the cycle limit (2/{groupDuration}), but {stats.skippedCycles} cycle(s) were skipped.
                                    <br/><br/>
                                    <strong>Action Needed:</strong> Please unskip and complete the pending cycle(s) to finish the group successfully.
                                </p>
                             </>
                        ) : (
                             <>
                                <h3 className="text-2xl font-bold text-green-800 mb-2">Group Successfully Completed!</h3>
                                <p className="text-green-700 max-w-md mx-auto">
                                    All {stats.totalCycles} cycles have been successfully completed and distributed.
                                    Total cycles are completed in this group.
                                </p>
                             </>
                        )}
                    </div>
                </div>
            )}

            {canManage && shouldShowStartNextCycle() && cycles.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleStartNextCycle}
                  disabled={processing === "next"}
                  className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing === "next" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <PlayCircle size={18} />
                  )}
                  <span>Start Next Cycle</span>
                </button>
              </div>
            )}

            {canManage && shouldShowStartUpcomingCycle() && cycles.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleStartUpcomingCycle}
                  disabled={processing === "upcoming"}
                  className="w-full py-3 bg-accent text-white rounded-lg hover:bg-accent-dark flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing === "upcoming" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Clock size={18} />
                  )}
                  <span>Start Upcoming Cycle</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Selected Cycle Details */}
        <div className="lg:w-96 space-y-6">
          {selectedCycle ? (
            <div className="card">
              <h3 className="font-bold text-text mb-4 text-lg">
                Cycle #{selectedCycle.cycleNumber} Details
              </h3>
              
              {/* ... (Keep existing details panel code) ... */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-text/60 mb-1">Recipient</div>
                  <div className="font-medium text-lg truncate">
                    {getRecipientName(selectedCycle)}
                  </div>
                  <div className="text-sm text-text/60">
                    Will receive the total pool
                  </div>
                </div>

                <div>
                  <div className="text-sm text-text/60 mb-1">Amount</div>
                  <div className="font-bold text-2xl text-primary">
                    ₹{selectedCycle.amount?.toLocaleString() || "0"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-text/60 mb-1">Due Date</div>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar size={14} />
                      <span className="truncate">
                        {new Date(selectedCycle.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-text/60 mb-1">Status</div>
                    <div
                      className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${
                        getCycleStatus(selectedCycle) === "completed"
                          ? "bg-success/10 text-success"
                          : getCycleStatus(selectedCycle) === "skipped"
                          ? "bg-error/10 text-error"
                          : getCycleStatus(selectedCycle) === "upcoming"
                          ? "bg-accent/10 text-accent"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {getStatusIcon(getCycleStatus(selectedCycle))}
                      <span className="capitalize truncate">
                        {getCycleStatus(selectedCycle)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedCycle.completedAt && (
                  <div>
                    <div className="text-sm text-text/60 mb-1">
                      {getCycleStatus(selectedCycle) === "skipped"
                        ? "Skipped On"
                        : "Completed On"}
                    </div>
                    <div className="font-medium">
                      {new Date(selectedCycle.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  {canManage && (
                    <>
                      {getCycleStatus(selectedCycle) === "active" && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleCompleteCycle(selectedCycle._id)}
                            disabled={processing === selectedCycle._id}
                            className="w-full py-2.5 bg-success text-white rounded-lg hover:bg-success/90 text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {processing === selectedCycle._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            Mark as Completed
                          </button>
                          <button
                            onClick={() => handleSkipCycle(selectedCycle._id)}
                            disabled={processing === selectedCycle._id}
                            className="w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {processing === selectedCycle._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <PauseCircle size={16} />
                            )}
                            Skip This Cycle
                          </button>
                        </div>
                      )}

                      {getCycleStatus(selectedCycle) === "skipped" && (
                        <div className="space-y-2">
                          <div className="w-full py-2.5 bg-error/10 text-error rounded-lg text-sm text-center font-medium border border-error/20">
                            Cycle Skipped
                          </div>
                          <button
                            onClick={() => handleUnskipCycle(selectedCycle._id)}
                            disabled={processing === selectedCycle._id}
                            className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {processing === selectedCycle._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                            Unskip / Reactivate
                          </button>
                        </div>
                      )}

                      {getCycleStatus(selectedCycle) === "upcoming" && (
                        <div className="space-y-2">
                          <div className="w-full py-2.5 bg-accent/10 text-accent rounded-lg text-sm text-center font-medium border border-accent/20">
                            Upcoming Cycle
                          </div>
                          <button
                            onClick={() => handleActivateCycle(selectedCycle._id)}
                            disabled={processing === selectedCycle._id}
                            className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-dark text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {processing === selectedCycle._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Zap size={16} />
                            )}
                            Let's Active This Cycle
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {canManage && getCycleStatus(selectedCycle) === "completed" && (
                    <button 
                      onClick={() => handleGenerateReceipt(selectedCycle._id)}
                      disabled={generatingReceipt === selectedCycle._id}
                      className={`w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base flex items-center justify-center gap-2 ${
                        generatingReceipt === selectedCycle._id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {generatingReceipt === selectedCycle._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Receipt size={16} />
                      )}
                      Download Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-8 sm:py-12">
              <Calendar size={40} className="mx-auto text-gray-400 mb-3" />
              <h3 className="font-medium text-text mb-1">Select a Cycle</h3>
              <p className="text-text/60 text-sm">
                Click on any cycle to view details
              </p>
            </div>
          )}

          <div className="card">
            <h4 className="font-medium text-text mb-3">Cycle Status Legend</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  status: "completed",
                  label: "Completed",
                  color: "bg-success",
                  text: "text-success",
                  count: stats.completedCycles,
                },
                {
                  status: "active",
                  label: "Active",
                  color: "bg-primary",
                  text: "text-primary",
                  count: stats.activeCycles,
                },
                {
                  status: "upcoming",
                  label: "Upcoming",
                  color: "bg-accent",
                  text: "text-accent",
                  count: stats.upcomingCycles,
                },
                {
                  status: "skipped",
                  label: "Skipped",

                  color: "bg-error",
                  text: "text-error",
                  count: stats.skippedCycles,
                },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm truncate">{item.label}</span>
                  <div className="flex-1"></div>
                  <span className={`text-xs ${item.text}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}