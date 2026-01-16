'use client';

import { Filter, UserCheck, RefreshCw } from 'lucide-react';

interface Props {
  filters: any;
  setFilters: any;
  availableGroups: { id: string, name: string }[];
  maxCycles: number;
}

export default function PaymentFilters({ filters, setFilters, availableGroups, maxCycles }: Props) {
  
  const cycleOptions = Array.from({ length: maxCycles }, (_, i) => i + 1);

  return (
    <div className="card bg-white p-3 md:p-4 lg:p-4 rounded-xl border border-gray-200 shadow-sm lg:sticky lg:top-4 xl:top-6 w-full">
      <div className="flex items-center justify-between mb-3 md:mb-4 lg:mb-5">
        <div className="flex items-center gap-1.5 md:gap-2 text-gray-800">
          <div className="hidden lg:block">
            <Filter className="text-primary" size={20} />
          </div>
          <div className="hidden md:block lg:hidden">
            <Filter className="text-primary" size={18} />
          </div>
          <div className="md:hidden">
            <Filter className="text-primary" size={16} />
          </div>
          <h3 className="font-bold text-sm md:text-base lg:text-lg whitespace-nowrap">Filters</h3>
        </div>
        <button 
          onClick={() => setFilters({ status: 'all', group: 'all', cycle: 'all', showMyPaymentsOnly: false, search: '' })}
          className="p-1 md:p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors flex-shrink-0"
          title="Reset Filters"
        >
          <div className="hidden lg:block">
            <RefreshCw size={16} />
          </div>
          <div className="hidden md:block lg:hidden">
            <RefreshCw size={14} />
          </div>
          <div className="md:hidden">
            <RefreshCw size={12} />
          </div>
        </button>
      </div>
      
      <div className="space-y-3 md:space-y-4 lg:space-y-5">
        
        {/* Your Payments Toggle - FIXED WIDTH ISSUE */}
        <div 
          onClick={() => setFilters((prev: any) => ({ ...prev, showMyPaymentsOnly: !prev.showMyPaymentsOnly }))}
          className={`cursor-pointer flex items-center justify-between p-2.5 md:p-3 lg:p-3 rounded-lg border transition-all w-full ${
            filters.showMyPaymentsOnly 
              ? 'bg-primary/5 border-primary text-primary shadow-sm' 
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm lg:text-base flex-1 min-w-0">
            <div className="hidden lg:block">
              <UserCheck size={18} />
            </div>
            <div className="hidden md:block lg:hidden">
              <UserCheck size={16} />
            </div>
            <div className="md:hidden">
              <UserCheck size={14} />
            </div>
            <span className="truncate">Your Payments</span>
          </div>
          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-2 ${
            filters.showMyPaymentsOnly ? 'bg-primary border-primary' : 'border-gray-300'
          }`}>
            {filters.showMyPaymentsOnly && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Group Filter */}
        <div className="w-full">
           <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 md:mb-2 tracking-wider">Select Group</label>
           <select 
             className="w-full p-2 md:p-2.5 lg:p-3 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
             value={filters.group}
             onChange={(e) => setFilters((prev: any) => ({ ...prev, group: e.target.value }))}
           >
             <option value="all">All Groups</option>
             {availableGroups.map(g => (
               <option key={g.id} value={g.id} className="truncate">{g.name}</option>
             ))}
           </select>
        </div>

        {/* Cycle Filter (Dynamic) */}
        <div className="w-full">
           <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 md:mb-2 tracking-wider">Cycle Number</label>
           <select 
             className="w-full p-2 md:p-2.5 lg:p-3 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
             value={filters.cycle}
             onChange={(e) => setFilters((prev: any) => ({ ...prev, cycle: e.target.value }))}
           >
             <option value="all">All Cycles</option>
             {cycleOptions.map(num => (
               <option key={num} value={num.toString()}>Cycle {num}</option>
             ))}
           </select>
        </div>

        {/* Status Filter */}
        <div className="w-full">
           <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 md:mb-2 tracking-wider">Payment Status</label>
           <select 
             className="w-full p-2 md:p-2.5 lg:p-3 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
             value={filters.status}
             onChange={(e) => setFilters((prev: any) => ({ ...prev, status: e.target.value }))}
           >
             <option value="all">All Status</option>
             <option value="paid">Paid</option>
             <option value="pending">Pending</option>
           </select>
        </div>
      </div>
    </div>
  );
}