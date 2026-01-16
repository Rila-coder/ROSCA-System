import { PlusCircle, Users, CreditCard, BarChart3, Bell, Settings } from 'lucide-react';
import Link from 'next/link';

const actions = [
  { title: 'Create Group', icon: <PlusCircle size={20} />, path: '/groups/create', color: 'bg-blue-50 text-blue-600' },
  { title: 'My Groups', icon: <Users size={20} />, path: '/groups', color: 'bg-purple-50 text-purple-600' },
  { title: 'Payments', icon: <CreditCard size={20} />, path: '/payments', color: 'bg-green-50 text-green-600' },
  { title: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', color: 'bg-orange-50 text-orange-600' },
  { title: 'Alerts', icon: <Bell size={20} />, path: '/notifications', color: 'bg-red-50 text-red-600' },
  { title: 'Settings', icon: <Settings size={20} />, path: '/settings', color: 'bg-gray-50 text-gray-600' },
];

export default function QuickActions() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link key={index} href={action.path} className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-gray-50 transition-all text-center group">
            <div className={`p-2 rounded-lg mb-2 ${action.color} group-hover:scale-110 transition-transform`}>
                {action.icon}
            </div>
            <span className="text-xs font-medium text-gray-700">{action.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}