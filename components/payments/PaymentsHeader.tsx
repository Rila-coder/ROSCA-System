'use client';

import { useState } from 'react';
import { DollarSign, Search, User, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  onSearch: (val: string) => void;
  showMyPayments: boolean;
  toggleMyPayments: () => void;
  availableGroups: { id: string, name: string }[];
  currentUserId: string;
  userRole: string;
  userGroups: any[];
}

// Type for autoTable result
interface AutoTableResult {
  finalY: number;
}

// Extend jsPDF type
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: AutoTableResult;
}

export default function PaymentsHeader({ 
  onSearch, 
  showMyPayments, 
  toggleMyPayments, 
  availableGroups,
  currentUserId,
  userRole,
  userGroups = []
}: Props) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportGroup, setSelectedReportGroup] = useState('all');

  const generateMemberReport = async (groupId: string, groupName: string) => {
    try {
      // For "Your Report" - always use the userGroups prop data (already filtered for current user)
      // We don't need to make an API call since we already have the data
      
      const doc = new jsPDF() as JsPDFWithAutoTable;
      
      // Header based on report type
      if (groupId === 'all') {
        // All Groups Report - Your Payments
        doc.setFontSize(20);
        doc.setTextColor(30, 58, 138);
        doc.text('Your Payment Summary Report', 15, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 15, 30);
        doc.text(`User: Member`, 15, 36);
        doc.text(`Report Type: All Your Payments`, 15, 42);
        
        if (!userGroups || userGroups.length === 0) {
          doc.text('No payment data available', 15, 60);
          doc.save(`your-payments-report-${new Date().toISOString().split('T')[0]}.pdf`);
          toast.success('Report downloaded (no data)');
          return;
        }
        
        // Calculate totals for all groups
        let totalPaid = 0;
        let totalPending = 0;
        let paidCount = 0;
        let totalCount = 0;
        
        userGroups.forEach(group => {
          group.cycles.forEach((cycle: any) => {
            cycle.payments.forEach((p: any) => {
              if (p.userId === currentUserId) {
                totalCount++;
                if (p.status === 'paid') {
                  totalPaid += p.amount;
                  paidCount++;
                } else {
                  totalPending += p.amount;
                }
              }
            });
          });
        });
        
        const completionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
        
        // Add line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 48, 195, 48);
        
        // Add summary section
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.text('Report Summary', 15, 58);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const summaryY = 68;
        doc.text(`Total Payments: ${totalCount}`, 15, summaryY);
        doc.text(`Paid Amount: ₹${totalPaid.toLocaleString('en-IN')}`, 15, summaryY + 6);
        doc.text(`Pending Amount: ₹${totalPending.toLocaleString('en-IN')}`, 15, summaryY + 12);
        doc.text(`Completion Rate: ${completionRate}%`, 15, summaryY + 18);
        doc.text(`Your Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`, 15, summaryY + 24);
        
        // Add table header
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text('Your Payment Details', 15, summaryY + 40);
        
        // Prepare table data from real payments
        const tableData: any[] = [];
        userGroups.forEach(group => {
          group.cycles.forEach((cycle: any) => {
            cycle.payments.forEach((p: any) => {
              if (p.userId === currentUserId) {
                tableData.push([
                  group.groupName,
                  `Cycle ${cycle.cycleNumber}`,
                  `₹${p.amount.toLocaleString('en-IN')}`,
                  p.status.toUpperCase(),
                  p.method || '-',
                  p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '--'
                ]);
              }
            });
          });
        });
        
        // Use autoTable
        if (tableData.length > 0) {
          autoTable(doc, {
            startY: summaryY + 46,
            head: [['Group', 'Cycle', 'Amount', 'Status', 'Method', 'Date']],
            body: tableData,
            headStyles: {
              fillColor: [30, 58, 138],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            theme: 'grid',
            styles: {
              fontSize: 9,
              cellPadding: 3,
            },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 25 },
              2: { cellWidth: 30 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 35 },
            },
          });
        } else {
          doc.text('No payment records found.', 15, summaryY + 46);
        }
        
      } else {
        // Single Group Report - Your Payments
        doc.setFontSize(20);
        doc.setTextColor(30, 58, 138);
        doc.text('Your Payment Report', 15, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 15, 30);
        doc.text(`Group: ${groupName}`, 15, 36);
        doc.text(`Your Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`, 15, 42);
        
        // Single Group Report - Use data from userGroups prop
        const groupData = userGroups.find(g => g.groupId === groupId);
        if (!groupData) {
          doc.text('Group data not found', 15, 60);
          doc.save(`your-payments-${groupName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
          toast.success('Report downloaded (no data)');
          return;
        }
        
        // Calculate totals for the selected group
        let totalPaid = 0;
        let totalPending = 0;
        let paidCount = 0;
        let userPaymentCount = 0;
        
        groupData.cycles.forEach((cycle: any) => {
          cycle.payments.forEach((p: any) => {
            if (p.userId === currentUserId) {
              userPaymentCount++;
              if (p.status === 'paid') {
                totalPaid += p.amount;
                paidCount++;
              } else {
                totalPending += p.amount;
              }
            }
          });
        });
        
        const completionRate = userPaymentCount > 0 ? Math.round((paidCount / userPaymentCount) * 100) : 0;
        
        // Add line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 48, 195, 48);
        
        // Add summary section
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.text('Report Summary', 15, 58);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const summaryY = 68;
        doc.text(`Your Payments in this Group: ${userPaymentCount}`, 15, summaryY);
        doc.text(`Paid Amount: ₹${totalPaid.toLocaleString('en-IN')}`, 15, summaryY + 6);
        doc.text(`Pending Amount: ₹${totalPending.toLocaleString('en-IN')}`, 15, summaryY + 12);
        doc.text(`Your Completion Rate: ${completionRate}%`, 15, summaryY + 18);
        
        // Add table header
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text('Your Payment Details', 15, summaryY + 40);
        
        // Prepare table data from real payments
        const tableData: any[] = [];
        groupData.cycles.forEach((cycle: any) => {
          cycle.payments.forEach((p: any) => {
            if (p.userId === currentUserId) {
              tableData.push([
                `Cycle ${cycle.cycleNumber}`,
                `₹${p.amount.toLocaleString('en-IN')}`,
                p.status.toUpperCase(),
                p.method || '-',
                p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '--'
              ]);
            }
          });
        });
        
        // Use autoTable
        if (tableData.length > 0) {
          autoTable(doc, {
            startY: summaryY + 46,
            head: [['Cycle', 'Amount', 'Status', 'Method', 'Date']],
            body: tableData,
            headStyles: {
              fillColor: [30, 58, 138],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            theme: 'grid',
            styles: {
              fontSize: 10,
              cellPadding: 3,
            },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 35 },
              2: { cellWidth: 30 },
              3: { cellWidth: 35 },
              4: { cellWidth: 40 },
            },
          });
        } else {
          doc.text('No payment records found in this group.', 15, summaryY + 46);
        }
      }
      
      // Get total pages
      const pageCount = (doc as any).internal.pages.length;
      
      // Add footer to all pages
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('© ROSCA Payment System', 195, 285, { align: 'right' });
      }
      
      // Save PDF
      const fileName = groupId === 'all' 
        ? `your-all-payments-report-${new Date().toISOString().split('T')[0]}.pdf`
        : `your-payments-${groupName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      
      toast.success(`Your payment report downloaded successfully!`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleGenerateReport = () => {
    if (!selectedReportGroup) {
      toast.error('Please select a group');
      return;
    }

    const groupName = selectedReportGroup === 'all' 
      ? 'All Groups' 
      : availableGroups.find(g => g.id === selectedReportGroup)?.name || 'Selected Group';
    
    generateMemberReport(selectedReportGroup, groupName);
    
    setShowReportModal(false);
    setSelectedReportGroup('all');
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4 mt-0 md:mt-5 lg:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="p-2 md:p-3 bg-primary/10 rounded-xl">
            <div className="hidden md:block">
              <DollarSign className="text-primary" size={24} />
            </div>
            <div className="md:hidden">
              <DollarSign className="text-primary" size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text">Payment Tracking</h1>
            <p className="text-text/60 text-xs md:text-sm">
              Manage group cycle payments
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Your Payments Toggle */}
          <button
            onClick={toggleMyPayments}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center space-x-1 md:space-x-2 transition-colors ${
              showMyPayments 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="hidden md:block">
              <User size={18} />
            </div>
            <div className="md:hidden">
              <User size={16} />
            </div>
            <span className="hidden xs:inline">Your Payments</span>
          </button>

          {/* Your Report Button - Available for ALL users (members, sub-leaders, leaders) */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-green-600 text-white rounded-lg text-xs md:text-sm font-medium flex items-center space-x-1 md:space-x-2 hover:bg-green-700 shadow-md transition-colors"
          >
            <div className="hidden md:block">
              <Download size={18} />
            </div>
            <div className="md:hidden">
              <Download size={16} />
            </div>
            <span className="hidden xs:inline">Your Report</span>
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <div className="hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div className="md:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <input
          type="search"
          placeholder="Search by member name or amount..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base"
        />
      </div>

      {/* Report Generation Modal - Simplified for ALL users */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-4 md:p-6 shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="font-bold text-base md:text-lg text-gray-800">
                Download Your Payments Report
              </h3>
              <button 
                onClick={() => { setShowReportModal(false); setSelectedReportGroup('all'); }} 
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="text-gray-500 text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="mb-4 md:mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Select Group
              </label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 md:p-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm md:text-base"
                value={selectedReportGroup}
                onChange={(e) => setSelectedReportGroup(e.target.value)}
              >
                <option value="all">All Groups (Your Payments)</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                This will download a PDF report of all your payments in the selected group(s).
              </p>
            </div>

            <div className="flex justify-end gap-2 md:gap-3">
              <button 
                onClick={() => { setShowReportModal(false); setSelectedReportGroup('all'); }} 
                className="px-3 md:px-4 py-1.5 md:py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerateReport} 
                className="px-3 md:px-4 py-1.5 md:py-2 bg-green-600 text-white rounded-lg flex items-center gap-1 md:gap-2 hover:bg-green-700 shadow-md shadow-green-600/30 transition-all font-medium text-sm md:text-base"
              >
                <div className="hidden md:block">
                  <Download size={18} />
                </div>
                <div className="md:hidden">
                  <Download size={16} />
                </div>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}