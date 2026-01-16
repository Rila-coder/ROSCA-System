import { CheckCircle, Activity } from 'lucide-react';

export default function RecentActivity({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
      
      <div className="space-y-4">
        {activities.map((item, index) => (
          <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
            <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle size={16} />
                </div>
            </div>
            <div>
                <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                <p className="text-xs text-gray-500">{item.description}</p>
                <span className="text-[10px] text-gray-400 mt-1 block">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}