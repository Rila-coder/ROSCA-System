'use client';
import { Users, UserCheck, Wallet, AlertCircle } from 'lucide-react';

interface Props {
  members: any[];
}

export default function MemberStats({ members }: Props) {
  // Calculate Stats Real-time
  const totalMembers = members.length;
   
  const activeMembers = members.filter(m => 
    m.memberships.some((ms: any) => ms.status === 'active')
  ).length;

  // Sum up total paid across all members
  const totalCollected = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
   
  // Sum up total pending
  const totalPending = members.reduce((sum, m) => sum + (m.totalDue || 0), 0);

  const stats = [
    {
      title: 'Total Members',
      value: totalMembers,
      // FIXED: Merged className and updated size
      icon: <Users className="text-primary md:size-6" size={20} />,
      color: 'bg-primary/10',
    },
    {
      title: 'Active Members',
      value: activeMembers,
      // FIXED: Merged className and updated size
      icon: <UserCheck className="text-success md:size-6" size={20} />,
      color: 'bg-green-100',
    },
    {
      title: 'Total Collected',
      value: `₹${totalCollected.toLocaleString('en-IN')}`,
      // FIXED: Merged className and updated size
      icon: <Wallet className="text-secondary md:size-6" size={20} />,
      color: 'bg-purple-100',
    },
    {
      title: 'Pending Dues',
      value: `₹${totalPending.toLocaleString('en-IN')}`,
      // FIXED: Merged className and updated size
      icon: <AlertCircle className="text-orange-500 md:size-6" size={20} />,
      color: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="card p-3 md:p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <div>
            <div className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 mb-0.5 md:mb-1">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 font-medium line-clamp-1">
              {stat.title}
            </div>
          </div>
          <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.color}`}>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}