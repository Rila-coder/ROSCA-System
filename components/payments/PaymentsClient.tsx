'use client';

import { useState, useEffect } from 'react';
import PaymentsHeader from '@/components/payments/PaymentsHeader';
import PaymentStats from '@/components/payments/PaymentStats';
import PaymentFilters from '@/components/payments/PaymentFilters';
import PaymentsTable from '@/components/payments/PaymentsTable';
import LoadingWrapper from '@/components/layout/LoadingWrapper';
import toast from 'react-hot-toast';

export default function PaymentsClient() {
  const [data, setData] = useState<any[]>([]); 
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [maxCycles, setMaxCycles] = useState(0); 

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    group: 'all',
    cycle: 'all',
    showMyPaymentsOnly: false,
    search: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (res.ok) {
        setData(json.groups);
        setFilteredData(json.groups);
        setCurrentUserId(json.currentUserId);
        
        // Set user role from first group (assuming same role across all groups)
        if (json.groups.length > 0) {
          setUserRole(json.groups[0].myRole || 'member');
        }
        
        // Calculate max cycles dynamically
        let max = 0;
        json.groups.forEach((g: any) => {
          g.cycles.forEach((c: any) => {
            if (c.cycleNumber > max) max = c.cycleNumber;
          });
        });
        setMaxCycles(max || 5);

      } else {
        toast.error('Failed to load payments');
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

  // Filtering Logic
  useEffect(() => {
    if (!data) return;
    
    let result = JSON.parse(JSON.stringify(data)); 

    // 1. Group Filter
    if (filters.group !== 'all') {
      result = result.filter((g: any) => g.groupId === filters.group);
    }

    // Process nested cycles and payments
    result = result.map((group: any) => {
      let cycles = group.cycles;

      // 2. Cycle Filter
      if (filters.cycle !== 'all') {
        cycles = cycles.filter((c: any) => c.cycleNumber.toString() === filters.cycle);
      }

      // Filter Payments inside Cycles
      cycles = cycles.map((cycle: any) => {
        let payments = cycle.payments;

        // 3. Status Filter
        if (filters.status !== 'all') {
          payments = payments.filter((p: any) => p.status === filters.status);
        }

        // 4. My Payments Only
        if (filters.showMyPaymentsOnly) {
          payments = payments.filter((p: any) => p.userId === currentUserId);
        }

        // 5. Search
        if (filters.search) {
          const q = filters.search.toLowerCase();
          payments = payments.filter((p: any) => 
            p.memberName.toLowerCase().includes(q) || 
            p.amount.toString().includes(q)
          );
        }

        return { ...cycle, payments };
      }).filter((c: any) => c.payments.length > 0); 

      return { ...group, cycles };
    }).filter((g: any) => g.cycles.length > 0); 

    setFilteredData(result);
  }, [filters, data, currentUserId]);

  return (
    <LoadingWrapper pageTitle="Loading Payments">
      <div className="space-y-4 md:space-y-6 lg:space-y-8">
        <PaymentsHeader 
          onSearch={(val) => setFilters(prev => ({...prev, search: val}))}
          showMyPayments={filters.showMyPaymentsOnly}
          toggleMyPayments={() => setFilters(prev => ({...prev, showMyPaymentsOnly: !prev.showMyPaymentsOnly}))}
          availableGroups={data.map(g => ({ id: g.groupId, name: g.groupName }))}
          currentUserId={currentUserId}
          userRole={userRole}
          userGroups={data} // Pass real group data to PaymentsHeader
        />
        
        <PaymentStats groups={data} currentUserId={currentUserId} />
        
        {/* Responsive Grid Layout with Better Ratios */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Filter Section - More compact for 1024px-1440px */}
          <div className="lg:col-span-3 xl:col-span-2">
            <PaymentFilters 
              filters={filters} 
              setFilters={setFilters} 
              availableGroups={data.map(g => ({ id: g.groupId, name: g.groupName }))}
              maxCycles={maxCycles} 
            />
          </div>
          
          {/* Table Section - More space for 1024px-1440px */}
          <div className="lg:col-span-9 xl:col-span-10">
            <PaymentsTable 
              groups={filteredData} 
              currentUserId={currentUserId}
              onUpdate={fetchData}
            />
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}