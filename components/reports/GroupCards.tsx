'use client';
import { Users, ChevronRight } from 'lucide-react';

interface Props {
  groups: any[];
  selectedId: string;
  onSelect: (group: any) => void;
}

export default function GroupCards({ groups, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div 
          key={group.id}
          onClick={() => onSelect(group)}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedId === group.id 
              ? 'bg-indigo-50 border-primary ring-1 ring-primary shadow-sm' 
              : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{group.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
                  group.role === 'leader' ? 'bg-amber-100 text-amber-700' :
                  group.role === 'sub_leader' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {group.role.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users size={12} /> {group.memberCount}
                </span>
              </div>
            </div>
            {selectedId === group.id && <ChevronRight size={18} className="text-primary-500" />}
          </div>
          
          <div className="mt-3 flex justify-between items-end">
            <div>
              <div className="text-xs text-gray-500">Collected</div>
              <div className="text-sm font-bold text-gray-900">₹{(group.totalCollected / 1000).toFixed(1)}k</div>
            </div>
            <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${Math.min((group.totalCollected / (group.target || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}