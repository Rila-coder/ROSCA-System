"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserPlus,
  MoreVertical,
  Phone,
  Mail,
  Crown,
  Shield,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Users,
  Loader2,
  RefreshCw,
  Save,
  X,
  Calendar,
  ArrowUpDown,
  Lock,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";

interface MemberListProps {
  groupId: string;
  canManage?: boolean; // True for both Leader and Sub-leader
  members?: any[];
  currentCycle?: any;
}

export default function MemberList({
  groupId,
  canManage = false,
}: MemberListProps) {
  const { user } = useAuth(); // Get current logged in user
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "left">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "member" as "leader" | "sub_leader" | "member",
  });

  // Reorder state
  const [isReordering, setIsReordering] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [lockedMembers, setLockedMembers] = useState<Set<string>>(new Set());

  const actionsMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/groups/${groupId}/members?t=${Date.now()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to fetch members"
        );
      }

      // Sort by memberNumber (Draw Order)
      const sortedMembers = (data.members || []).sort((a: any, b: any) => {
        const numA = a.memberNumber || 0;
        const numB = b.memberNumber || 0;
        return numA - numB;
      });

      setMembers(sortedMembers);

      // Identify locked members (cannot be reordered)
      const locked = new Set<string>();
      sortedMembers.forEach((member: any) => {
        if (member.hasReceived || member.totalReceived > 0) {
          locked.add(member._id);
        }
      });
      setLockedMembers(locked);
    } catch (error: any) {
      toast.error(error.message || "Failed to load members");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let isOutside = true;

      Object.values(actionsMenuRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          isOutside = false;
        }
      });

      if (isOutside) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ FROM GEMINI'S UPDATE: Helper functions to get snapshot data
  const getMemberName = (member: any) => member.name || "Unknown Member";

  const getMemberEmail = (member: any) => member.email || "N/A";

  const getMemberPhone = (member: any) => member.phone || "N/A";

  const getMemberAvatar = (member: any) => member.userId?.avatar || null;

  // Identify Current User in List
  const isCurrentUser = (member: any) => {
    if (!user) return false;
    const currentUserId = user.id || (user as any)._id;

    // Check registered ID
    if (member.userId?._id === currentUserId || member.userId === currentUserId)
      return true;

    // ✅ FROM GEMINI'S UPDATE: Check email matches from snapshot
    const memberEmail = getMemberEmail(member).toLowerCase();
    return memberEmail === user.email.toLowerCase();
  };

  // Get Current User's Role in this Group
  const getCurrentUserRole = () => {
    const currentMember = members.find((m) => isCurrentUser(m));
    return currentMember?.role; // 'leader', 'sub_leader', or 'member'
  };

  // ✅ FIXED PERMISSION LOGIC: Sub-leaders can edit themselves (for personal info) and regular members
  const canEditMember = (targetMember: any) => {
    // 1. Basic check: Must have manage permissions
    if (!canManage) return false;

    const myRole = getCurrentUserRole();
    const targetRole = targetMember.role;

    // 2. Leader can edit EVERYONE (including themselves, but delete is restricted in UI)
    if (myRole === "leader") return true;

    // 3. Sub-leader can edit themselves (for personal info) AND regular members
    if (myRole === "sub_leader") {
      // Allow editing themselves OR regular members
      return isCurrentUser(targetMember) || targetRole === "member";
    }

    return false;
  };

  // ✅ NEW FUNCTION: Check if user can delete a member
  const canDeleteMember = (targetMember: any) => {
    if (!canManage) return false;

    const myRole = getCurrentUserRole();
    const targetRole = targetMember.role;

    // Leader can delete anyone except themselves
    if (myRole === "leader") {
      return !isCurrentUser(targetMember) && targetRole !== "leader";
    }

    // Sub-leader can only delete regular members (not themselves, not other sub-leaders, not leaders)
    if (myRole === "sub_leader") {
      return targetRole === "member" && !isCurrentUser(targetMember);
    }

    return false;
  };

  // ✅ NEW FUNCTION: Check if user can change role of a member
  const canChangeRole = (targetMember: any) => {
    if (!canManage) return false;

    const myRole = getCurrentUserRole();
    const targetRole = targetMember.role;

    // Only leader can change roles
    return (
      myRole === "leader" &&
      !isCurrentUser(targetMember) &&
      targetRole !== "leader"
    );
  };

  // ✅ NEW FUNCTION: Check if user has ANY action available for this member
  const hasAnyAction = (targetMember: any) => {
    if (!canManage) return false;
    return (
      canEditMember(targetMember) ||
      canDeleteMember(targetMember) ||
      canChangeRole(targetMember)
    );
  };

  const filteredMembers = members.filter((member) => {
    // ✅ FROM GEMINI'S UPDATE: Use snapshot data for filtering
    const name = getMemberName(member).toLowerCase();
    const email = getMemberEmail(member).toLowerCase();
    const phone = getMemberPhone(member);
    const memberNumber = member.memberNumber?.toString() || "";

    const matchesSearch =
      searchTerm === "" ||
      name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      memberNumber.includes(searchTerm);

    const matchesStatus = filter === "all" || member.status === filter;

    return matchesSearch && matchesStatus;
  });

  const hasSubLeader = members.some((member) => member.role === "sub_leader");

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.phone) {
      toast.error("Please fill all fields");
      return;
    }

    if (newMember.role === "sub_leader" && hasSubLeader) {
      toast.error("There can only be one sub-leader in the group");
      return;
    }

    try {
      setAddingMember(true);

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newMember),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      await fetchMembers();

      setNewMember({ name: "", email: "", phone: "", role: "member" });
      setShowAddMember(false);
      toast.success("Member added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  // Handle edit member
  const handleEditMember = (memberId: string) => {
    const member = members.find((m) => m._id === memberId);
    if (member) {
      // ✅ FROM GEMINI'S UPDATE: Use snapshot data
      setEditFormData({
        name: getMemberName(member),
        email: getMemberEmail(member),
        phone: getMemberPhone(member),
      });
      setEditingMember(memberId);
      setShowActionsMenu(null);
    }
  };

  // Handle update member details
  const handleUpdateMember = async () => {
    if (!editingMember) return;

    // ✅ CHECK: Only Name and Phone are required now (Email is disabled)
    if (!editFormData.name || !editFormData.phone) {
      toast.error("Name and Phone are required");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/groups/${groupId}/members/${editingMember}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          // ✅ CHANGE: Send only name and phone. Do not send email.
          body: JSON.stringify({
            name: editFormData.name,
            phone: editFormData.phone,
            // email: editFormData.email <--- REMOVED THIS
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update member details");
      }

      await fetchMembers();
      setEditingMember(null);
      toast.success("Member details updated successfully");
    } catch (error) {
      toast.error("Failed to update member");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Role Change Logic
  const handleRoleChange = async (
    memberId: string,
    newRole: "leader" | "sub_leader" | "member"
  ) => {
    if (newRole === "sub_leader") {
      const existingSubLeader = members.find((m) => m.role === "sub_leader");
      if (existingSubLeader && existingSubLeader._id !== memberId) {
        toast.error(
          "Only one Sub-leader is allowed. Please change the current Sub-leader to Member first."
        );
        return;
      }
    }

    try {
      const response = await fetch(
        `/api/groups/${groupId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member._id === memberId ? { ...member, role: newRole } : member
        )
      );

      setShowActionsMenu(null);
      toast.success(`Role updated to ${newRole.replace("_", " ")}`);
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m) => m._id === memberId);
    if (!member) return;

    if (member.role === "leader") {
      toast.error("Cannot remove the group leader");
      return;
    }

    const memberName = getMemberName(member);

    if (
      confirm(`Are you sure you want to remove ${memberName} from the group?`)
    ) {
      try {
        const response = await fetch(
          `/api/groups/${groupId}/members/${memberId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || data.error || "Failed to remove member"
          );
        }

        setMembers(members.filter((member) => member._id !== memberId));
        setShowActionsMenu(null);
        toast.success("Member removed");
      } catch (error: any) {
        toast.error(error.message || "Failed to remove member");
      }
    }
  };

  // Handle draw number change
  const handleDrawNumberChange = (memberId: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) return;

    setMembers((prev) =>
      prev.map((m) => (m._id === memberId ? { ...m, memberNumber: num } : m))
    );
  };

  // Save reordered draw numbers
  const handleSaveOrder = async () => {
    const numbers = members.map((m) => m.memberNumber);
    const uniqueNumbers = new Set(numbers);

    if (numbers.length !== uniqueNumbers.size) {
      toast.error("Draw numbers must be unique");
      return;
    }

    const changedLockedMembers = members.filter(
      (m) =>
        lockedMembers.has(m._id) &&
        m.memberNumber !==
          members.find((orig) => orig._id === m._id)?.memberNumber
    );

    if (changedLockedMembers.length > 0) {
      toast.error(
        "Cannot change draw numbers for members who have received money"
      );
      return;
    }

    setIsSavingOrder(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ members }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          data.details.forEach((error: string) => toast.error(error));
          throw new Error(data.message || "Validation failed");
        }
        throw new Error(data.error || "Failed to save order");
      }

      toast.success("Draw order updated successfully!");
      setIsReordering(false);
      await fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to save order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle size={16} className="text-success" />;
      case "pending":
        return <Clock size={16} className="text-accent" />;
      case "left":
      case "removed":
        return <XCircle size={16} className="text-error" />;
      default:
        return <Clock size={16} className="text-text/40" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "leader":
        return <Crown size={16} className="text-accent" />;
      case "sub_leader":
        return <Shield size={16} className="text-primary" />;
      case "member":
        return <User size={16} className="text-text/60" />;
      default:
        return <User size={16} className="text-text/60" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "pending":
        return "bg-accent/10 text-accent border-accent/20";
      case "left":
      case "removed":
        return "bg-error/10 text-error border-error/20";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  const toggleActionsMenu = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowActionsMenu(showActionsMenu === memberId ? null : memberId);
  };

  const isSubLeaderOptionDisabled = (memberId: string) => {
    if (hasSubLeader) {
      const member = members.find((m) => m._id === memberId);
      return member?.role !== "sub_leader";
    }
    return false;
  };

  const setActionsMenuRef = (memberId: string, el: HTMLDivElement | null) => {
    actionsMenuRefs.current[memberId] = el;
  };

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
    left: members.filter((m) => m.status === "left" || m.status === "removed")
      .length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">Members</h2>
          <p className="text-text/60 text-sm mt-1">
            Manage group members and their draw numbers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* HIDE Reorder Button if !canManage */}
          {canManage && (
            <>
              {isReordering ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsReordering(false);
                      fetchMembers(); // Reset to original order
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-text hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrder}
                    disabled={isSavingOrder}
                    className="px-3 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    {isSavingOrder ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>Save Order</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsReordering(true)}
                  className="px-3 py-2.5 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  title="Reorder draw numbers"
                >
                  <ArrowUpDown size={16} />
                  <span>Reorder Draws</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={fetchMembers}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center sm:w-auto"
            title="Refresh members"
          >
            <RefreshCw size={18} className="text-text/60" />
          </button>

          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer text-sm hover:border-primary transition-colors">
              <Filter size={16} className="text-text/40" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none cursor-pointer appearance-none pr-6"
              >
                <option value="all">All Members</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="left">Left</option>
              </select>
              <ChevronDown
                size={16}
                className="text-text/40 absolute right-3"
              />
            </div>
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40"
              size={18}
            />
            <input
              type="text"
              placeholder="Search members or draw #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* HIDE Add Member Button if !canManage */}
          {canManage && (
            <button
              onClick={() => setShowAddMember(true)}
              className="bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              <UserPlus size={18} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Member Form */}
      {showAddMember && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-text">Add New Member</h3>
            <button
              onClick={() => setShowAddMember(false)}
              className="text-text/40 hover:text-text transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Role
              </label>
              <select
                value={newMember.role}
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value as any })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="member">Member</option>
                <option value="sub_leader" disabled={hasSubLeader}>
                  Sub-leader {hasSubLeader && "(Only one allowed)"}
                </option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAddMember(false)}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-text hover:bg-gray-50 transition-colors text-sm font-medium"
              disabled={addingMember}
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={addingMember}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {addingMember ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl text-text">
                Edit Member Details
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-text/40 hover:text-text transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Email Address
                </label>
                {/* ✅ CHANGE: Made Input Disabled (Read Only) */}
                <div className="relative">
                  <input
                    type="email"
                    value={editFormData.email}
                    disabled={true} // Disable editing
                    className="w-full px-4 py-2.5 border border-gray-200 bg-gray-100 text-gray-500 rounded-lg text-sm cursor-not-allowed focus:outline-none"
                    title="Email cannot be changed as it links to the user account"
                  />
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <Lock size={10} />
                    <span>Email cannot be changed to preserve user identity.</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingMember(null)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-text hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={isUpdating}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-text">
                {stats.total}
              </div>
              <div className="text-sm text-text/60">Total Members</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-success">
                {stats.active}
              </div>
              <div className="text-sm text-text/60">Active</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-success" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-accent">
                {stats.pending}
              </div>
              <div className="text-sm text-text/60">Pending</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Clock size={20} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-error">
                {stats.left}
              </div>
              <div className="text-sm text-text/60">Left</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <XCircle size={20} className="text-error" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View - UPDATED WITH GEMINI'S SIMPLIFIED STRUCTURE */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Draw #
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Member
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Role
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Contact
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Status
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Amount Paid
                </th>
                <th className="text-left py-4 px-6 font-semibold text-text text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const isLocked =
                  lockedMembers.has(member._id) ||
                  member.hasReceived ||
                  member.totalReceived > 0;
                const userHasActions = hasAnyAction(member);

                return (
                  <tr
                    key={member._id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-center">
                        {isReordering && canManage ? (
                          // Editable Draw Number (Only if canManage)
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={member.memberNumber || ""}
                              onChange={(e) =>
                                handleDrawNumberChange(
                                  member._id,
                                  e.target.value
                                )
                              }
                              className={`w-16 h-12 text-center border-2 rounded-lg font-bold text-lg focus:outline-none focus:ring-2 ${
                                isLocked
                                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                  : "border-primary text-primary focus:ring-primary/30"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isLocked}
                              title={
                                isLocked
                                  ? "Cannot change - Member has received money"
                                  : "Enter new draw number"
                              }
                            />
                            {isLocked && (
                              <div className="absolute -top-1 -right-1 bg-error text-white rounded-full p-1">
                                <Lock size={10} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div
                              className={`inline-flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg border-2 ${
                                isLocked
                                  ? "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 border-gray-300"
                                  : "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {member.memberNumber || "-"}
                              {isLocked && (
                                <Lock
                                  size={12}
                                  className="absolute -top-1 -right-1 text-gray-500"
                                />
                              )}
                            </div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">
                              Draw #{member.memberNumber || "N/A"}
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl overflow-hidden relative">
                            {getMemberAvatar(member) ? (
                              <img
                                src={getMemberAvatar(member)}
                                alt={getMemberName(member)}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const fallback =
                                      document.createElement("div");
                                    fallback.className =
                                      "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10";
                                    // ✅ FROM GEMINI'S UPDATE: Use snapshot name for initials
                                    fallback.innerHTML = `<span class="font-bold text-primary text-lg">
                                  ${(getMemberName(member) || "UN")
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>`;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                                {/* ✅ FROM GEMINI'S UPDATE: Use snapshot name for initials */}
                                <span className="font-bold text-primary text-lg">
                                  {(getMemberName(member) || "UN")
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getRoleIcon(member.role)}
                          </div>
                        </div>
                        <div>
                          {/* ✅ FROM GEMINI'S UPDATE: Use snapshot name */}
                          <div className="font-semibold text-text flex items-center gap-2">
                            {getMemberName(member)}
                            {isCurrentUser(member) && (
                              <span className="text-xs text-primary font-bold ml-1">
                                (You)
                              </span>
                            )}
                            {member.hasReceived && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full whitespace-nowrap">
                                Received
                              </span>
                            )}
                            {isLocked && !member.hasReceived && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full whitespace-nowrap">
                                Locked
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text/60">
                            Member ID: {member._id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                            member.role === "leader"
                              ? "bg-accent/10 text-accent"
                              : member.role === "sub_leader"
                              ? "bg-primary/10 text-primary"
                              : "bg-gray-100 text-text"
                          }`}
                        >
                          {member.role.replace("_", " ")}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-text/40" />
                          {/* ✅ FROM GEMINI'S UPDATE: Use snapshot email */}
                          <span className="truncate max-w-[180px]">
                            {getMemberEmail(member)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-text/40" />
                          {/* ✅ FROM GEMINI'S UPDATE: Use snapshot phone */}
                          <span className="truncate max-w-[180px]">
                            {getMemberPhone(member)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(
                            member.status
                          )} w-fit`}
                        >
                          {getStatusIcon(member.status)}
                          <span className="text-sm font-medium capitalize">
                            {member.status}
                          </span>
                        </div>
                        {member.nextPaymentDue && (
                          <div className="flex items-center gap-1 text-sm text-text/60 mt-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(
                                member.nextPaymentDue
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="font-bold text-lg">
                          ₹{member.totalPaid?.toLocaleString() || "0"}
                        </div>
                        <div className="text-sm text-text/60">
                          ₹{member.totalReceived?.toLocaleString() || "0"}{" "}
                          received
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {/* Show Read Only when no actions available */}
                        {!userHasActions ? (
                          <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-gray-600">
                            <EyeOff size={16} className="text-gray-400" />
                            <span className="text-sm font-medium">
                              Read Only
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Show role dropdown only if user can change roles */}
                            {canChangeRole(member) &&
                              member.role !== "leader" && (
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      member._id,
                                      e.target.value as any
                                    )
                                  }
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary min-w-[120px]"
                                >
                                  <option value="member">Member</option>
                                  <option
                                    value="sub_leader"
                                    disabled={isSubLeaderOptionDisabled(
                                      member._id
                                    )}
                                  >
                                    Sub-leader{" "}
                                    {isSubLeaderOptionDisabled(member._id) &&
                                      "(Max 1)"}
                                  </option>
                                </select>
                              )}

                            {!isReordering && (
                              <div className="relative">
                                {/* Show menu button if user can edit OR delete this member */}
                                <button
                                  onClick={(e) =>
                                    toggleActionsMenu(e, member._id)
                                  }
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-text/60"
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {showActionsMenu === member._id && (
                                  <div
                                    ref={(el) =>
                                      setActionsMenuRef(member._id, el)
                                    }
                                    className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]"
                                  >
                                    {/* Show Edit button only if user can edit */}
                                    {canEditMember(member) && (
                                      <button
                                        onClick={() =>
                                          handleEditMember(member._id)
                                        }
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Edit size={14} />
                                        Edit Member
                                      </button>
                                    )}

                                    {/* Show Remove button only if user can delete */}
                                    {canDeleteMember(member) &&
                                      member.role !== "leader" && (
                                        <button
                                          onClick={() =>
                                            handleRemoveMember(member._id)
                                          }
                                          className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <Trash2 size={14} />
                                          Remove
                                        </button>
                                      )}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-3">
        {filteredMembers.map((member) => {
          const isLocked =
            lockedMembers.has(member._id) ||
            member.hasReceived ||
            member.totalReceived > 0;
          const userHasActions = hasAnyAction(member);

          return (
            <div
              key={member._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleMemberExpand(member._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        {/* ✅ FROM GEMINI'S UPDATE: Use snapshot name for initials */}
                        <span className="font-bold text-primary text-lg">
                          {(getMemberName(member) || "UN")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {getRoleIcon(member.role)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* ✅ FROM GEMINI'S UPDATE: Use snapshot name */}
                        <div className="font-semibold text-text truncate">
                          {getMemberName(member)}
                        </div>
                        {isCurrentUser(member) && (
                          <span className="text-xs text-primary font-bold ml-1">
                            (You)
                          </span>
                        )}
                        {member.hasReceived && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full whitespace-nowrap shrink-0">
                            Received
                          </span>
                        )}
                        {isLocked && !member.hasReceived && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full whitespace-nowrap shrink-0">
                            Locked
                          </span>
                        )}
                      </div>

                      {/* Draw Number Badge - Mobile */}
                      <div className="flex items-center gap-2 mb-2">
                        {isReordering && canManage ? (
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={member.memberNumber || ""}
                              onChange={(e) =>
                                handleDrawNumberChange(
                                  member._id,
                                  e.target.value
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              className={`w-16 h-8 text-center border-2 rounded-lg font-bold focus:outline-none focus:ring-2 ${
                                isLocked
                                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                  : "border-primary text-primary focus:ring-primary/30"
                              }`}
                              disabled={isLocked}
                            />
                            {isLocked && (
                              <Lock
                                size={10}
                                className="absolute -top-1 -right-1 text-gray-500"
                              />
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                              isLocked
                                ? "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-300"
                                : "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            <Calendar size={10} />
                            Draw #{member.memberNumber || "N/A"}
                            {isLocked && <Lock size={8} className="ml-1" />}
                          </span>
                        )}
                        <span className="text-xs text-text/60">
                          ID: {member._id.slice(-6)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                            member.status
                          )}`}
                        >
                          {getStatusIcon(member.status)}
                          <span className="capitalize">{member.status}</span>
                        </div>
                        <div className="text-xs text-text/60 capitalize">
                          {member.role.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMemberExpand(member._id);
                    }}
                    className="shrink-0 ml-2"
                  >
                    {expandedMember === member._id ? (
                      <ChevronUp size={20} className="text-text/40" />
                    ) : (
                      <ChevronDown size={20} className="text-text/40" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-text/60 mb-1">Amount Paid</div>
                    <div className="text-base font-bold">
                      ₹{member.totalPaid?.toLocaleString() || "0"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text/60 mb-1">
                      Total Received
                    </div>
                    <div className="text-sm font-bold text-success">
                      ₹{member.totalReceived?.toLocaleString() || "0"}
                    </div>
                  </div>
                </div>
              </div>

              {expandedMember === member._id && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-text/60 mb-1">Email</div>
                      <div className="text-sm flex items-center gap-2">
                        <Mail size={14} className="text-text/40" />
                        {/* ✅ FROM GEMINI'S UPDATE: Use snapshot email */}
                        <span className="truncate">
                          {getMemberEmail(member)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text/60 mb-1">Phone</div>
                      <div className="text-sm flex items-center gap-2">
                        <Phone size={14} className="text-text/40" />
                        {/* ✅ FROM GEMINI'S UPDATE: Use snapshot phone */}
                        <span>{getMemberPhone(member)}</span>
                      </div>
                    </div>
                  </div>

                  {member.nextPaymentDue && (
                    <div>
                      <div className="text-xs text-text/60 mb-1">
                        Next Payment Date
                      </div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Calendar size={14} className="text-text/40" />
                        <span>
                          {new Date(member.nextPaymentDue).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show actions only if user has permission, otherwise show Read Only */}
                  {canManage && !isReordering ? (
                    userHasActions ? (
                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        {/* Show role dropdown only if user can change roles */}
                        {canChangeRole(member) && member.role !== "leader" && (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(
                                member._id,
                                e.target.value as any
                              )
                            }
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="member">Member</option>
                            <option
                              value="sub_leader"
                              disabled={isSubLeaderOptionDisabled(member._id)}
                            >
                              Sub-leader{" "}
                              {isSubLeaderOptionDisabled(member._id) &&
                                "(Max 1)"}
                            </option>
                          </select>
                        )}

                        <div className="flex gap-2">
                          {/* Show Edit button only if user can edit */}
                          {canEditMember(member) && (
                            <button
                              onClick={() => handleEditMember(member._id)}
                              className="flex-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors px-4 py-2 text-sm font-medium"
                            >
                              <Edit size={14} className="inline mr-2" />
                              Edit
                            </button>
                          )}

                          {/* Show Remove button only if user can delete */}
                          {canDeleteMember(member) &&
                            member.role !== "leader" && (
                              <button
                                onClick={() => handleRemoveMember(member._id)}
                                className="flex-1 bg-red-50 text-error rounded-lg hover:bg-red-100 transition-colors px-4 py-2 text-sm font-medium"
                              >
                                <Trash2 size={14} className="inline mr-2" />
                                Remove
                              </button>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-gray-600">
                        <EyeOff size={16} className="text-gray-400" />
                        <span className="text-sm font-medium">Read Only</span>
                      </div>
                    )
                  ) : (
                    !canManage && (
                      <div className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-gray-600">
                        <EyeOff size={16} className="text-gray-400" />
                        <span className="text-sm font-medium">Read Only</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users size={24} className="text-text/40" />
          </div>
          <h3 className="font-semibold text-text mb-2">No members found</h3>
          <p className="text-text/60 mb-6 max-w-sm mx-auto">
            {searchTerm
              ? "Try adjusting your search or filter"
              : "Add your first member to get started"}
          </p>
          {/* HIDE Empty State Add Button if !canManage */}
          {canManage && (
            <button
              onClick={() => {
                setShowAddMember(true);
                setSearchTerm("");
                setFilter("all");
              }}
              className="bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors px-6 py-2.5 text-sm font-medium"
            >
              Add Member
            </button>
          )}
        </div>
      )}
    </div>
  );
}