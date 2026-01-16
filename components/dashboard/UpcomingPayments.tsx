import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function UpcomingPayments({ payments }: { payments: any[] }) {
  if (!payments || payments.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
            <h3 className="font-bold text-gray-900">All Caught Up!</h3>
            <p className="text-xs text-gray-500">No pending payments.</p>
        </div>
      );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // ✅ NEW: Helper to safely format dates
  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Check if date is invalid
      if (isNaN(date.getTime())) return 'Date pending';
      
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Upcoming Payments</h2>
        <Calendar className="text-gray-400" size={20} />
      </div>

      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment._id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-gray-900 text-sm truncate max-w-[120px]">{payment.groupName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                    payment.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {payment.priority === 'high' ? 'Urgent' : 'Pending'}
                </span>
            </div>
            
            <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> 
                    {/* ✅ USE FORMATTER HERE */}
                    Due: {formatDate(payment.dueDate)}
                </div>
                <div className="font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link href="/payments" className="block w-full text-center py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            Pay Now
        </Link>
      </div>
    </div>
  );
}