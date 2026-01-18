'use client';

import { useState } from 'react';
import { 
  CheckCircle, Clock, Smartphone, Download, 
  Edit, Trash2, Building, Layers, Save, X, RotateCcw,
  FileText, DollarSign, AlertCircle, Percent, Eye, Trophy, PauseCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

interface Props {
  groups: any[];
  currentUserId: string;
  onUpdate: () => void;
}

export default function PaymentsTable({ groups, currentUserId, onUpdate }: Props) {
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [methodForm, setMethodForm] = useState('Cash');

  // --- Actions ---

  const handleMarkPaid = async (paymentId: string) => {
    try {
      console.log("Marking payment as paid:", paymentId);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'mark_paid' })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Marked as Paid (Cash)');
        onUpdate();
      } else {
        console.error("API Error response:", data);
        toast.error(data.error || 'Error updating payment');
      }
    } catch (e) { 
      console.error("Network error:", e);
      toast.error('Network error. Please try again.'); 
    }
  };

  const handleUnmarkPaid = async (paymentId: string) => {
    if(!confirm("Are you sure you want to Unmark this payment? It will become Pending.")) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'unmark_paid' })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Unmarked. Status is now Pending.');
        onUpdate();
      } else {
        toast.error(data.error || 'Error updating');
      }
    } catch (e) { 
      toast.error('Network error'); 
    }
  };

  const handleWhatsApp = (p: any, groupName: string, cycleNum: number) => {
    if (!p.memberPhone) return toast.error('No phone number available');
    const text = `Hello ${p.memberName}, please pay ₹${p.amount} for Cycle ${cycleNum} of ${groupName}.`;
    const url = `https://wa.me/${p.memberPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (paymentId: string) => {
    if(!confirm('This will permanently delete this payment record. Continue?')) return;
    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Payment record deleted');
        onUpdate();
      } else {
        toast.error(data.error);
      }
    } catch (e) { 
      toast.error('Error deleting'); 
    }
  };

  const handleEditMethod = async () => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId: editingPayment.id, 
          action: 'update_method', 
          method: methodForm 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Method updated');
        setEditingPayment(null);
        onUpdate();
      } else {
        toast.error(data.error || 'Error');
      }
    } catch (e) { 
      toast.error('Network error'); 
    }
  };

  const generateReceipt = (p: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(30, 58, 138);
    doc.text('PAYMENT RECEIPT', 105, 25, { align: 'center' });
    
    // Receipt details box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 35, 180, 80, 3, 3);
    
    // Receipt number and date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Receipt No: RCT-${Date.now().toString().slice(-8)}`, 20, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 59);
    
    // Member details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Member Name: ${p.memberName}`, 20, 75);
    doc.text(`Amount: ₹${p.amount.toLocaleString('en-IN')}`, 20, 85);
    doc.text(`Status: ${p.status.toUpperCase()}`, 20, 95);
    doc.text(`Payment Method: ${p.method}`, 20, 105);
    
    // Separator line
    doc.line(15, 120, 195, 120);
    
    // Footer note
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('This is an official receipt for payment made.', 105, 130, { align: 'center' });
    doc.text('Thank you for your payment!', 105, 137, { align: 'center' });
    
    // Stamp area
    doc.setDrawColor(255, 0, 0);
    doc.setLineWidth(0.3);
    doc.ellipse(160, 150, 20, 10);
    doc.setFontSize(8);
    doc.setTextColor(255, 0, 0);
    doc.text('PAID', 160, 147, { align: 'center' });
    doc.text(new Date().toLocaleDateString(), 160, 153, { align: 'center' });
    
    // Save PDF
    doc.save(`receipt-${p.memberName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success(`Receipt for ${p.memberName} downloaded!`);
  };

  const handleDownloadReceipt = (p: any) => {
    generateReceipt(p);
  };

  const generateGroupReport = (groupName: string, groupData: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('GROUP PAYMENT REPORT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Group: ${groupName}`, 15, 35);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 42);
    doc.text(`Generated By: Leader/Sub-Leader`, 15, 49);
    
    // Summary section - Calculate from REAL data
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text('Summary Statistics', 15, 65);
    
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let totalMembers = new Set();
    
    groupData?.cycles.forEach((cycle: any) => {
      cycle.payments.forEach((p: any) => {
        totalMembers.add(p.userId);
        if (p.status === 'paid') {
          totalPaid += p.amount;
          paidCount++;
        } else {
          totalPending += p.amount;
          pendingCount++;
        }
      });
    });
    
    const completionRate = totalPaid + totalPending > 0 
      ? Math.round((totalPaid / (totalPaid + totalPending)) * 100) 
      : 0;
    
    // Create summary table manually
    let startY = 70;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const summaryData = [
      ['Total Members', totalMembers.size.toString()],
      ['Total Collected', `₹${totalPaid.toLocaleString('en-IN')}`],
      ['Total Pending', `₹${totalPending.toLocaleString('en-IN')}`],
      ['Paid Payments', paidCount.toString()],
      ['Pending Payments', pendingCount.toString()],
      ['Completion Rate', `${completionRate}%`],
    ];
    
    // Draw summary table
    doc.setFillColor(30, 58, 138);
    doc.rect(15, startY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Metric', 20, startY + 5.5);
    doc.text('Value', 140, startY + 5.5);
    
    startY += 8;
    doc.setTextColor(0, 0, 0);
    
    summaryData.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? [240, 240, 240] : [255, 255, 255];
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(15, startY, 180, 8, 'F');
      doc.text(row[0], 20, startY + 5.5);
      doc.text(row[1], 140, startY + 5.5);
      startY += 8;
    });
    
    // Detailed payments section
    startY += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text('Detailed Payment Records', 15, startY);
    
    startY += 10;
    
    groupData?.cycles.forEach((cycle: any) => {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Cycle ${cycle.cycleNumber}`, 15, startY);
      
      startY += 8;
      
      // Create table header for cycle
      doc.setFillColor(59, 130, 246);
      doc.rect(15, startY, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Member', 20, startY + 5.5);
      doc.text('Amount', 60, startY + 5.5);
      doc.text('Status', 90, startY + 5.5);
      doc.text('Method', 120, startY + 5.5);
      doc.text('Role', 150, startY + 5.5);
      doc.text('Paid Date', 170, startY + 5.5);
      
      startY += 8;
      doc.setTextColor(0, 0, 0);
      
      cycle.payments.forEach((p: any, index: number) => {
        const bgColor = index % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(15, startY, 180, 8, 'F');
        
        doc.text(p.memberName.substring(0, 15), 20, startY + 5.5);
        doc.text(`₹${p.amount.toLocaleString('en-IN')}`, 60, startY + 5.5);
        doc.text(p.status.toUpperCase(), 90, startY + 5.5);
        doc.text(p.method || '-', 120, startY + 5.5);
        doc.text(p.userId === currentUserId ? 'You' : 'Member', 150, startY + 5.5);
        doc.text(p.status === 'paid' ? new Date(p.paidDate || new Date()).toLocaleDateString() : '--', 170, startY + 5.5);
        
        startY += 8;
      });
      
      startY += 10;
    });
    
    // Add footer
    const pageCount = doc.internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('Confidential - ROSCA Group Report', 195, 285, { align: 'right' });
    }
    
    // Save PDF
    doc.save(`group-report-${groupName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success(`Group report for ${groupName} downloaded!`);
  };

  const handleGroupExport = (groupName: string, groupId: string) => {
    const groupData = groups.find(g => g.groupId === groupId);
    if (!groupData) {
      toast.error('Group data not found');
      return;
    }
    
    generateGroupReport(groupName, groupData);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Calculate group statistics (FIXED: Skip counting skipped cycles)
  const calculateGroupStats = (group: any) => {
    let totalCollected = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let totalCount = 0;
    
    group.cycles.forEach((cycle: any) => {
      // ✅ Skip counting skipped cycles in totals
      if (cycle.isSkipped) return;

      cycle.payments.forEach((p: any) => {
        totalCount++;
        if (p.status === 'paid') {
          totalCollected += p.amount;
          paidCount++;
        } else {
          totalPending += p.amount;
          pendingCount++;
        }
      });
    });
    
    const completionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
    
    return {
      totalCollected,
      totalPending,
      paidCount,
      pendingCount,
      totalCount,
      completionRate
    };
  };

  // --- Render ---

  if (groups.length === 0) return <div className="text-center py-8 md:py-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm text-sm md:text-base">No payments found matching your criteria.</div>;

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {groups.map((group) => {
        const stats = calculateGroupStats(group);
        // ✅ Check if Group is Completed (from Gemini update)
        const isGroupCompleted = group.isGroupCompleted;
        
        return (
          <div key={group.groupId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            
            {/* 1. Group Header */}
            <div className="bg-white px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 lg:p-2.5 bg-[#1e3a8a] rounded-lg text-white shadow-sm">
                  <div className="hidden lg:block">
                    <Building size={20} />
                  </div>
                  <div className="hidden md:block lg:hidden">
                    <Building size={18} />
                  </div>
                  <div className="md:hidden">
                    <Building size={16} />
                  </div>
                </div>
                <div>
                  <h2 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                    {group.groupName}
                    {/* ✅ Show Trophy if Completed (from Gemini update) */}
                    {isGroupCompleted && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-green-200">
                        <Trophy size={12} /> Completed
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-1 md:gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Role:</span>
                    <span className={`text-xs px-1.5 md:px-2 py-0.5 rounded font-bold uppercase ${
                      group.myRole === 'leader' ? 'bg-amber-100 text-amber-700' : 
                      group.myRole === 'sub_leader' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {group.myRole === 'leader' ? 'Leader' : group.myRole === 'sub_leader' ? 'Sub-Leader' : 'Member'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 md:gap-2 self-end sm:self-auto">
                {/* Group Export Button - Visible only for leaders and sub-leaders */}
                {(group.myRole === 'leader' || group.myRole === 'sub_leader') && (
                  <button 
                    onClick={() => handleGroupExport(group.groupName, group.groupId)}
                    className="text-xs md:text-sm flex items-center gap-1 md:gap-2 text-gray-600 hover:text-primary px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 rounded-lg hover:bg-gray-50 border border-gray-200 transition-all font-medium"
                  >
                    <div className="hidden md:block">
                      <FileText size={16} />
                    </div>
                    <div className="md:hidden">
                      <FileText size={14} />
                    </div>
                    <span className="hidden sm:inline">Export Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* ✅ Show Message if Group is Completed (from Gemini update) */}
            {isGroupCompleted && (
              <div className="bg-green-50 border-b border-green-100 p-3 text-center text-sm text-green-800 font-medium">
                🎉 This group has completed all cycles. Payments are now locked.
              </div>
            )}

            {/* PAYMENTS LIST */}
            <div className="p-0">
              {group.cycles.map((cycle: any) => (
                <div key={cycle.cycleNumber} className="border-b border-gray-100 last:border-0">
                  
                  {/* 2. Cycle Sub-heading */}
                  <div className="bg-slate-50 px-3 md:px-4 lg:px-6 py-2 md:py-3 border-y border-gray-200 flex items-center gap-2 md:gap-3">
                    <div className="bg-white p-1 md:p-1.5 rounded border border-gray-300 shadow-sm">
                      <div className="hidden md:block">
                        <Layers size={16} className="text-slate-700" />
                      </div>
                      <div className="md:hidden">
                        <Layers size={14} className="text-slate-700" />
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                      Cycle #{cycle.cycleNumber}
                      {/* ✅ Show Skipped Tag (from Gemini update) */}
                      {cycle.isSkipped && (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs border border-red-200">
                          SKIPPED
                        </span>
                      )}
                    </span>
                  </div>

                  {/* ✅ CHECK IF CYCLE IS SKIPPED (from Gemini update) */}
                  {cycle.isSkipped ? (
                    <div className="p-6 text-center text-gray-500 bg-white">
                      <PauseCircle className="mx-auto mb-2 text-gray-300" size={32} />
                      <p>This cycle was skipped. No payments recorded.</p>
                    </div>
                  ) : (
                    /* 3. Table Container with Custom Scrollbar */
                    <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
                      <table className="w-full text-left min-w-[480px] md:min-w-[640px]">
                        <thead>
                          <tr className="text-xs text-gray-500 bg-white border-b border-gray-100">
                            {/* Dense padding on mobile */}
                            <th className="px-3 py-2 md:px-4 md:py-4 lg:px-6 font-medium uppercase tracking-wider">Member</th>
                            <th className="px-3 py-2 md:px-4 md:py-4 lg:px-6 font-medium uppercase tracking-wider hidden sm:table-cell">Amount</th>
                            <th className="px-3 py-2 md:px-4 md:py-4 lg:px-6 font-medium uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2 md:px-4 md:py-4 lg:px-6 font-medium uppercase tracking-wider hidden md:table-cell">Method</th>
                            <th className="px-3 py-2 md:px-4 md:py-4 lg:px-6 font-medium uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-50">
                          {cycle.payments.map((p: any) => {
                            const isMe = p.userId === currentUserId;
                            const isLeader = group.myRole === 'leader';
                            const isSubLeader = group.myRole === 'sub_leader';
                            
                            // Check if this row should have any action buttons
                            // ✅ DISABLE ACTIONS IF GROUP IS COMPLETED (from Gemini update)
                            const hasActions = !isGroupCompleted && (isLeader || (isMe && p.status === 'paid'));
                            
                            return (
                              <tr key={p.id} className={`transition-colors ${isMe ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                                
                                {/* Member Name */}
                                <td className="px-3 py-2.5 md:px-4 md:py-4 lg:px-6">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1 md:gap-2">
                                      <span className={`font-semibold text-xs md:text-sm lg:text-base ${isMe ? 'text-[#1e3a8a]' : 'text-gray-900'}`}>
                                        {p.memberName}
                                      </span>
                                      {isMe && (
                                        <span className="text-[9px] md:text-[10px] font-extrabold bg-[#1e3a8a] text-white px-1 py-0.5 rounded shadow-sm">
                                          YOU
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 md:gap-2 mt-0.5">
                                      <span className="text-xs font-medium text-gray-700 sm:hidden">₹{p.amount.toLocaleString('en-IN')}</span>
                                      <span className="text-[10px] md:text-xs text-gray-400">{p.memberPhone || 'No phone'}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Amount - Hidden on mobile */}
                                <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 font-medium text-gray-700 hidden sm:table-cell">
                                  ₹{p.amount.toLocaleString('en-IN')}
                                </td>

                                {/* Status Column - FIXED: Show paid date */}
                                <td className="px-3 py-2.5 md:px-4 md:py-4 lg:px-6">
                                  {p.status === 'paid' ? (
                                    <div className="flex flex-col items-start gap-0.5">
                                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-emerald-100">
                                        <div className="hidden md:block">
                                          <CheckCircle size={12} />
                                        </div>
                                        <div className="md:hidden">
                                          <CheckCircle size={10} />
                                        </div>
                                        <span className="hidden xs:inline">PAID</span>
                                      </span>
                                      {/* FIXED: Show Paid Date - check p.paidDate directly */}
                                      {p.paidDate && (
                                        <span className="text-[9px] md:text-[10px] text-gray-500 font-medium">
                                          {formatDate(p.paidDate)}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-amber-100">
                                      <div className="hidden md:block">
                                        <Clock size={12} />
                                      </div>
                                      <div className="md:hidden">
                                        <Clock size={10} />
                                      </div>
                                      <span className="hidden xs:inline">PENDING</span>
                                    </span>
                                  )}
                                </td>

                                {/* Method - Hidden on mobile/tablet */}
                                <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-gray-600 font-medium hidden md:table-cell">
                                  {p.status === 'paid' ? p.method : '-'}
                                </td>
                                
                                {/* ACTION BUTTONS - Compact gap for mobile */}
                                <td className="px-3 py-2.5 md:px-4 md:py-4 lg:px-6 text-right">
                                  {hasActions ? (
                                    <div className="flex justify-end items-center gap-1 md:gap-2">
                                      
                                      {/* Method Badge for mobile */}
                                      <div className="md:hidden mr-1">
                                        {p.status === 'paid' && (
                                          <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            {p.method}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* LEADER ACTIONS */}
                                      {isLeader && (
                                        <>
                                          {p.status === 'pending' && (
                                            <>
                                              <button 
                                                onClick={() => handleMarkPaid(p.id)}
                                                className="p-1 md:p-1.5 lg:p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200"
                                                title="Mark as Paid (Cash)"
                                              >
                                                <div className="hidden lg:block">
                                                  <CheckCircle size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <CheckCircle size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <CheckCircle size={14} />
                                                </div>
                                              </button>
                                              <button 
                                                onClick={() => handleWhatsApp(p, group.groupName, cycle.cycleNumber)}
                                                className="p-1 md:p-1.5 lg:p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                                                title="Send WhatsApp Reminder"
                                              >
                                                <div className="hidden lg:block">
                                                  <Smartphone size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <Smartphone size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <Smartphone size={14} />
                                                </div>
                                              </button>
                                            </>
                                          )}

                                          {p.status === 'paid' && (
                                            <>
                                              {/* Edit Method */}
                                              <button 
                                                onClick={() => { setEditingPayment(p); setMethodForm(p.method); }}
                                                className="p-1 md:p-1.5 lg:p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                                title="Edit Payment Method"
                                              >
                                                <div className="hidden lg:block">
                                                  <Edit size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <Edit size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <Edit size={14} />
                                                </div>
                                              </button>

                                              {/* UNMARK (Revert) */}
                                              <button 
                                                onClick={() => handleUnmarkPaid(p.id)}
                                                className="p-1 md:p-1.5 lg:p-2 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                                title="Unmark (Revert to Pending)"
                                              >
                                                <div className="hidden lg:block">
                                                  <RotateCcw size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <RotateCcw size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <RotateCcw size={14} />
                                                </div>
                                              </button>

                                              {/* Delete */}
                                              <button 
                                                onClick={() => handleDelete(p.id)}
                                                className="p-1 md:p-1.5 lg:p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete Record"
                                              >
                                                <div className="hidden lg:block">
                                                  <Trash2 size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <Trash2 size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <Trash2 size={14} />
                                                </div>
                                              </button>

                                              {/* Download Receipt */}
                                              <button 
                                                onClick={() => handleDownloadReceipt(p)}
                                                className="p-1 md:p-1.5 lg:p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="Download Receipt"
                                              >
                                                <div className="hidden lg:block">
                                                  <Download size={18} />
                                                </div>
                                                <div className="hidden md:block lg:hidden">
                                                  <Download size={16} />
                                                </div>
                                                <div className="md:hidden">
                                                  <Download size={14} />
                                                </div>
                                              </button>
                                            </>
                                          )}
                                        </>
                                      )}

                                      {/* MEMBER ACTION: Download Own Receipt */}
                                      {!isLeader && isMe && p.status === 'paid' && (
                                        <button 
                                          onClick={() => handleDownloadReceipt(p)}
                                          className="px-1.5 md:px-2 lg:px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                                        >
                                          <div className="hidden md:block">
                                            <Download size={14} />
                                          </div>
                                          <div className="md:hidden">
                                            <Download size={12} />
                                          </div>
                                          <span className="hidden xs:inline">Receipt</span>
                                        </button>
                                      )}

                                    </div>
                                  ) : (
                                    // VIEW ONLY text for rows with no actions
                                    <div className="flex justify-end items-center">
                                      <span className="text-[10px] md:text-xs text-gray-400 italic flex items-center gap-1">
                                        <div className="hidden md:block">
                                          <Eye size={12} />
                                        </div>
                                        <div className="md:hidden">
                                          <Eye size={10} />
                                        </div>
                                        View Only
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* GROUP SUMMARY STATISTICS - MOVED TO BOTTOM (after payments list) */}
            <div className="bg-gray-50 border-t border-gray-200 px-3 md:px-4 lg:px-6 py-2 md:py-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                {/* Total Collected */}
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="p-1 md:p-1.5 bg-emerald-100 rounded">
                    <div className="hidden md:block">
                      <DollarSign className="text-emerald-600" size={16} />
                    </div>
                    <div className="md:hidden">
                      <DollarSign className="text-emerald-600" size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-gray-900">₹{stats.totalCollected.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] md:text-xs text-gray-500">Collected</div>
                  </div>
                </div>
                
                {/* Pending Amount */}
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="p-1 md:p-1.5 bg-amber-100 rounded">
                    <div className="hidden md:block">
                      <AlertCircle className="text-amber-600" size={16} />
                    </div>
                    <div className="md:hidden">
                      <AlertCircle className="text-amber-600" size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-gray-900">₹{stats.totalPending.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] md:text-xs text-gray-500">Pending</div>
                  </div>
                </div>
                
                {/* Payment Counts */}
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="p-1 md:p-1.5 bg-blue-100 rounded">
                    <div className="hidden md:block">
                      <Percent className="text-blue-600" size={16} />
                    </div>
                    <div className="md:hidden">
                      <Percent className="text-blue-600" size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-gray-900">{stats.paidCount}/{stats.totalCount}</div>
                    <div className="text-[10px] md:text-xs text-gray-500">Paid/Pending</div>
                  </div>
                </div>
                
                {/* Completion Rate */}
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="p-1 md:p-1.5 bg-purple-100 rounded">
                    <div className="hidden md:block">
                      <CheckCircle className="text-purple-600" size={16} />
                    </div>
                    <div className="md:hidden">
                      <CheckCircle className="text-purple-600" size={14} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm font-semibold text-gray-900">{stats.completionRate}%</div>
                    <div className="text-[10px] md:text-xs text-gray-500">Complete</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Edit Payment Method Modal (Leader Only) */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-4 md:p-6 shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="font-bold text-base md:text-lg text-gray-800">Edit Payment Method</h3>
              <button onClick={() => setEditingPayment(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <div className="hidden md:block">
                  <X size={20} className="text-gray-500" />
                </div>
                <div className="md:hidden">
                  <X size={18} className="text-gray-500" />
                </div>
              </button>
            </div>
            
            <div className="mb-4 md:mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700">Select Method</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 md:p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm md:text-base"
                value={methodForm}
                onChange={(e) => setMethodForm(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Note: Updating this will not affect the payment status.
              </p>
            </div>

            <div className="flex justify-end gap-2 md:gap-3">
              <button 
                onClick={() => setEditingPayment(null)} 
                className="px-3 md:px-4 py-1.5 md:py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditMethod} 
                className="px-3 md:px-4 py-1.5 md:py-2 bg-primary text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-primary-dark shadow-md shadow-primary/30 transition-all font-medium text-sm md:text-base"
              >
                <div className="hidden md:block">
                  <Save size={18} />
                </div>
                <div className="md:hidden">
                  <Save size={16} />
                </div>
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}