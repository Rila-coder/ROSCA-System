import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';

export default function YourGroups({ groups }: { groups: any[] }) {
  if (!groups || groups.length === 0) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Active Groups</h2>
            <p className="text-gray-500 text-sm mb-4">You haven't joined any savings groups yet.</p>
            <Link href="/groups/create" className="text-primary font-medium hover:underline">
                Create a Group &rarr;
            </Link>
        </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Your Groups</h2>
        <Link href="/groups" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
          View All <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <Link key={group._id} href={`/groups/${group._id}`} className="block">
            <div className="p-4 border border-gray-100 rounded-xl hover:border-primary/30 hover:shadow-md transition-all bg-gray-50/50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-primary">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{group.name}</h3>
                            <p className="text-xs text-gray-500">
                                {group.members} Members • {group.frequency}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                        group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {group.status}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pool Value</span>
                        <span className="font-bold text-gray-900">{formatCurrency(group.totalPool)}</span>
                    </div>
                    
                    <div className="relative pt-1">
                        <div className="flex mb-1 items-center justify-between">
                            <span className="text-xs font-semibold inline-block text-primary">
                                Cycle {group.currentCycle}/{group.duration}
                            </span>
                            <span className="text-xs font-semibold inline-block text-primary">
                                {group.progress}%
                            </span>
                        </div>
                        <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-primary/10">
                            <div style={{ width: `${group.progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"></div>
                        </div>
                    </div>
                </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}