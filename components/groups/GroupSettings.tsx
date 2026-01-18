'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Lock, Users, DollarSign, Calendar, Save, Trash2,
  AlertTriangle, Key, Copy, CheckCircle, Loader2, RefreshCw, UserCheck, Shield, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface GroupSettingsProps {
  group: any;
}

export default function GroupSettings({ group }: GroupSettingsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [currentMemberCount, setCurrentMemberCount] = useState(0);
  // ✅ NEW: Track states
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
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
      
      setCurrentMemberCount(data.currentMemberCount || 0);
      setHasStarted(data.hasStarted || false); // ✅ Check if cycles exist
      setIsCompleted(data.isCompleted || false); // ✅ Check if completed

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
    // ✅ Disable copy if completed
    if (isCompleted) {
        toast.error("Group is completed. Cannot invite new members.");
        return;
    }

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
    if(isCompleted) return; // Prevent if completed
    
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

  const handleSaveSettings = async () => {
    // ✅ Block save if completed
    if (isCompleted) {
        toast.error("Group is completed. Settings cannot be changed.");
        return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/groups/${group._id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }
      
      toast.success(data.message || 'Settings updated successfully');
      
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

  // ✅ Render Banners Helper
  const renderStatusBanner = () => {
      if (isCompleted) {
          return (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                    <h4 className="font-bold text-green-800">Group Completed</h4>
                    <p className="text-sm text-green-700">Total cycles of this group are completed. Settings are read-only.</p>
                </div>
            </div>
          );
      }
      if (hasStarted && activeTab === 'general') {
          return (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-yellow-600" size={24} />
                <div>
                    <h4 className="font-bold text-yellow-800">Cycle In Progress</h4>
                    <p className="text-sm text-yellow-700">Some settings (Amount, Frequency) cannot be changed once cycles have started.</p>
                </div>
            </div>
          );
      }
      return null;
  };

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
                    disabled={isCompleted} // ✅ Disabled if completed
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${isCompleted ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
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
                        // ✅ Disabled if Started OR Completed
                        disabled={hasStarted || isCompleted} 
                        className={`w-full px-4 py-2.5 border rounded-lg pl-10 focus:outline-none focus:border-primary ${hasStarted || isCompleted ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`} 
                      />
                  </div>
                  {hasStarted && !isCompleted && <p className="text-xs text-orange-600 mt-1">Cannot change during active cycles.</p>}
               </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select 
                value={settings.frequency} 
                onChange={(e) => setSettings({...settings, frequency: e.target.value})} 
                disabled={hasStarted || isCompleted} 
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${hasStarted || isCompleted ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {hasStarted && !isCompleted && <p className="text-xs text-orange-600 mt-1">Cannot change frequency during active cycles.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                value={settings.description} 
                onChange={(e) => setSettings({...settings, description: e.target.value})} 
                disabled={isCompleted}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary h-24 ${isCompleted ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`} 
                placeholder="Describe your ROSCA group..."
              />
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-text mb-2">Bank Account Details</h3>
            {isCompleted && <p className="text-xs text-orange-600">Group completed. Bank details read-only.</p>}
            
            <input 
              type="text" 
              placeholder="Bank Name" 
              value={settings.bankName} 
              disabled={isCompleted}
              onChange={(e) => setSettings({...settings, bankName: e.target.value})} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${isCompleted ? 'bg-gray-100' : 'border-gray-300'}`}
            />
            <input 
              type="text" 
              placeholder="Account Number" 
              value={settings.accountNumber} 
              disabled={isCompleted}
              onChange={(e) => setSettings({...settings, accountNumber: e.target.value})} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${isCompleted ? 'bg-gray-100' : 'border-gray-300'}`}
            />
            <input 
              type="text" 
              placeholder="Account Holder Name" 
              value={settings.accountHolder} 
              disabled={isCompleted}
              onChange={(e) => setSettings({...settings, accountHolder: e.target.value})} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${isCompleted ? 'bg-gray-100' : 'border-gray-300'}`}
            />
            <input 
              type="text" 
              placeholder="IFSC / Branch Code" 
              value={settings.ifscCode} 
              disabled={isCompleted}
              onChange={(e) => setSettings({...settings, ifscCode: e.target.value})} 
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary ${isCompleted ? 'bg-gray-100' : 'border-gray-300'}`}
            />
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="font-medium text-text mb-4">Invite & Rules</h3>
            {isCompleted && <p className="text-sm text-red-500 mb-2">Settings disabled because group is completed.</p>}
            
            {/* Max Members */}
            <div className={`flex justify-between items-center p-4 border border-gray-200 rounded-lg ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}>
                <div>
                    <div className="font-medium">Max Members</div>
                    <div className="text-sm text-text/60">
                        Stop invites when limit reached. 
                        <span className="text-primary font-bold ml-1">
                            (Current: {currentMemberCount})
                        </span>
                    </div>
                </div>
                <input 
                    type="number" 
                    value={settings.maxMembers} 
                    disabled={isCompleted}
                    onChange={(e) => setSettings({...settings, maxMembers: parseInt(e.target.value)})} 
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center focus:outline-none focus:border-primary" 
                    min={currentMemberCount} 
                    max="100" 
                />
            </div>

            <div className={`flex justify-between items-center p-4 border border-gray-200 rounded-lg ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}>
                <div>
                    <div className="font-medium">Require Approval</div>
                    <div className="text-sm text-text/60">Manually approve join requests</div>
                </div>
                <input 
                    type="checkbox" 
                    checked={settings.requireApproval} 
                    disabled={isCompleted}
                    onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})} 
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/30" 
                />
            </div>

            <div className={`flex justify-between items-center p-4 border border-gray-200 rounded-lg ${isCompleted ? 'bg-gray-50' : 'bg-white'}`}>
                <div>
                    <div className="font-medium">Payment Confirmation</div>
                    <div className="text-sm text-text/60">Leader must confirm payments</div>
                </div>
                <input 
                    type="checkbox" 
                    checked={settings.requirePaymentConfirmation} 
                    disabled={isCompleted}
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
                    value={isCompleted ? "Group is closed for new members" : displayLink} 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none text-gray-500" 
                    disabled
                  />
                  {!isCompleted && (
                      <>
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
                      </>
                  )}
               </div>
            </div>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            <h3 className="font-medium text-error mb-2">Danger Zone</h3>
            
            {/* ✅ HIDE TRANSFER IF COMPLETED */}
            {!isCompleted ? (
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
            ) : (
                <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">Transfer Leadership is disabled because the group is completed.</p>
                </div>
            )}

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
            
            {/* ✅ DELETE CONFIRMATION POPUP */}
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
          
          {/* ✅ Show Status Banner */}
          {renderStatusBanner()}

          {renderTabContent()}
          
          {activeTab !== 'danger' && !isCompleted && (
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