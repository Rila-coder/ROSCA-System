'use client';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';

interface Props {
  groups: any[];
  currentUserId: string;
}

export default function PaymentStats({ groups, currentUserId }: Props) {
  // Initialize counters for CURRENT USER only
  let userTotalCollected = 0;
  let userTotalPending = 0;
  let userPaidCount = 0;
  let userPendingCount = 0;
  let userTotalCount = 0;

  // Calculate only for current user
  groups.forEach(group => {
    group.cycles.forEach((cycle: any) => {
      cycle.payments.forEach((p: any) => {
        // Only count payments belonging to current user
        if (p.userId === currentUserId) {
          userTotalCount++;
          if (p.status === 'paid') {
            userTotalCollected += p.amount;
            userPaidCount++;
          } else {
            userTotalPending += p.amount;
            userPendingCount++;
          }
        }
      });
    });
  });

  // Calculate completion rate based on count, not amount
  const userCompletionRate = userTotalCount > 0 
    ? Math.round((userPaidCount / userTotalCount) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {/* Card 1: Your Collected */}
      <div className="card p-3 md:p-4 flex justify-between border items-center">
        <div>
          <div className="text-xl md:text-2xl font-bold">₹{userTotalCollected.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">Your Collected</div>
          <div className="text-xs font-medium text-green-600 mt-0.5 md:mt-1">
            {userPaidCount} payment{userPaidCount !== 1 ? 's' : ''} paid
          </div>
        </div>
        <div className="p-2 md:p-3 rounded-xl bg-green-100">
          <div className="hidden md:block">
            <DollarSign className="text-green-600" size={24} />
          </div>
          <div className="md:hidden">
            <DollarSign className="text-green-600" size={20} />
          </div>
        </div>
      </div>

      {/* Card 2: Your Pending */}
      <div className="card p-3 md:p-4 flex justify-between border items-center">
        <div>
          <div className="text-xl md:text-2xl font-bold">₹{userTotalPending.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500">Your Pending</div>
          <div className="text-xs font-medium text-amber-600 mt-0.5 md:mt-1">
            {userPendingCount} payment{userPendingCount !== 1 ? 's' : ''} pending
          </div>
        </div>
        <div className="p-2 md:p-3 rounded-xl bg-orange-100">
          <div className="hidden md:block">
            <Clock className="text-orange-600" size={24} />
          </div>
          <div className="md:hidden">
            <Clock className="text-orange-600" size={20} />
          </div>
        </div>
      </div>

      {/* Card 3: Your Completion Rate */}
      <div className="card p-3 md:p-4 flex justify-between border items-center">
        <div>
          <div className="text-xl md:text-2xl font-bold">{userCompletionRate}%</div>
          <div className="text-xs text-gray-500">Your Completion</div>
          <div className="text-xs font-medium text-blue-600 mt-0.5 md:mt-1">
            {userPaidCount} of {userTotalCount} payments
          </div>
        </div>
        <div className="p-2 md:p-3 rounded-xl bg-blue-100">
          <div className="hidden md:block">
            <CheckCircle className="text-blue-600" size={24} />
          </div>
          <div className="md:hidden">
            <CheckCircle className="text-blue-600" size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}