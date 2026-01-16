'use client';

import { User, Wallet, CheckCircle, PieChart, BarChart3, Download } from 'lucide-react';
import { useState } from 'react';
import DynamicChart from '@/components/reports/DynamicChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentItem {
  group: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface Member {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Group {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: string;
}

interface Payment {
  _id: string;
  memberId: string;
  groupId: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'late';
}

interface ReportData {
  name: string;
  email: string;
  totalPaid: number;
  totalPending: number;
  activeGroups: number;
  paymentHistory: PaymentItem[];
  chartData: {
    labels: string[];
    values: number[];
    summary: { collected: number; pending: number };
  };
  groups?: Group[];
  members?: Member[];
  payments?: Payment[];
}

export default function GeneralReport({ data }: { data: ReportData }) {
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const generatePDF = () => {
    if (!data.groups || !data.members || !data.payments) {
      console.warn('Insufficient data for PDF generation');
      return;
    }

    setGeneratingPDF(true);
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('ROSCA Group Report', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`User: ${data.name}`, 20, 35);
      doc.text(`Email: ${data.email}`, 20, 42);
      doc.text(`Total Contribution: ₹${data.totalPaid.toLocaleString()}`, 20, 49);
      doc.text(`Active Groups: ${data.activeGroups}`, 20, 56);
      
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 140, 35);
      
      doc.setFontSize(14);
      doc.text('Group Summary', 20, 70);
      
      const groupRows = data.groups.map(group => [
        group.name,
        `₹${group.contributionAmount.toLocaleString()}`,
        group.frequency,
        group._id.slice(-6)
      ]);
      
      autoTable(doc, {
        startY: 75,
        head: [['Group Name', 'Contribution', 'Frequency', 'Group ID']],
        body: groupRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(14);
      doc.text('Payment History', 20, finalY + 15);
      
      const paymentRows = data.payments.map(payment => {
        const member = data.members?.find(m => m._id === payment.memberId);
        const memberName = member ? member.name : "Unknown Member";
        const group = data.groups?.find(g => g._id === payment.groupId);
        const groupName = group ? group.name : "Unknown Group";

        return [
          memberName,
          groupName,
          new Date(payment.dueDate).toLocaleDateString(),
          `₹${payment.amount.toLocaleString()}`,
          payment.status
        ];
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Member', 'Group', 'Due Date', 'Amount', 'Status']],
        body: paymentRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      const finalY2 = (doc as any).lastAutoTable?.finalY || finalY + 40;
      doc.setFontSize(14);
      doc.text('Financial Summary', 20, finalY2 + 15);
      
      doc.setFontSize(12);
      doc.text(`Total Paid: ₹${data.totalPaid.toLocaleString()}`, 20, finalY2 + 25);
      doc.text(`Total Pending: ₹${data.totalPending.toLocaleString()}`, 20, finalY2 + 35);
      
      doc.save(`ROSCA-Report-${data.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Financial Report</h1>
          <p className="text-xs md:text-sm text-gray-600">Overview of your contributions and groups</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={generatingPDF}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium w-full sm:w-auto"
        >
          <Download size={16} />
          {generatingPDF ? 'Generating...' : 'Export PDF'}
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-2 md:p-3 bg-blue-100 text-primary rounded-full shrink-0">
            <User size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs md:text-sm text-gray-500">Account</div>
            <div className="font-bold text-gray-900 truncate">{data.name}</div>
            <div className="text-xs text-gray-400 truncate">{data.email}</div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-2 md:p-3 bg-green-100 text-green-600 rounded-full shrink-0">
            <Wallet size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm text-gray-500">Total Contribution</div>
            <div className="font-bold text-gray-900 text-lg md:text-xl">₹{data.totalPaid.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-2 md:p-3 bg-purple-100 text-purple-600 rounded-full shrink-0">
            <CheckCircle size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm text-gray-500">Active Groups</div>
            <div className="font-bold text-gray-900 text-lg md:text-xl">{data.activeGroups}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-bold text-gray-900">Your Financial Analysis</h2>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setChartView('bar')}
                className={`p-1.5 md:p-2 rounded-md transition-all ${chartView === 'bar' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                title="Monthly Trends"
              >
                <BarChart3 size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
              <button 
                onClick={() => setChartView('pie')}
                className={`p-1.5 md:p-2 rounded-md transition-all ${chartView === 'pie' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                title="Paid vs Pending"
              >
                <PieChart size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <DynamicChart type={chartView} data={data} />
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-bold text-gray-900">Payment History</h2>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {data.paymentHistory.length > 0 ? (
            data.paymentHistory.map((item: PaymentItem, i: number) => (
              <div key={i} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.group}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{new Date(item.date).toLocaleDateString()}</div>
                  </div>
                  <div className="font-bold text-gray-900">₹{item.amount.toLocaleString()}</div>
                </div>
                <div className="flex justify-end">
                  <span className={`px-2 py-0.5 text-[10px] rounded-full capitalize font-medium ${
                    item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">
              No payment history found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Group Context</th>
                <th className="px-6 py-4">Transaction Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {data.paymentHistory.length > 0 ? (
                data.paymentHistory.map((item: PaymentItem, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.group}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">₹{item.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs rounded-full capitalize font-medium ${
                        item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}