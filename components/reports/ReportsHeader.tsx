'use client';

import { useState } from 'react';
import { BarChart3, FileText, Download, X } from 'lucide-react';

interface Props {
  viewMode: 'groups' | 'general';
  setViewMode: (mode: 'groups' | 'general') => void;
  onExport: (format: 'pdf' | 'excel', type: 'group' | 'general', id?: string) => void;
  groups: any[]; 
}

export default function ReportsHeader({ viewMode, setViewMode, onExport, groups }: Props) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportGroupId, setExportGroupId] = useState('');

  // Filter groups where user is Leader or Sub-leader
  const adminGroups = groups?.filter(g => g.role === 'leader' || g.role === 'sub_leader') || [];

  const handleAdminExport = () => {
    if (adminGroups.length === 1) {
       onExport('pdf', 'group', adminGroups[0].id);
    } else {
       setExportGroupId(adminGroups[0]?.id || '');
       setShowExportModal(true);
    }
  };

  const confirmExport = () => {
     if (exportGroupId) {
         onExport('pdf', 'group', exportGroupId);
         setShowExportModal(false);
     }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-0 md:mt-5 lg:mt-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 md:p-3 bg-indigo-100 text-primary rounded-xl shrink-0">
          <BarChart3 size={24} className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-xs text-gray-500">Financial insights and performance</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* View Toggles */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setViewMode('groups')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              viewMode === 'groups' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Group Analysis
          </button>
          <button
            onClick={() => setViewMode('general')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              viewMode === 'general' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            General Report
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* 1. General Export (Always visible) */}
          <button 
             onClick={() => onExport('pdf', 'general')}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs md:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
             title="Download My Personal Report"
          >
             <Download size={16} /> My Report
          </button>

          {/* 2. Admin Export - ✅ FIX: Only visible in 'groups' mode */}
          {adminGroups.length > 0 && viewMode === 'groups' && (
            <button 
              onClick={handleAdminExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-xs md:text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm whitespace-nowrap"
            >
              <FileText size={16} /> Group Report
            </button>
          )}
        </div>
      </div>

      {/* Export Selection Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-sm p-5 md:p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-gray-800">Select Group Report</h3>
                 <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="mb-6">
                 <label className="block text-sm font-medium mb-2 text-gray-700">Choose Group</label>
                 <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm"
                    value={exportGroupId}
                    onChange={(e) => setExportGroupId(e.target.value)}
                 >
                    {adminGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                 </select>
                 <p className="text-xs text-gray-500 mt-2">Downloads full payment history for all members in this group.</p>
              </div>

              <div className="flex justify-end gap-3">
                 <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button onClick={confirmExport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium">
                    <Download size={16}/> Download
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}