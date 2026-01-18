'use client';

import { useState, useEffect } from 'react';
import MembersHeader from '@/components/members/MembersHeader';
import MembersFilters from '@/components/members/MembersFilters';
import MembersGrid from '@/components/members/MembersGrid';
import MemberStats from '@/components/members/MemberStats';
import LoadingWrapper from '@/components/layout/LoadingWrapper';
import toast from 'react-hot-toast';

export default function MembersPage() {
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [myPermissions, setMyPermissions] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    group: 'all',
    search: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (res.ok) {
        setAllMembers(data.members || []);
        // Initialize filtered list
        setFilteredMembers(data.members || []);
        setMyPermissions(data.myPermissions || []);
        setAvailableGroups(data.myGroups || []); 
        setCurrentUserId(data.currentUserId);
        setCurrentUserName(data.currentUserName);
      } else {
        toast.error(data.error || 'Failed to fetch members');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ FIXED: Strict Deep Filtering Logic
  useEffect(() => {
    if (!allMembers.length) return;

    const query = filters.search.toLowerCase();

    // We process the list to create a "clean" view for the grid
    const processedMembers = allMembers.map(member => {
      // 1. Check if the USER matches the search text (Name/Email/Phone)
      const matchesSearch = 
        (member.name && member.name.toLowerCase().includes(query)) || 
        (member.email && member.email.toLowerCase().includes(query)) || 
        (member.phone && member.phone.includes(query));

      if (!matchesSearch) return null; // Skip this user entirely if search fails

      // 2. Filter the user's MEMBERSHIPS (The Contexts)
      // This is crucial: We remove Group B info if filtering for Group A
      const validMemberships = member.memberships.filter((ms: any) => {
        // Filter by Group ID
        if (filters.group !== 'all') {
          // Compare as strings to be safe
          if (ms.groupId.toString() !== filters.group.toString()) {
            return false;
          }
        }

        // Filter by Role
        if (filters.role !== 'all') {
          if (ms.role !== filters.role) {
            return false;
          }
        }

        // Filter by Status
        if (filters.status !== 'all') {
          if (ms.status !== filters.status) {
            return false;
          }
        }

        return true;
      });

      // If user has no valid memberships after filtering, return null
      if (validMemberships.length === 0) return null;

      // Return a new member object with ONLY the valid memberships
      return {
        ...member,
        memberships: validMemberships
      };
    }).filter(Boolean); // Remove null entries

    setFilteredMembers(processedMembers);
  }, [filters, allMembers]);

  return (
    <LoadingWrapper pageTitle="Members">
      <div className="space-y-4 md:space-y-6">
        <MembersHeader 
          onSearch={(val) => setFilters(prev => ({ ...prev, search: val }))} 
          onRefresh={fetchData}
          currentUserName={currentUserName} 
        />
        
        <MemberStats members={allMembers} />

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          <div className="lg:w-1/4">
            <MembersFilters 
              filters={filters} 
              setFilters={setFilters}
              groups={availableGroups}
            />
          </div>
          <div className="lg:w-3/4">
            <MembersGrid 
              members={filteredMembers} 
              myPermissions={myPermissions}
              currentUserId={currentUserId}
              loading={loading}
              onUpdate={fetchData}
            />
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}