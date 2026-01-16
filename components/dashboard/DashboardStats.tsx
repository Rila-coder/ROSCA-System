import { 
  Wallet, TrendingUp, Users, Calendar, ArrowUpRight 
} from 'lucide-react';

export default function DashboardStats({ stats }: { stats: any }) {
  if (!stats) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const items = [
    {
      title: 'Total Savings',
      value: formatCurrency(stats.totalSavings),
      icon: <Wallet className="text-primary" size={24} />,
      color: 'bg-primary/10',
      textColor: 'text-primary'
    },
    {
      title: 'Active Groups',
      value: stats.activeGroups,
      icon: <Users className="text-secondary" size={24} />,
      color: 'bg-secondary/10',
      textColor: 'text-secondary'
    },
    {
      title: 'Pending Dues',
      value: formatCurrency(stats.pendingPayments),
      icon: <TrendingUp className="text-orange-500" size={24} />,
      color: 'bg-orange-100',
      textColor: 'text-orange-600'
    },
    {
      title: 'Next Draw',
      value: stats.nextDrawDate,
      icon: <Calendar className="text-green-500" size={24} />,
      color: 'bg-green-100',
      textColor: 'text-green-600'
    },
  ];

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-3 rounded-lg ${item.color}`}>
              {item.icon}
            </div>
            {index === 0 && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+Active</span>}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{item.value}</h3>
            <p className="text-sm text-gray-500 font-medium">{item.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}