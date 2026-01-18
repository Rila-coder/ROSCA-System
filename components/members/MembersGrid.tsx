'use client';

import { useState } from 'react';
import { 
  User, Phone, Crown, Shield, Mail,
  Grid, List,
  Save, Trash2, Edit, Clock, Users,
  CheckCircle // ✅ Imported CheckCircle for success banner
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  members: any[];
  myPermissions: any[];
  currentUserId: string;
  loading: boolean;
  onUpdate: () => void;
  isLeader?: boolean;
}

// Standalone Avatar Component
const MemberAvatar = ({ member }: { member: any }) => {
  const [imageError, setImageError] = useState(false);

  const getAvatarUrl = (member: any) => {
    const isRegisteredUser = member.id && !member.id.toString().startsWith('guest-');
    
    if (member.avatar) {
      return member.avatar;
    }
    
    if (isRegisteredUser) {
      return "/Images/avatar.jpeg";
    }
    
    return null;
  };

  const getMemberInitials = (member: any) => {
    const name = member.name || 'Unknown';
    return name
      .split(' ')
      .map((n: string) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'UN';
  };

  const avatarSrc = getAvatarUrl(member);
  const showImage = avatarSrc && !imageError;

  return (
    <div className="relative">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-gray-100">
        {showImage ? (
          <img 
            src={avatarSrc} 
            alt={member.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="font-bold text-primary text-lg md:text-xl">
            {getMemberInitials(member)}
          </span>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
        {member.roleInGroup === 'leader' ? (
          <Crown size={12} className="text-amber-500" />
        ) : member.roleInGroup === 'sub_leader' ? (
          <Shield size={12} className="text-blue-600" />
        ) : null}
      </div>
    </div>
  );
};

export default function MembersGrid({ 
  members, 
  myPermissions, 
  currentUserId, 
  loading, 
  onUpdate,
  isLeader = false
}: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    groupId: '' 
  });

  const getMyRoleInGroup = (groupId: string) => {
    const permission = myPermissions.find(p => p.groupId === groupId);
    return permission?.role;
  };

  // ✅ NEW: Check if group is completed (Locked)
  const isGroupLocked = (groupId: string) => {
     // Find any member record for this group and check the isGroupCompleted flag
     const memberInGroup = members.find(m => 
        m.memberships.some((ms: any) => ms.groupId === groupId)
     );
     if (!memberInGroup) return false;
     
     const membership = memberInGroup.memberships.find((ms: any) => ms.groupId === groupId);
     return membership?.isGroupCompleted || false;
  };

  const canEditMember = (member: any, groupId: string) => {
    // ✅ 1. Locked Check: If group completed, NO ONE edits.
    if (isGroupLocked(groupId)) return false;

    const myRole = getMyRoleInGroup(groupId);
    const targetRole = member.roleInGroup || member.groupContext?.role;
    
    if (!myRole) return false;
    
    if (myRole === 'member') return false;

    if (myRole === 'leader') return true;

    if (myRole === 'sub_leader') {
      if (targetRole === 'leader') return false;
      return member.id === currentUserId || targetRole === 'member';
    }

    return false;
  };

  const canDeleteMember = (member: any, groupId: string) => {
    if (member.id === currentUserId) return false; 
    
    // ✅ 1. Locked Check
    if (isGroupLocked(groupId)) return false;
    
    const myRole = getMyRoleInGroup(groupId);
    const targetRole = member.roleInGroup || member.groupContext?.role;
    
    if (!myRole) return false;

    if (myRole === 'leader') {
      return targetRole !== 'leader' && member.id !== currentUserId;
    }

    if (myRole === 'sub_leader') {
      return targetRole === 'member' && member.id !== currentUserId;
    }

    return false;
  };

  const canChangeRole = (member: any, groupId: string) => {
    // ✅ 1. Locked Check
    if (isGroupLocked(groupId)) return false;

    const myRole = getMyRoleInGroup(groupId);
    const targetRole = member.roleInGroup || member.groupContext?.role;
    
    if (!myRole) return false;

    return (
      myRole === 'leader' &&
      member.id !== currentUserId &&
      targetRole !== 'leader'
    );
  };

  const hasAnyAction = (member: any, groupId: string) => {
    // ✅ Quick return if locked
    if (isGroupLocked(groupId)) return false;

    return (
      canEditMember(member, groupId) ||
      canDeleteMember(member, groupId) ||
      canChangeRole(member, groupId)
    );
  };

  // ✅ NEW: Check if user can see action messages (leader or sub-leader only)
  const canSeeActionMessages = (groupId: string) => {
    const myRole = getMyRoleInGroup(groupId);
    return myRole === 'leader' || myRole === 'sub_leader';
  };

  // Grouping Logic with Snapshot Data
  const groupMembersByGroup = () => {
    const groupsMap = new Map();
    members.forEach(member => {
      member.memberships.forEach((membership: any) => {
        if (!groupsMap.has(membership.groupId)) {
          groupsMap.set(membership.groupId, {
            id: membership.groupId,
            name: membership.groupName,
            isCompleted: membership.isGroupCompleted, // ✅ Capture status
            members: []
          });
        }
        groupsMap.get(membership.groupId).members.push({
          ...member,
          name: membership.snapshotName || member.name,
          email: membership.snapshotEmail || member.email,
          phone: membership.snapshotPhone || member.phone,
          roleInGroup: membership.role,
          statusInGroup: membership.status,
          groupContext: membership
        });
      });
    });
    return Array.from(groupsMap.values());
  };

  const handleEditClick = (member: any, groupId: string) => {
    if (!canEditMember(member, groupId)) {
      toast.error("You don't have permission to edit this user in this group.");
      return;
    }
    
    const context = member.groupContext;
    setEditingMember(member);
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: context?.role || member.roleInGroup,
      groupId: groupId
    });
  };

  const handleDelete = async (member: any, groupId: string) => {
    if (!canDeleteMember(member, groupId)) {
      toast.error("You don't have permission to delete this user from this group.");
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${member.name} from this group?`)) return;

    try {
      const res = await fetch(`/api/members?userId=${member.id}&groupId=${groupId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Member removed successfully');
      onUpdate(); 
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const handleSave = async () => {
    if (!editingMember) return;

    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingMember.id,
          groupId: editForm.groupId,
          name: editForm.name,
          phone: editForm.phone,
          ...(editForm.role !== (editingMember.roleInGroup || editingMember.groupContext?.role) && {
            role: editForm.role
          })
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      toast.success('Member updated successfully');
      setEditingMember(null);
      onUpdate(); 
    } catch (error: any) {
      toast.error(error.message || 'Failed to update member');
    }
  };

  if (loading) return (
    <div className="py-8 md:py-10 text-center text-gray-500">
      <Clock className="inline w-5 h-5 md:w-6 md:h-6 animate-spin mr-2"/>
      Loading members data...
    </div>
  );
    
  if (members.length === 0) return (
    <div className="py-8 md:py-10 text-center text-gray-500">
      No members found.
    </div>
  );

  const groupedData = groupMembersByGroup();

  return (
    <>
      <div className="space-y-6">
        {/* View Toggle Header */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
              title="Grid view"
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {groupedData.map((group) => {
          const myRoleInThisGroup = getMyRoleInGroup(group.id);
          const isCompleted = group.isCompleted; // ✅ Get completion status
          const showActionMessages = canSeeActionMessages(group.id); // ✅ Check if user can see messages

          return (
          <div key={group.id} className="card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            
            {/* Group Header with My Role */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{group.name}</h3>
                  <p className="text-xs text-gray-500">{group.members.length} Members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  {/* ✅ Show Completed Badge */}
                  {isCompleted && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 border border-green-200">
                          <CheckCircle size={12} />
                          Completed
                      </span>
                  )}
                  {myRoleInThisGroup && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      myRoleInThisGroup === 'leader' 
                        ? 'bg-amber-100 text-amber-800' 
                        : myRoleInThisGroup === 'sub_leader'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {myRoleInThisGroup.replace('_', ' ')}
                    </div>
                  )}
              </div>
            </div>
            
            {/* ✅ SHOW BANNER IF COMPLETED - Only for leaders and sub-leaders */}
            {isCompleted && showActionMessages && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-center">
                    <p className="text-green-800 font-medium text-sm">
                        Total cycles of this group are completed.
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                        Editing or removing members is disabled.
                    </p>
                </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {group.members.map((member: any) => {
                  const hasActions = hasAnyAction(member, group.id);
                  
                  return (
                  <div key={`${member.id}-${group.id}`} className={`border rounded-xl p-3 md:p-4 transition-all flex flex-col h-full relative ${member.id === currentUserId ? 'border-primary/40 bg-primary/5' : 'border-gray-200 bg-white hover:border-primary/50'}`}>
                    
                    <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                      <MemberAvatar member={member} />
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="font-bold text-gray-900 truncate text-sm md:text-base">
                            {member.name}
                          </div>
                          {member.id === currentUserId && (
                            <span className="text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          {member.email}
                        </div>
                      </div>
                      
                      {canEditMember(member, group.id) && (
                        <button 
                          onClick={() => handleEditClick(member, group.id)} 
                          className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                          title="Edit member"
                        >
                          <Edit size={14} className="md:size-4" />
                        </button>
                      )}
                    </div>

                    {/* Role Display */}
                    <div className="flex items-center gap-2 mb-3 md:mb-4 text-sm">
                      {member.roleInGroup === 'leader' ? (
                        <Crown size={14} className="text-amber-500" />
                      ) : member.roleInGroup === 'sub_leader' ? (
                        <Shield size={14} className="text-blue-600" />
                      ) : (
                        <User size={14} className="text-gray-400" />
                      )}
                      <span className={`capitalize font-medium ${member.roleInGroup === 'leader' ? 'text-amber-600' : member.roleInGroup === 'sub_leader' ? 'text-blue-600' : 'text-gray-600'}`}>
                        {member.roleInGroup.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${member.statusInGroup === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                        {member.statusInGroup}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-3 md:mb-4 text-xs md:text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={12} className="text-gray-400" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gray-400" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>

                    <div className="pt-2 md:pt-3 border-t flex gap-1.5 md:gap-2 mt-auto">
                      {/* ✅ Hide call button for ALL members in completed groups */}
                      {!isCompleted && (
                        <a 
                          href={`tel:${member.phone}`} 
                          className="flex-1 py-1.5 md:py-2 bg-gray-50 text-gray-700 rounded-lg text-xs md:text-sm font-medium hover:bg-green-50 hover:text-green-700 flex items-center justify-center gap-1 md:gap-2 transition-colors"
                        >
                          <Phone size={12} className="md:size-3.5" /> 
                          <span className="hidden xs:inline">Call</span>
                        </a>
                      )}
                      
                      {/* ✅ If group is completed, show disabled state */}
                      {isCompleted ? (
                        <div className="flex-1 py-1.5 md:py-2 bg-gray-100 text-gray-500 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center gap-1 md:gap-2 cursor-not-allowed">
                          <Phone size={12} className="md:size-3.5 text-gray-400" /> 
                          <span className="hidden xs:inline">Call</span>
                        </div>
                      ) : null}
                      
                      {/* ✅ Only show delete button if NOT completed and perm allowed */}
                      {canDeleteMember(member, group.id) && (
                          <button 
                            onClick={() => handleDelete(member, group.id)} 
                            className="px-2 md:px-3 py-1.5 md:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                            title="Remove Member"
                          >
                            <Trash2 size={14} className="md:size-4" />
                            <span className="sr-only">Remove</span>
                          </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              // LIST VIEW
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <table className="w-full text-left border-collapse min-w-160">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs md:text-sm text-gray-500">
                      <th className="py-2 md:py-3 px-2 md:px-3 font-medium">Member</th>
                      <th className="py-2 md:py-3 px-2 md:px-3 font-medium">Contact</th>
                      <th className="py-2 md:py-3 px-2 md:px-3 font-medium">Role</th>
                      <th className="py-2 md:py-3 px-2 md:px-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((member: any) => {
                      const hasActions = hasAnyAction(member, group.id);
                      
                      return (
                      <tr key={`${member.id}-${group.id}`} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${member.id === currentUserId ? 'bg-primary/5' : ''}`}>
                        <td className="py-2 md:py-3 px-2 md:px-3">
                          <div className="flex items-center gap-2">
                            <div className="scale-75 origin-left">
                              <MemberAvatar member={member} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="font-medium text-gray-900 text-sm md:text-base">
                                  {member.name}
                                </span>
                                {member.id === currentUserId && (
                                  <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded flex-shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-xs md:text-sm text-gray-500">
                          <div className="truncate max-w-37.5 md:max-w-none">{member.email}</div>
                          <div>{member.phone}</div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3">
                          <div className="flex items-center gap-2">
                            {member.roleInGroup === 'leader' ? (
                              <Crown size={14} className="text-amber-500" />
                            ) : member.roleInGroup === 'sub_leader' ? (
                              <Shield size={14} className="text-blue-600" />
                            ) : (
                              <User size={14} className="text-gray-400" />
                            )}
                            <span className="capitalize text-sm">{member.roleInGroup.replace('_', ' ')}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${member.statusInGroup === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                              {member.statusInGroup}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-right">
                          <div className="flex justify-end gap-1 md:gap-2">
                            {/* ✅ Hide call button in list view for completed groups */}
                            {!isCompleted && (
                              <a 
                                href={`tel:${member.phone}`} 
                                className="p-1.5 md:p-2 text-gray-400 hover:text-green-600 bg-gray-50 rounded-lg flex items-center"
                                title="Call member"
                              >
                                <Phone size={14} className="md:size-4" />
                              </a>
                            )}
                            
                            {canEditMember(member, group.id) && (
                              <button 
                                onClick={() => handleEditClick(member, group.id)} 
                                className="p-1.5 md:p-2 text-gray-400 hover:text-primary bg-gray-50 rounded-lg"
                                title="Edit member"
                              >
                                <Edit size={14} className="md:size-4" />
                              </button>
                            )}
                            
                            {canDeleteMember(member, group.id) && (
                              <button 
                                onClick={() => handleDelete(member, group.id)} 
                                className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                                title="Delete member"
                              >
                                <Trash2 size={14} className="md:size-4" />
                              </button>
                            )}

                            {!hasActions && (
                              <span className="text-xs text-gray-400 italic py-1.5 px-2">
                                View only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-1">Edit Details</h2>
              <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">Updating {editingMember.name}</p>
              
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:size-4.5" size={16} />
                    <input 
                      type="text"
                      className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:size-4.5" size={16} />
                    <input 
                      type="email"
                      className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm md:text-base"
                      value={editForm.email}
                      readOnly
                    />
                  </div>
                  <div className="mt-2 p-2 bg-yellow-50 text-xs text-yellow-700 rounded">
                    Email cannot be changed manually for security reasons.
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:size-4.5" size={16} />
                    <input 
                      type="text"
                      className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                {/* Show role change only if user can change roles in this group */}
                {editingMember.id !== currentUserId && editForm.role && canChangeRole(editingMember, editForm.groupId) && (
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1.5 text-gray-700">Role in Group</label>
                    <select 
                      className="w-full border border-gray-200 rounded-lg p-2 md:p-2.5 outline-none text-sm md:text-base"
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    >
                      <option value="member">Member</option>
                      <option value="sub_leader">Sub-Leader</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 md:mt-8 flex justify-end gap-2 md:gap-3">
                <button 
                  onClick={() => setEditingMember(null)} 
                  className="px-4 md:px-5 py-2 text-xs md:text-sm text-gray-600 font-medium hover:bg-gray-50 rounded-lg md:rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 md:px-5 py-2 bg-primary text-white font-medium rounded-lg md:rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/30 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Save size={16} className="md:size-4.5" /> 
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}