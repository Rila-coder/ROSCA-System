'use client';

import { Filter } from 'lucide-react';

interface Props {
  filters: { role: string; status: string; group: string; search: string };
  setFilters: React.Dispatch<React.SetStateAction<{ role: string; status: string; group: string; search: string }>>;
  groups: { id?: string; _id?: string; name: string }[];
}

export default function MembersFilters({ filters, setFilters, groups }: Props) {
  return (
    <div className="card h-full bg-white p-4 md:p-5 shadow-sm border border-gray-100 rounded-xl">
      <div className="flex items-center gap-2 mb-4 md:mb-6 text-gray-800">
        <Filter className="text-primary" size={20} />
        <h3 className="font-bold text-sm md:text-base">Filters</h3>
      </div>
      
      <div className="space-y-4 md:space-y-5">
        {/* Group Filter */}
        <div>
           <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Group</label>
           <select 
             className="w-full p-2 md:p-2.5 text-xs md:text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
             value={filters.group}
             onChange={(e) => setFilters(prev => ({ ...prev, group: e.target.value }))}
           >
             <option value="all">All Groups</option>
             {/* ✅ Handle both id formats safely */}
             {groups && groups.length > 0 ? (
               groups.map((group) => (
                 <option key={group._id || group.id} value={group._id || group.id}>
                   {group.name}
                 </option>
               ))
             ) : (
               <option disabled>No groups available</option>
             )}
           </select>
        </div>

        {/* Role Filter */}
        <div>
           <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Role</label>
           <select 
             className="w-full p-2 md:p-2.5 text-xs md:text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
             value={filters.role}
             onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
           >
             <option value="all">All Roles</option>
             <option value="leader">Leader</option>
             <option value="sub_leader">Sub-Leader</option>
             <option value="member">Member</option>
           </select>
        </div>

        {/* Status Filter - ✅ Removed Inactive */}
        <div>
           <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Status</label>
           <select 
             className="w-full p-2 md:p-2.5 text-xs md:text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
             value={filters.status}
             onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
           >
             <option value="all">All Status</option>
             <option value="active">Active</option>
             <option value="pending">Pending</option>
           </select>
        </div>
        
        {/* Reset Button */}
        <button 
          onClick={() => setFilters({ role: 'all', status: 'all', group: 'all', search: '' })}
          className="w-full py-2 md:py-2.5 text-xs md:text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors border border-dashed border-gray-300 mt-2"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}