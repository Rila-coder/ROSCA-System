'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Filter, Search, CheckCircle, XCircle, 
  Clock, DollarSign, Calendar, Download,
  Eye, Receipt, Send, MoreVertical, ChevronDown,
  ChevronUp, Trash2,
  Loader2, RefreshCw, ArrowUpRight,
  RotateCcw, AlertCircle, PlayCircle, PauseCircle,
  EyeOff, FileText, X, BarChart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { useAuth } from '@/components/providers/AuthProvider';

interface PaymentTrackerProps {
  groupId: string;
  canManage?: boolean;
  currentCycle?: any;
  payments?: any[];
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    groupName: string;
    activeCycle: any;
    paymentStats: any;
    payments: any[];
    summary: any;
  };
  onDownloadPDF: () => void;
}

// Report Modal Component
const ReportModal = ({ isOpen, onClose, reportData, onDownloadPDF }: ReportModalProps) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Payment Report</h2>
            <p className="text-text/60 text-xs sm:text-sm mt-1">
              {reportData.groupName} • Cycle #{reportData.activeCycle?.cycleNumber || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs sm:text-sm font-medium"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-text/60" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200">
              <div className="text-xs sm:text-sm font-medium text-text/60 mb-1 sm:mb-2">Total Payments</div>
              <div className="text-xl sm:text-2xl font-bold text-text">{reportData.paymentStats.total}</div>
              <div className="text-xs sm:text-sm text-text/60">
                {formatCurrency(reportData.paymentStats.totalAmount)}
              </div>
            </div>
            
            <div className="bg-green-50 p-3 sm:p-4 rounded-xl border border-green-200">
              <div className="text-xs sm:text-sm font-medium text-green-700 mb-1 sm:mb-2">Collected</div>
              <div className="text-xl sm:text-2xl font-bold text-green-700">{reportData.paymentStats.paid}</div>
              <div className="text-xs sm:text-sm text-green-600">
                {formatCurrency(reportData.paymentStats.collectedAmount)}
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-xl border border-yellow-200">
              <div className="text-xs sm:text-sm font-medium text-yellow-700 mb-1 sm:mb-2">Pending</div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-700">{reportData.paymentStats.pending}</div>
              <div className="text-xs sm:text-sm text-yellow-600">
                {formatCurrency(reportData.paymentStats.pendingAmount)}
              </div>
            </div>
            
            <div className="bg-red-50 p-3 sm:p-4 rounded-xl border border-red-200">
              <div className="text-xs sm:text-sm font-medium text-red-700 mb-1 sm:mb-2">Late</div>
              <div className="text-xl sm:text-2xl font-bold text-red-700">{reportData.paymentStats.late}</div>
              <div className="text-xs sm:text-sm text-red-600">
                {formatCurrency(reportData.paymentStats.lateAmount || 0)}
              </div>
            </div>
          </div>

          {/* Cycle Information */}
          {reportData.activeCycle && (
            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4 flex items-center gap-2">
                <BarChart size={20} />
                Active Cycle Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm text-text/60 mb-1">Cycle Number</div>
                  <div className="text-base sm:text-lg font-bold text-text">#{reportData.activeCycle.cycleNumber}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text/60 mb-1">Recipient</div>
                  <div className="text-base sm:text-lg font-bold text-text">
                    {reportData.activeCycle.recipientName || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text/60 mb-1">Start Date</div>
                  <div className="text-base sm:text-lg font-medium text-text">
                    {formatDate(reportData.activeCycle.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-text/60 mb-1">Due Date</div>
                  <div className="text-base sm:text-lg font-medium text-text">
                    {formatDate(reportData.activeCycle.dueDate)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Status Breakdown */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4">Payment Status Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium text-sm sm:text-base">Paid</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text text-sm sm:text-base">{reportData.paymentStats.paid} payments</div>
                  <div className="text-xs sm:text-sm text-text/60">
                    {formatCurrency(reportData.paymentStats.collectedAmount)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium text-sm sm:text-base">Pending</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text text-sm sm:text-base">{reportData.paymentStats.pending} payments</div>
                  <div className="text-xs sm:text-sm text-text/60">
                    {formatCurrency(reportData.paymentStats.pendingAmount)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium text-sm sm:text-base">Late</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text text-sm sm:text-base">{reportData.paymentStats.late} payments</div>
                  <div className="text-xs sm:text-sm text-text/60">
                    {formatCurrency(reportData.paymentStats.lateAmount || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment List Preview */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4">Recent Payments</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-text/60">Member</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-text/60">Amount</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-text/60">Status</th>
                    <th className="text-left py-3 px-4 text-xs sm:text-sm font-medium text-text/60">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payments.slice(0, 10).map((payment, index) => (
                    <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm sm:text-base">
                          {payment.memberName || payment.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-text/60">{payment.userId?.phone || 'No phone'}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-sm sm:text-base">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text/60 text-xs sm:text-sm">
                        {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs sm:text-sm text-text/60 mt-3 text-center">
              Showing 10 of {reportData.payments.length} payments
            </div>
          </div>

          {/* Report Summary */}
          <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-text mb-3">Report Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs sm:text-sm text-text/60 mb-1">Collection Rate</div>
                <div className="text-xl sm:text-2xl font-bold text-text">
                  {reportData.paymentStats.total > 0 
                    ? `${((reportData.paymentStats.paid / reportData.paymentStats.total) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-text/60 mb-1">Average Payment Time</div>
                <div className="text-xl sm:text-2xl font-bold text-text">2.5 days</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-text/60 mb-1">On-time Payments</div>
                <div className="text-xl sm:text-2xl font-bold text-text">
                  {reportData.paymentStats.paid} / {reportData.paymentStats.total}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-text/60 mb-1">Remaining Collection</div>
                <div className="text-xl sm:text-2xl font-bold text-text">
                  {formatCurrency(reportData.paymentStats.pendingAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PaymentTracker({ groupId, canManage = false }: PaymentTrackerProps) {
  const { user } = useAuth();
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'late'>('all');
  const [search, setSearch] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // ✅ State to track internal role - with improved detection
  const [userRole, setUserRole] = useState<'leader' | 'sub_leader' | 'member'>('member');
  
  // ✅ NEW STATE: Track Group Status
  const [isGroupCompleted, setIsGroupCompleted] = useState(false);
  const [groupName, setGroupName] = useState('Group');
  
  const actionsMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchPaymentData();
    fetchCycles();
    fetchUserRole();
  }, [groupId]);

  // ✅ IMPROVED: Fetch Role with multiple fallback methods
  const fetchUserRole = async () => {
    try {
      if (!user) return;
      
      const currentUserId = user.id || (user as any)?._id;
      const currentUserEmail = user.email;

      // Method 1: Try fetching from members API
      const membersResponse = await fetch(`/api/groups/${groupId}/members?t=${Date.now()}`);
      if (membersResponse.ok) {
        const data = await membersResponse.json();
        const membersList = data.members || [];
        
        const myRecord = membersList.find((m: any) => {
          // Try ID match
          const memberId = m.userId?._id || m.userId;
          if (memberId && currentUserId && String(memberId) === String(currentUserId)) {
            return true;
          }

          // Try email match
          const memberEmail = m.userId?.email || m.pendingMemberDetails?.email;
          if (memberEmail && currentUserEmail && memberEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
            return true;
          }
          
          return false;
        });

        if (myRecord) {
          setUserRole(myRecord.role || 'member');
          return;
        }
      }

      // Method 2: Fallback to group API for leader/sub-leader detection
      const groupResponse = await fetch(`/api/groups/${groupId}?t=${Date.now()}`);
      if (groupResponse.ok) {
        const data = await groupResponse.json();
        const group = data.group;
        
        if (group && currentUserId) {
          const leaderId = group.leaderId?._id || group.leaderId;
          const subLeaderIds = (group.subLeaderIds || []).map((id: any) => id?._id || id);
          
          if (leaderId === currentUserId) {
            setUserRole('leader');
          } else if (subLeaderIds.includes(currentUserId)) {
            setUserRole('sub_leader');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  // ✅ PERMISSION CONSTANTS
  const amILeader = userRole === 'leader';
  const amISubLeader = userRole === 'sub_leader';
  const amIAdmin = amILeader || amISubLeader;
  const canExportReport = canManage || amIAdmin; // For header export button

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/groups/${groupId}/payments?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      
      const data = await response.json();
      setCurrentCycle(data.currentCycle);
      setPayments(data.payments || []);
      
      // ✅ SAVE GROUP INFO
      if (data.groupName) setGroupName(data.groupName);
      if (data.isGroupCompleted !== undefined) setIsGroupCompleted(data.isGroupCompleted);

    } catch (error) {
      toast.error('Failed to load payment data');
      console.error('Payment data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/cycles?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cycles');
      }
      
      const data = await response.json();
      setCycles(data.cycles || []);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let isOutside = true;
      
      Object.values(actionsMenuRefs.current).forEach(ref => {
        if (ref && ref.contains(event.target as Node)) {
          isOutside = false;
        }
      });

      if (isOutside) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isCurrentUser = (paymentUserId: string) => {
    if (!user) return false;
    const currentUserId = user.id || (user as any)._id;
    return paymentUserId === currentUserId;
  };

  const canViewReceipt = (payment: any) => {
    if (payment.status !== 'paid') return false;
    // Leaders and Sub-leaders can view all receipts
    if (amIAdmin) return true;
    return isCurrentUser(payment.userId?._id);
  };

  const hasActiveCycle = () => {
    if (!currentCycle) return false;
    if (currentCycle.status === 'active') return true;
    if (currentCycle.isCompleted || currentCycle.isSkipped) return false;
    if (!currentCycle.isCompleted && !currentCycle.isSkipped) return true;
    return false;
  };

  const getActiveCycleInfo = () => {
    if (hasActiveCycle()) {
      return currentCycle;
    }
    
    const activeCycle = cycles.find(cycle => {
      if (cycle.status === 'active') return true;
      if (cycle.status && cycle.status !== 'active') return false;
      if (cycle.isSkipped || cycle.isCompleted) return false;
      return true;
    });
    
    return activeCycle || null;
  };

  const getCycleStatus = (cycle: any) => {
    if (!cycle) return 'inactive';
    if (cycle.status) return cycle.status;
    if (cycle.isSkipped) return 'skipped';
    if (cycle.isCompleted) return 'completed';
    return 'active';
  };

  const filteredPayments = payments.filter(payment => {
    if (filter !== 'all' && payment.status !== filter) return false;
    if (search && !payment.memberName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getPaymentStats = () => {
    return {
      total: payments.length,
      paid: payments.filter(p => p.status === 'paid').length,
      pending: payments.filter(p => p.status === 'pending').length,
      late: payments.filter(p => p.status === 'late').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      collectedAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      lateAmount: payments.filter(p => p.status === 'late').reduce((sum, p) => sum + p.amount, 0),
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ NEW: Helper function to get member name for reports
  const getMemberNameForReport = (payment: any) => {
    // Always use snapshot name (memberName) first
    if (payment.memberName) return payment.memberName;
    
    // Fallback to userId name if snapshot name not available
    if (payment.userId?.name) return payment.userId.name;
    
    return 'Unknown Member';
  };

  // ✅ UPDATED: General Report PDF Generation
  const handleGenerateGeneralReportPDF = async () => {
    try {
      setGeneratingPDF(true);
      toast.loading('Generating comprehensive PDF report...');

      const paymentStats = getPaymentStats();
      const activeCycle = getActiveCycleInfo();
      
      // Fetch group details for the report
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      const groupData = await groupResponse.json();
      const groupName = groupData.group?.name || "ROSCA Group";
      
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT COLLECTION REPORT", 105, 18, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text(`Group: ${groupName} • Generated: ${new Date().toLocaleDateString()}`, 105, 25, { align: "center" });
      
      let y = 40;
      
      // Cycle Information
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("CYCLE INFORMATION", 20, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      
      if (activeCycle) {
        doc.text(`Cycle Number: #${activeCycle.cycleNumber}`, 20, y);
        y += 7;
        doc.text(`Recipient: ${activeCycle.recipientName || "Not assigned"}`, 20, y);
        y += 7;
        doc.text(`Start Date: ${activeCycle.startDate ? new Date(activeCycle.startDate).toLocaleDateString() : "Not set"}`, 20, y);
        y += 7;
        doc.text(`Due Date: ${activeCycle.dueDate ? new Date(activeCycle.dueDate).toLocaleDateString() : "Not set"}`, 20, y);
      } else {
        doc.text("No active cycle", 20, y);
      }
      
      y += 15;
      
      // Summary Statistics
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("SUMMARY STATISTICS", 20, y);
      
      y += 15;
      const stats = [
        ["Total Payments", paymentStats.total.toString(), formatCurrency(paymentStats.totalAmount)],
        ["Paid", paymentStats.paid.toString(), formatCurrency(paymentStats.collectedAmount)],
        ["Pending", paymentStats.pending.toString(), formatCurrency(paymentStats.pendingAmount)],
        ["Late", paymentStats.late.toString(), formatCurrency(paymentStats.lateAmount || 0)],
      ];
      
      stats.forEach(([label, count, amount]) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(label, 20, y);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(count, 80, y);
        
        doc.setTextColor(59, 130, 246);
        doc.text(amount, 140, y, { align: "right" });
        
        y += 7;
      });
      
      // Collection Rate
      y += 5;
      const collectionRate = paymentStats.total > 0 
        ? ((paymentStats.paid / paymentStats.total) * 100).toFixed(1)
        : "0";
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Collection Rate:", 20, y);
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`${collectionRate}%`, 90, y);
      
      y += 15;
      
      // Payment Details Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("PAYMENT DETAILS", 20, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      
      // Table headers
      doc.text("No.", 20, y);
      doc.text("Member Name", 30, y);
      doc.text("Amount", 100, y);
      doc.text("Status", 130, y);
      doc.text("Date", 160, y);
      
      y += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);
      
      // Table rows
      filteredPayments.forEach((payment, index) => {
        if (index < 25) { 
          y += 10;
          if (y > 270) { 
            doc.addPage();
            y = 40;
          }
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          
          // Row number
          doc.text(`${index + 1}.`, 20, y);
          
          // ✅ FIXED: Use Snapshot Name for General Report
          const memberName = getMemberNameForReport(payment);
          const truncatedName = memberName.length > 30 ? memberName.substring(0, 30) + "..." : memberName;
          doc.text(truncatedName, 30, y);
          
          // Amount
          doc.text(formatCurrency(payment.amount), 100, y);
          
          // Status with color coding
          if (payment.status === 'paid') {
            doc.setTextColor(16, 185, 129); // Green
          } else if (payment.status === 'pending') {
            doc.setTextColor(245, 158, 11); // Yellow
          } else {
            doc.setTextColor(239, 68, 68); // Red
          }
          const statusText = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
          doc.text(statusText, 130, y);
          
          // Date
          doc.setTextColor(100, 100, 100);
          const date = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.dueDate);
          doc.text(date.toLocaleDateString(), 160, y);
        }
      });
      
      // Footer
      const footerY = 280;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by ROSCA System • Total records: ${filteredPayments.length}`, 105, 285, { align: "center" });
      
      const fileName = `${groupName.replace(/\s+/g, '_')}_Payment_Report_Cycle_${activeCycle?.cycleNumber || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.dismiss();
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleViewReport = () => {
    // ✅ Permission check - only leaders and sub-leaders can view reports
    if (!canExportReport) {
      toast.error('Only leaders and sub-leaders can view reports');
      return;
    }
    
    // Prepare report data
    const activeCycle = getActiveCycleInfo();
    const paymentStats = getPaymentStats();
    
    const reportData = {
      groupName: groupName, // ✅ Use State Group Name
      activeCycle: activeCycle,
      paymentStats: paymentStats,
      payments: filteredPayments.map(payment => ({
        ...payment,
        // ✅ Use snapshot name for the report modal
        memberName: getMemberNameForReport(payment)
      })),
      summary: {
        collectionRate: paymentStats.total > 0 
          ? ((paymentStats.paid / paymentStats.total) * 100).toFixed(1)
          : "0"
      }
    };
    
    setShowReportModal(true);
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      setProcessingPayment(paymentId);
      
      const response = await fetch(`/api/groups/${groupId}/payments/${paymentId}/mark-paid`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to mark payment as paid');
      }

      setPayments(prev => prev.map(p => 
        p._id === paymentId ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p
      ));
      
      setShowActionsMenu(null);
      toast.success('Payment marked as paid');
      await fetchPaymentData();
    } catch (error) {
      toast.error('Failed to update payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleMarkAsUnpaid = async (paymentId: string) => {
    try {
      setProcessingPayment(paymentId);
      
      const response = await fetch(`/api/groups/${groupId}/payments/${paymentId}/mark-unpaid`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to mark payment as unpaid');
      }

      setPayments(prev => prev.map(p => 
        p._id === paymentId ? { ...p, status: 'pending', paidAt: null } : p
      ));
      
      setShowActionsMenu(null);
      toast.success('Payment marked as unpaid');
      await fetchPaymentData();
    } catch (error) {
      toast.error('Failed to update payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleSendReminder = async (paymentId: string) => {
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) return;

    // ✅ FIX: Use Snapshot Name for WhatsApp Message
    const name = getMemberNameForReport(payment);
    const amount = payment.amount;
    let phone = payment.userId?.phone;

    if (!phone) {
      toast.error('No phone number found for this member');
      return;
    }

    phone = phone.replace(/[\s\-\+\(\)]/g, '');
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1);
    }

    const message = `Hi ${name}, this is a gentle reminder to pay your ROSCA contribution of Rs. ${amount.toLocaleString()}. Please pay soon. Thanks!`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success(`Opening WhatsApp for ${name}...`);
  };

  // ✅ UPDATED: Personal Receipt Download
  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      setProcessingPayment(paymentId);
      const loadingToast = toast.loading('Generating receipt...');
      
      // Fetch payment data for receipt
      const payment = payments.find(p => p._id === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Fetch group details
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      const groupData = await groupResponse.json();
      const groupName = groupData.group?.name || "ROSCA Group";
      
      const activeCycle = getActiveCycleInfo();
      
      // ✅ FIXED: Use Snapshot Name for Personal Receipt
      const memberName = getMemberNameForReport(payment);
      const memberPhone = payment.userId?.phone || "Not provided";
      const receiptId = `REC-${paymentId.slice(-8).toUpperCase()}`;
      
      const doc = new jsPDF();
      
      // Header with blue background
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT RECEIPT", 105, 18, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text(`Group: ${groupName} • Receipt No: ${receiptId}`, 105, 25, { align: "center" });
      
      // Content background
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 40, 180, 40, 'F');
      
      let y = 50;
      const drawRow = (label: string, value: string, isBold = false, x = 20) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(label, x, y);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(value, x + 90, y);
        y += 8;
      };
      
      drawRow("Receipt No:", receiptId);
      drawRow("Date:", new Date(payment.paidAt || new Date()).toLocaleDateString());
      drawRow("Cycle No:", `#${activeCycle?.cycleNumber || 'N/A'}`);
      
      y += 10;
      
      // Member Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Member Details", 20, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Name:", 20, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(memberName, 70, y);
      
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Phone:", 20, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(memberPhone, 70, y);
      
      y += 15;
      
      // Payment Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Payment Details", 20, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Amount Paid:", 20, y);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text(`Rs. ${payment.amount.toLocaleString()}`, 70, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Payment Method:", 20, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(payment.method || 'Cash/Bank Transfer', 70, y);
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Paid On:", 20, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(new Date(payment.paidAt || new Date()).toLocaleDateString(), 70, y);
      
      y += 15;
      
      // Paid badge
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(20, y, 60, 15, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("PAID", 50, y + 10, { align: "center" });
      
      y += 25;
      
      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("This is a computer-generated receipt and does not require a signature.", 105, y, { align: "center" });
      y += 5;
      doc.text("Thank you for your timely payment!", 105, y, { align: "center" });
      
      // Save with proper filename
      const fileName = `Receipt_${memberName.replace(/\s+/g, '_')}_${receiptId}.pdf`;
      doc.save(fileName);
      
      toast.dismiss(loadingToast);
      toast.success('Receipt downloaded successfully!');
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast.error('Could not generate receipt. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) return;

    if (confirm(`Are you sure you want to remove this payment record for ${getMemberNameForReport(payment)}?`)) {
      try {
        setProcessingPayment(paymentId);
        
        const response = await fetch(`/api/groups/${groupId}/payments/${paymentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove payment');
        }

        setPayments(prev => prev.filter(p => p._id !== paymentId));
        setShowActionsMenu(null);
        toast.success('Payment record removed');
      } catch (error) {
        toast.error('Failed to remove payment');
      } finally {
        setProcessingPayment(null);
      }
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedPayments.length === 0) {
      toast.error('No payments selected');
      return;
    }

    const unpaidSelectedPayments = selectedPayments.filter(paymentId => {
      const payment = payments.find(p => p._id === paymentId);
      return payment && payment.status !== 'paid';
    });

    if (unpaidSelectedPayments.length === 0) {
      toast.success('All selected payments are already paid');
      return;
    }

    try {
      setProcessingPayment('bulk');
      
      const response = await fetch(`/api/groups/${groupId}/payments/bulk/mark-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIds: unpaidSelectedPayments,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payments');
      }

      setPayments(prev => prev.map(p => 
        unpaidSelectedPayments.includes(p._id) 
          ? { ...p, status: 'paid', paidAt: new Date().toISOString() } 
          : p
      ));
      
      toast.success(`Marked ${unpaidSelectedPayments.length} payments as paid`);
      setSelectedPayments([]);
      setShowBulkActions(false);
      await fetchPaymentData();
    } catch (error) {
      toast.error('Failed to update payments');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleBulkSendReminders = () => {
    const unpaidPayments = filteredPayments.filter(p => selectedPayments.includes(p._id) && p.status !== 'paid');

    if (unpaidPayments.length === 0) {
      toast.error('No unpaid members selected');
      return;
    }

    const list = unpaidPayments.map(p => {
      const name = getMemberNameForReport(p);
      return `${name}: ${p.userId?.phone || 'No phone'} (Rs. ${p.amount})`;
    }).join('\n');

    navigator.clipboard.writeText(list);
    
    toast.success(`Copied ${unpaidPayments.length} unpaid members to clipboard! You can paste this in your WhatsApp Group.`);
    
    setSelectedPayments([]);
    setShowBulkActions(false);
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(filteredPayments.map(p => p._id));
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} className="text-success" />;
      case 'pending':
        return <Clock size={16} className="text-accent" />;
      case 'late':
        return <XCircle size={16} className="text-error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'late':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const togglePaymentExpand = (paymentId: string) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId);
  };

  const toggleActionsMenu = (e: React.MouseEvent, paymentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActionsMenu(showActionsMenu === paymentId ? null : paymentId);
  };

  const setActionsMenuRef = (paymentId: string, el: HTMLDivElement | null) => {
    actionsMenuRefs.current[paymentId] = el;
  };

  const stats = getPaymentStats();

  const shouldShowPaymentList = () => {
    if (cycles.length === 0) {
      return false;
    }

    if (currentCycle) {
      const status = getCycleStatus(currentCycle);
      return status === 'active';
    }

    const activeCycle = cycles.find(cycle => getCycleStatus(cycle) === 'active');
    return !!activeCycle;
  };

  const getCycleStatusMessage = () => {
    // ✅ CRITICAL CHECK: If Group is fully completed, return special message
    if (isGroupCompleted) {
        return {
            title: "All Cycles Completed",
            message: `Total cycles of this ${groupName} group completed.. So no payments track..`,
            icon: <CheckCircle className="h-16 w-16 text-success" />,
            actionText: "View History",
            action: fetchCycles // Redirect or action
        };
    }

    if (cycles.length === 0) {
      return {
        title: "No Cycles Started",
        message: "Start the first cycle in Cycle Management to begin collecting payments.",
        icon: <PlayCircle className="h-16 w-16 text-accent" />,
        actionText: "Go to Cycle Management",
        action: () => {
          toast.success('Navigate to Cycle Management tab to start first cycle');
        }
      };
    }

    const activeCycle = cycles.find(c => getCycleStatus(c) === 'active');
    const lastCycle = cycles[cycles.length - 1];
    const lastCycleStatus = getCycleStatus(lastCycle);

    if (lastCycleStatus === 'skipped') {
      return {
        title: "Cycle Skipped",
        message: `Cycle #${lastCycle.cycleNumber} has been skipped. Start the upcoming cycle to resume payment collection.`,
        icon: <PauseCircle className="h-16 w-16 text-error" />,
        actionText: "Start Upcoming Cycle",
        action: () => {
          toast.success('Navigate to Cycle Management to start upcoming cycle');
        }
      };
    }

    if (lastCycleStatus === 'completed') {
      return {
        title: "Cycle Completed",
        message: `Cycle #${lastCycle.cycleNumber} is completed. Start the next cycle to continue payment collection.`,
        icon: <CheckCircle className="h-16 w-16 text-success" />,
        actionText: "Start Next Cycle",
        action: () => {
          toast.success('Navigate to Cycle Management to start next cycle');
        }
      };
    }

    if (lastCycleStatus === 'upcoming') {
      return {
        title: "Upcoming Cycle",
        message: `Cycle #${lastCycle.cycleNumber} is scheduled but not active. Activate it to start collecting payments.`,
        icon: <Clock className="h-16 w-16 text-accent" />,
        actionText: "Activate Cycle",
        action: () => {
          toast.success('Navigate to Cycle Management to activate this cycle');
        }
      };
    }

    if (activeCycle) {
      return {
        title: "Loading Payments...",
        message: "Active cycle found but payments are loading. Please refresh.",
        icon: <Loader2 className="h-16 w-16 animate-spin text-primary" />,
        actionText: "Refresh",
        action: fetchPaymentData
      };
    }

    return {
      title: "No Active Cycle",
      message: "No active cycle found. Please check the Cycle Management section.",
      icon: <AlertCircle className="h-16 w-16 text-warning" />,
      actionText: "Check Cycles",
      action: fetchCycles
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCycleInfo = getActiveCycleInfo();

  if (!shouldShowPaymentList()) {
    const statusMessage = getCycleStatusMessage();
    
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text">Payment Tracker</h2>
            <p className="text-text/60 text-sm mt-1">Track and manage member payments</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPaymentData}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Refresh payments"
            >
              <RefreshCw size={18} className="text-text/60" />
            </button>
            {/* ✅ Export Button: Visible to Leader & Sub-leader */}
            {canExportReport && (
              <button 
                onClick={handleGenerateGeneralReportPDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {generatingPDF ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Cycle Status Message */}
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 sm:p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="mb-6 p-4 bg-gray-100 rounded-full">
            {statusMessage.icon}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-text mb-3">{statusMessage.title}</h3>
          <p className="text-text/60 max-w-md mx-auto mb-6 text-sm sm:text-base">
            {statusMessage.message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Action button visible to Leader (usually) - relying on canManage for specific cycle actions */}
            {canManage && (
              <button
                onClick={statusMessage.action}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              >
                {statusMessage.actionText}
              </button>
            )}
            <button
              onClick={fetchPaymentData}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-text hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Refresh Status
            </button>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md w-full border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-left">
                <div className="text-xs text-text/60 mb-1">Total Cycles</div>
                <div className="font-bold">{cycles.length}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-text/60 mb-1">Last Cycle</div>
                <div className="font-bold">#{cycles[cycles.length - 1]?.cycleNumber || 'N/A'}</div>
              </div>
            </div>
            <div className="text-xs text-text/60">
              Active: {cycles.filter(c => getCycleStatus(c) === 'active').length} | 
              Completed: {cycles.filter(c => getCycleStatus(c) === 'completed').length} | 
              Skipped: {cycles.filter(c => getCycleStatus(c) === 'skipped').length} | 
              Upcoming: {cycles.filter(c => getCycleStatus(c) === 'upcoming').length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Report Modal - Pass the reportData object */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportData={{
          groupName: "Group",
          activeCycle: activeCycleInfo,
          paymentStats: stats,
          payments: filteredPayments.map(payment => ({
            ...payment,
            memberName: getMemberNameForReport(payment)
          })),
          summary: {
            collectionRate: stats.total > 0 
              ? ((stats.paid / stats.total) * 100).toFixed(1)
              : "0"
          }
        }}
        onDownloadPDF={handleGenerateGeneralReportPDF}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">Payment Tracker</h2>
          <p className="text-text/60 text-sm mt-1">
            Tracking payments for <span className="font-bold text-primary">Cycle #{activeCycleInfo?.cycleNumber || 'N/A'}</span>
            {activeCycleInfo?.recipientName && (
              <span className="ml-2 hidden sm:inline">• Recipient: {activeCycleInfo.recipientName}</span>
            )}
          </p>
          {activeCycleInfo?.recipientName && (
            <p className="text-text/60 text-sm sm:hidden mt-1">Recipient: {activeCycleInfo.recipientName}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchPaymentData}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refresh payments"
          >
            <RefreshCw size={18} className="text-text/60" />
          </button>
          
          {/* ✅ Export Button: Visible to Leader & Sub-leader */}
          {canExportReport && (
            <button 
              onClick={handleGenerateGeneralReportPDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {generatingPDF ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Rest of the UI remains the same... */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* ... (Existing stats cards code) ... */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-text">Total</div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign size={16} className="text-primary sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-text mb-1">{stats.total}</div>
          <div className="text-xs sm:text-sm text-text/60">{formatCurrency(stats.totalAmount)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-text">Collected</div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-success sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-success mb-1">{stats.paid}</div>
          <div className="text-xs sm:text-sm text-text/60">{formatCurrency(stats.collectedAmount)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-text">Pending</div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Clock size={16} className="text-accent sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-accent mb-1">{stats.pending}</div>
          <div className="text-xs sm:text-sm text-text/60">{formatCurrency(stats.pendingAmount)}</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-text">Late</div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <XCircle size={16} className="text-error sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-bold text-error mb-1">{stats.late}</div>
          <div className="text-xs sm:text-sm text-text/60">Needs action</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary transition-colors">
                  <Filter size={16} className="text-text/40" />
                  <select 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="bg-transparent border-none focus:outline-none cursor-pointer appearance-none pr-6 text-sm w-full sm:w-auto"
                  >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="late">Late</option>
                  </select>
                  <ChevronDown size={16} className="text-text/40 absolute right-3" />
                </div>
              </div>
              
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40" size={18} />
                <input
                  type="search"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            
            {/* Bulk Actions: Leader Only */}
            {amILeader && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    showBulkActions 
                      ? 'bg-primary text-white hover:bg-primary-dark' 
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Bulk Actions
                </button>
              </div>
            )}
          </div>

          {showBulkActions && amILeader && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">
                      {selectedPayments.length} selected
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedPayments([]);
                      setShowBulkActions(false);
                    }}
                    className="text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleBulkMarkAsPaid}
                    disabled={selectedPayments.length === 0 || processingPayment === 'bulk'}
                    className="flex-1 sm:flex-none px-3 py-2 bg-success text-white rounded text-sm hover:bg-success/90 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingPayment === 'bulk' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    <span>Mark Paid</span>
                  </button>
                  <button
                    onClick={handleBulkSendReminders}
                    disabled={selectedPayments.length === 0 || processingPayment === 'bulk'}
                    className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 bg-white"
                  >
                    {processingPayment === 'bulk' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Remind</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ MOBILE VIEW: CARD LIST */}
        <div className="block lg:hidden">
          <div className="divide-y divide-gray-100">
            {filteredPayments.map((payment) => {
              const isPaymentOwner = isCurrentUser(payment.userId?._id);
              const canViewThisReceipt = canViewReceipt(payment);
              const isExpanded = expandedPayment === payment._id;

              return (
                <div key={payment._id} className="bg-white">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => togglePaymentExpand(payment._id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {amILeader && showBulkActions && (
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedPayments.includes(payment._id)}
                              onChange={() => handleSelectPayment(payment._id)}
                              className="rounded w-5 h-5 text-primary focus:ring-primary border-gray-300"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text flex flex-wrap items-center gap-1.5">
                            {getMemberNameForReport(payment)}
                            {isCurrentUser(payment.userId?._id) && (
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text/60 mt-0.5 flex items-center gap-2">
                            <span>Cycle #{activeCycleInfo?.cycleNumber || 'N/A'}</span>
                            {payment.userId?.phone && (
                              <>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span>{payment.userId.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="font-bold text-text">{formatCurrency(payment.amount)}</div>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          <span className="capitalize">{payment.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between text-xs text-text/50">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {payment.paidAt ? (
                          <span className="text-success">Paid: {new Date(payment.paidAt).toLocaleDateString()}</span>
                        ) : (
                          <span>Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</span>
                        )}
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 bg-gray-50/30 border-t border-dashed border-gray-100">
                      <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                        <div>
                          <span className="text-xs text-text/40 block mb-0.5">Method</span>
                          <span className="font-medium text-text">{payment.method || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-text/40 block mb-0.5">Verified By</span>
                          <span className="font-medium text-text">{payment.verifiedBy || '-'}</span>
                        </div>
                        {payment.notes && (
                          <div className="col-span-2">
                            <span className="text-xs text-text/40 block mb-0.5">Notes</span>
                            <span className="text-text bg-white px-2 py-1 rounded border border-gray-100 block text-xs">{payment.notes}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        {amILeader ? (
                          <div className="grid grid-cols-2 gap-2">
                            {payment.status !== 'paid' ? (
                              <>
                                <button
                                  onClick={() => handleMarkAsPaid(payment._id)}
                                  disabled={processingPayment === payment._id}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 disabled:opacity-50"
                                >
                                  {processingPayment === payment._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleSendReminder(payment._id)}
                                  disabled={processingPayment === payment._id}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-text rounded-lg text-sm font-medium hover:bg-gray-50"
                                >
                                  <Send size={16} className="text-accent" />
                                  Remind
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDownloadReceipt(payment._id)}
                                  disabled={processingPayment === payment._id}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100"
                                >
                                  <Download size={16} />
                                  Receipt
                                </button>
                                <button
                                  onClick={() => handleMarkAsUnpaid(payment._id)}
                                  disabled={processingPayment === payment._id}
                                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50"
                                >
                                  <RotateCcw size={16} />
                                  Unpaid
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleRemovePayment(payment._id)}
                              className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-error hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Trash2 size={16} />
                              Remove Record
                            </button>
                          </div>
                        ) : (
                          // Member View Actions
                          canViewReceipt(payment) ? (
                            <button
                              onClick={() => handleDownloadReceipt(payment._id)}
                              disabled={processingPayment === payment._id}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100"
                            >
                              {processingPayment === payment._id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                              Download Receipt
                            </button>
                          ) : (
                            <div className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                              <EyeOff size={16} />
                              Read Only
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DESKTOP VIEW: TABLE */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm w-12">
                    {amILeader && (
                      <input
                        type="checkbox"
                        checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded text-primary focus:ring-primary border-gray-300"
                      />
                    )}
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Member</th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Cycle</th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Amount</th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Due Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-text text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const isPaymentOwner = isCurrentUser(payment.userId?._id);
                  const canViewThisReceipt = canViewReceipt(payment);

                  return (
                    <tr key={payment._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        {amILeader && (
                          <input
                            type="checkbox"
                            checked={selectedPayments.includes(payment._id)}
                            onChange={() => handleSelectPayment(payment._id)}
                            className="rounded text-primary focus:ring-primary border-gray-300"
                          />
                        )}
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="font-semibold text-text flex items-center gap-1">
                          {getMemberNameForReport(payment)}
                          {isCurrentUser(payment.userId?._id) && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase ml-2">You</span>
                          )}
                        </div>
                        <div className="text-sm text-text/60 mt-1">{payment.userId?.phone}</div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-gray-100 text-text/70 text-sm font-medium">
                          #{activeCycleInfo?.cycleNumber || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="font-bold text-base">{formatCurrency(payment.amount)}</div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-text/40" />
                          <span className="font-medium text-sm">{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {payment.paidAt && (
                          <div className="text-xs text-success mt-1 font-medium">
                            Paid: {new Date(payment.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          <span className="text-sm font-medium capitalize">
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {amILeader ? (
                            // LEADER VIEW: Full Actions
                            <>
                              <div className="relative">
                                <button
                                  onClick={(e) => toggleActionsMenu(e, payment._id)}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-text/60"
                                >
                                  <MoreVertical size={18} />
                                </button>
                                
                                {showActionsMenu === payment._id && (
                                  <div 
                                    ref={(el) => setActionsMenuRef(payment._id, el)}
                                    className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[180px] overflow-hidden"
                                  >
                                    {payment.status === 'paid' ? (
                                      <>
                                        <button 
                                          onClick={() => handleDownloadReceipt(payment._id)}
                                          disabled={processingPayment === payment._id}
                                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600 disabled:opacity-50"
                                        >
                                          <Download size={16} />
                                          <span>Download Receipt</span>
                                        </button>
                                        <button 
                                          onClick={() => handleMarkAsUnpaid(payment._id)}
                                          disabled={processingPayment === payment._id}
                                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600 disabled:opacity-50"
                                        >
                                          <RotateCcw size={16} />
                                          <span>Mark as Unpaid</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleMarkAsPaid(payment._id)}
                                          disabled={processingPayment === payment._id}
                                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-success disabled:opacity-50"
                                        >
                                          <CheckCircle size={16} />
                                          <span>Mark as Paid</span>
                                        </button>
                                        <button 
                                          onClick={() => handleSendReminder(payment._id)}
                                          disabled={processingPayment === payment._id}
                                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-accent disabled:opacity-50"
                                        >
                                          <Send size={16} />
                                          <span>Send Reminder</span>
                                        </button>
                                      </>
                                    )}
                                    <div className="border-t border-gray-100"></div>
                                    <button
                                      onClick={() => handleRemovePayment(payment._id)}
                                      disabled={processingPayment === payment._id}
                                      className="w-full text-left px-4 py-3 text-sm text-error hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <Trash2 size={16} />
                                      <span>Remove Record</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            // MEMBER VIEW
                            canViewReceipt(payment) ? (
                              <button
                                onClick={() => handleDownloadReceipt(payment._id)}
                                disabled={processingPayment === payment._id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Download size={16} />
                                Receipt
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500 select-none">
                                <EyeOff size={16} className="text-gray-400" />
                                <span className="text-sm font-medium">Read Only</span>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPayments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <DollarSign size={32} className="text-text/40" />
            </div>
            <h3 className="font-semibold text-text text-lg mb-2">No payments found</h3>
            <p className="text-text/60 mb-6 max-w-sm mx-auto text-sm sm:text-base">
              {search || filter !== 'all' ? 'Try adjusting your search or filter criteria' : 'All payments are up to date!'}
            </p>
            {(search || filter !== 'all') && (
              <button 
                onClick={() => {setSearch(''); setFilter('all');}}
                className="text-primary hover:text-primary-dark font-medium text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Action Cards at Bottom - Leader Only */}
      {amILeader && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button 
            onClick={() => {
              const unpaidPayments = filteredPayments.filter(p => p.status !== 'paid');
              if (unpaidPayments.length > 0) {
                handleBulkSendReminders();
              } else {
                toast.success('All payments are already collected!');
              }
            }}
            className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-sm transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send size={20} className="text-accent sm:w-6 sm:h-6" />
              </div>
              <ArrowUpRight size={20} className="text-text/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="font-semibold text-text mb-1 text-sm sm:text-base">Send Bulk Reminders</div>
            <div className="text-xs sm:text-sm text-text/60">Remind all unpaid members</div>
          </button>
          
          <button 
            onClick={() => {
              const paidPayments = filteredPayments.filter(p => p.status === 'paid');
              if (paidPayments.length > 0) {
                toast.success(`Found ${paidPayments.length} receipts to generate`);
                paidPayments.forEach((payment, index) => {
                  setTimeout(() => {
                    handleDownloadReceipt(payment._id);
                  }, index * 1000);
                });
              } else {
                toast.error('No paid payments to generate receipts');
              }
            }}
            className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-sm transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt size={20} className="text-success sm:w-6 sm:h-6" />
              </div>
              <ArrowUpRight size={20} className="text-text/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="font-semibold text-text mb-1 text-sm sm:text-base">Generate Receipts</div>
            <div className="text-xs sm:text-sm text-text/60">For all paid payments</div>
          </button>
          
          <button 
            onClick={handleViewReport}
            className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-sm transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={20} className="text-primary sm:w-6 sm:h-6" />
              </div>
              <ArrowUpRight size={20} className="text-text/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="font-semibold text-text mb-1 text-sm sm:text-base">View Report</div>
            <div className="text-xs sm:text-sm text-text/60">Payment analytics & insights</div>
          </button>
        </div>
      )}
    </div>
  );
}