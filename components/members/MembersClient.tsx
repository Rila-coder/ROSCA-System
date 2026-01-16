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
  const [currentUserName, setCurrentUserName] = useState<string>(''); // ✅ NEW STATE
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
        setAllMembers(data.members);
        setFilteredMembers(data.members);
        setMyPermissions(data.myPermissions);
        setAvailableGroups(data.myGroups || []);
        setCurrentUserId(data.currentUserId);
        setCurrentUserName(data.currentUserName); // ✅ STORE NAME
      } else {
        toast.error(data.error || 'Failed to fetch members');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...allMembers];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.email.toLowerCase().includes(q) || 
        m.phone.includes(q)
      );
    }

    if (filters.role !== 'all') {
      result = result.filter(m => m.memberships.some((ms: any) => ms.role === filters.role));
    }

    if (filters.status !== 'all') {
      result = result.filter(m => m.memberships.some((ms: any) => ms.status === filters.status));
    }

    if (filters.group !== 'all') {
      result = result.filter(m => m.memberships.some((ms: any) => ms.groupId === filters.group));
    }

    setFilteredMembers(result);
  }, [filters, allMembers]);

  return (
    <LoadingWrapper pageTitle="Members">
      <div className="space-y-4 md:space-y-6">
        {/* ✅ PASSED THE NAME PROP */}
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