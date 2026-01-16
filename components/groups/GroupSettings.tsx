'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Lock, Users, DollarSign, Calendar, Save, Trash2,
  AlertTriangle, Key, Copy, CheckCircle, Loader2, RefreshCw, UserCheck, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface GroupSettingsProps {
  group: any;
}

export default function GroupSettings({ group }: GroupSettingsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [currentMemberCount, setCurrentMemberCount] = useState(0); // ✅ NEW STATE
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Danger Zone States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferUI, setShowTransferUI] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedNewLeader, setSelectedNewLeader] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (group && group._id) {
        fetchSettings();
    }
  }, [group._id]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/groups/${group._id}/settings`);
      
      if (!response.ok) {
          if (response.status === 403) {
              toast.error("You are not authorized to view settings");
              return;
          }
          throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      
      // ✅ Set current member count for validation
      setCurrentMemberCount(data.currentMemberCount || 0);

      setSettings(data.settings || {
        groupName: group.name,
        description: group.description || '',
        contributionAmount: group.contributionAmount,
        frequency: group.frequency,
        requirePaymentConfirmation: true,
        bankName: '', accountNumber: '', accountHolder: '', ifscCode: '',
        requireApproval: true, maxMembers: 20
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // ... (Keep existing fetchMembers, handleTransferLeadership, handleDeleteGroup functions) ...
  // Re-paste them from your code or assume they are here
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/groups/${group._id}/members`);
      const data = await res.json();
      
      const eligibleMembers = (data.members || []).filter((m: any) => {
        const hasUserAccount = m.userId && (m.userId._id || m.userId); 
        const isNotLeader = String(m.userId?._id || m.userId) !== String(group.leaderId);
        const isActive = m.status === 'active'; 

        return hasUserAccount && isNotLeader && isActive; 
      });

      setMembers(eligibleMembers);
    } catch (error) {
      console.error(error);
      toast.error("Could not load members list");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleTransferLeadership = async () => {
    if (!selectedNewLeader) return toast.error("Select a member first");
    if (!confirm("Are you sure? You will lose admin access immediately.")) return;

    try {
      const response = await fetch(`/api/groups/${group._id}/transfer-leadership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newLeaderId: selectedNewLeader })
      });

      if (response.ok) {
        toast.success("Leadership Transferred! Redirecting...");
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Transfer failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Transfer failed");
    }
  };

  const handleDeleteGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${group._id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        toast.success('Group deleted successfully!');
        setTimeout(() => router.push('/groups'), 1500);
      } else {
        throw new Error('Failed to delete group');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/public-invite/${group._id}/${group.inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRegenerateInviteLink = async () => {
    if (!confirm("Regenerate new invite link? Old link will stop working.")) return;
    try {
      const response = await fetch(`/api/groups/${group._id}/settings/public/${group.inviteCode}/regenerate-invite`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('New invite link generated!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Failed to regenerate link');
      }
    } catch (error) {
      toast.error('Failed to regenerate invite link');
    }
  };

  // ✅ UPDATED: Handle Save with Error Catching for Max Members
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/groups/${group._id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();

      if (!response.ok) {
        // ✅ Show the specific error message from backend (e.g. "Group already has X members")
        throw new Error(data.error || 'Failed to save settings');
      }
      
      toast.success(data.message || 'Settings updated successfully');
      
      // Update local state without reload if possible
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'bank', label: 'Bank Details', icon: <DollarSign size={16} /> },
    { id: 'security', label: 'Rules & Access', icon: <Lock size={16} /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const renderTabContent = () => {
    const displayLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/public-invite/${group._id}/${group.inviteCode}`;
    
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-2">Group Name</label>
                  <input 
                    type="text" 
                    value={settings.groupName} 
                    onChange={(e) => setSettings({...settings, groupName: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-2">Contribution Amount</label>
                  <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400"><DollarSign size={16}/></span>
                      <input 
                        type="number" 
                        value={settings.contributionAmount} 
                        onChange={(e) => setSettings({...settings, contributionAmount: parseInt(e.target.value)})} 
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg pl-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                      />
                  </div>
               </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select 
                value={settings.frequency} 
                onChange={(e) => setSettings({...settings, frequency: e.target.value})} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                value={settings.description} 
                onChange={(e) => setSettings({...settings, description: e.target.value})} 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-24" 
                placeholder="Describe your ROSCA group..."
              />
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-text mb-2">Bank Account Details</h3>
            <input 
              type="text" 
              placeholder="Bank Name" 
              value={settings.bankName} 
              onChange={(e) => setSettings({...settings, bankName: e.target.value})} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input 
              type="text" 
              placeholder="Account Number" 
              value={settings.accountNumber} 
              onChange={(e) => setSettings({...settings, accountNumber: e.target.value})} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input 
              type="text" 
              placeholder="Account Holder Name" 
              value={settings.accountHolder} 
              onChange={(e) => setSettings({...settings, accountHolder: e.target.value})} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input 
              type="text" 
              placeholder="IFSC / Branch Code" 
              value={settings.ifscCode} 
              onChange={(e) => setSettings({...settings, ifscCode: e.target.value})} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="font-medium text-text mb-4">Invite & Rules</h3>
            
            {/* ✅ UPDATED: Max Members Input with Current Count Display */}
            <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-white">
                <div>
                    <div className="font-medium">Max Members</div>
                    <div className="text-sm text-text/60">
                        Stop invites when limit reached. 
                        {/* Show current count here */}
                        <span className="text-primary font-bold ml-1">
                            (Current: {currentMemberCount})
                        </span>
                    </div>
                </div>
                <input 
                    type="number" 
                    value={settings.maxMembers} 
                    onChange={(e) => setSettings({...settings, maxMembers: parseInt(e.target.value)})} 
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    min={currentMemberCount} // HTML constraint (soft check)
                    max="100" 
                />
            </div>

            <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-white">
                <div>
                    <div className="font-medium">Require Approval</div>
                    <div className="text-sm text-text/60">Manually approve join requests</div>
                </div>
                <input 
                    type="checkbox" 
                    checked={settings.requireApproval} 
                    onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})} 
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/30" 
                />
            </div>

            <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-white">
                <div>
                    <div className="font-medium">Payment Confirmation</div>
                    <div className="text-sm text-text/60">Leader must confirm payments</div>
                </div>
                <input 
                    type="checkbox" 
                    checked={settings.requirePaymentConfirmation} 
                    onChange={(e) => setSettings({...settings, requirePaymentConfirmation: e.target.checked})} 
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/30" 
                />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <label className="text-sm font-medium block mb-2">Public Invite Link</label>
               <div className="flex gap-2 mt-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={displayLink} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" 
                  />
                  <button 
                    onClick={handleCopyInviteLink}
                    className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    title="Copy invite link"
                  >
                    {copiedLink ? <CheckCircle size={18} className="text-success" /> : <Copy size={18} className="text-text/60" />}
                  </button>
                  <button 
                    onClick={handleRegenerateInviteLink}
                    className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    title="Regenerate new link"
                  >
                    <RefreshCw size={18} className="text-text/60" />
                  </button>
               </div>
               <p className="text-xs text-text/40 mt-2">
                 Share this link to invite members. Anyone with the link can request to join.
               </p>
            </div>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            <h3 className="font-medium text-error mb-2">Danger Zone</h3>
            
            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
               <div className="font-medium text-orange-800 mb-1">Transfer Leadership</div>
               <p className="text-sm text-orange-600 mb-4">
                 Give full control to another member. They must be an <strong>Active</strong> registered user.
               </p>
               
               {!showTransferUI ? (
                   <button 
                     onClick={() => { setShowTransferUI(true); fetchMembers(); }} 
                     className="px-4 py-2 border border-orange-300 text-orange-800 rounded-lg bg-white hover:bg-orange-100 transition-colors"
                   >
                     Select New Leader
                   </button>
               ) : (
                   <div className="space-y-3">
                       <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                             <UserCheck size={16} className="text-orange-600" />
                          </div>
                          <div>
                             <div className="text-sm font-bold text-gray-800">Current Leader: You</div>
                             <div className="text-xs text-gray-500">You are currently managing this group</div>
                          </div>
                       </div>

                       {loadingMembers ? (
                          <div className="text-center py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
                             <Loader2 size={14} className="animate-spin" /> Loading eligible members...
                          </div>
                       ) : members.length > 0 ? (
                           <>
                             <select 
                                 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white" 
                                 value={selectedNewLeader} 
                                 onChange={(e) => setSelectedNewLeader(e.target.value)}
                             >
                                 <option value="">-- Select New Leader from List --</option>
                                 {members.map(m => (
                                   <option key={m.userId._id || m.userId} value={m.userId._id || m.userId}>
                                     {m.userId.name || m.pendingMemberDetails?.name} ({m.userId.email || m.pendingMemberDetails?.email})
                                   </option>
                                 ))}
                             </select>
                             <div className="flex gap-2">
                                 <button 
                                   onClick={handleTransferLeadership} 
                                   className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                 >
                                   Confirm Transfer
                                 </button>
                                 <button 
                                   onClick={() => setShowTransferUI(false)} 
                                   className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                 >
                                   Cancel
                                 </button>
                             </div>
                           </>
                       ) : (
                           <div className="text-sm text-orange-800 bg-orange-100 p-3 rounded">
                             <strong>No eligible members found.</strong><br/>
                             Only members who have <u>registered</u> and have <u>Active status</u> can become leaders. 
                             <button onClick={() => setShowTransferUI(false)} className="block mt-2 text-orange-900 underline">Close</button>
                           </div>
                       )}
                   </div>
               )}
            </div>

            <div className="p-4 border border-error/20 bg-error/5 rounded-lg flex justify-between items-center">
               <div>
                  <div className="font-medium text-error">Delete Group</div>
                  <div className="text-sm text-error/60">Irreversible action. All data will be permanently deleted.</div>
               </div>
               <button 
                 onClick={() => setShowDeleteConfirm(true)} 
                 className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
               >
                 Delete
               </button>
            </div>
            
            {showDeleteConfirm && (
                <div className="mt-4 p-4 bg-white border border-error rounded-lg animate-in fade-in">
                  <div className="flex items-center space-x-2 text-error mb-2">
                    <AlertTriangle size={18} />
                    <span className="font-bold">Are you absolutely sure?</span>
                  </div>
                  <p className="text-sm text-text/60 mb-4">
                    This will permanently delete the group "<strong>{group.name}</strong>" and all associated data.
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)} 
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteGroup} 
                      className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 flex items-center space-x-2 transition-colors"
                    >
                      <Trash2 size={16} /> 
                      <span>Yes, Delete Permanently</span>
                    </button>
                  </div>
                </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
       <div className="lg:col-span-1 space-y-1">
          {tabs.map(tab => (
             <button 
               key={tab.id} 
               onClick={() => setActiveTab(tab.id)} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                 activeTab === tab.id 
                   ? 'bg-primary text-white shadow-sm' 
                   : 'hover:bg-gray-100 text-text/70 hover:text-text'
               }`}
             >
                {tab.icon} 
                <span className="font-medium">{tab.label}</span>
             </button>
          ))}
       </div>
       
       <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-text">Group Settings</h2>
            <p className="text-text/60 text-sm mt-1">Manage your ROSCA group configuration</p>
          </div>
          
          {renderTabContent()}
          
          {activeTab !== 'danger' && (
             <div className="mt-6 pt-6 border-t flex justify-end">
                <button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   Save Changes
                </button>
             </div>
          )}
       </div>
    </div>
  );
}