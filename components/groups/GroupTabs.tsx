'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Home, Users, CreditCard, Calendar,
  Settings, BarChart3, Bell, History,
  Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// 1. Update Props to accept RBAC permission
interface GroupTabsProps {
  activeTab: string;
  groupId: string;
  isLeader?: boolean; // New Prop
}

const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Home size={20} />,
  },
  {
    id: 'members',
    label: 'Members',
    icon: <Users size={20} />,
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: <CreditCard size={20} />,
  },
  {
    id: 'cycles',
    label: 'Cycles',
    icon: <Calendar size={20} />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={20} />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell size={20} />,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: <History size={20} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />,
  },
];

export default function GroupTabs({ activeTab, groupId, isLeader = false }: GroupTabsProps) {
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const [badges, setBadges] = useState<Record<string, number>>({
    payments: 0,
    notifications: 0,
    cycles: 0,
    members: 0 
  });
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // 2. Filter Tabs based on Permissions
  // If user is NOT a leader, remove the 'settings' tab from the list
  const visibleTabs = tabs.filter(tab => {
    if (tab.id === 'settings') {
      return isLeader;
    }
    return true;
  });

  // Fetch dynamic counts for badges
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        // 1. Fetch pending payments count
        const paymentsResponse = await fetch(`/api/groups/${groupId}/payments`);
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          const pendingPayments = paymentsData.payments?.filter((p: any) => 
            p.status === 'pending' || p.status === 'late'
          ).length || 0;
          
          setBadges(prev => ({ ...prev, payments: pendingPayments }));
        }

        // 2. Fetch active/upcoming cycles count
        const cyclesResponse = await fetch(`/api/groups/${groupId}/cycles`);
        if (cyclesResponse.ok) {
          const cyclesData = await cyclesResponse.json();
          const activeOrUpcomingCycles = cyclesData.cycles?.filter((c: any) => 
            c.status === 'active' || c.status === 'upcoming'
          ).length || 0;

          setBadges(prev => ({ ...prev, cycles: activeOrUpcomingCycles }));
        }

        // 3. Fetch members count
        const membersResponse = await fetch(`/api/groups/${groupId}/members`);
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setBadges(prev => ({ ...prev, members: membersData.members?.length || 0 }));
        }

      } catch (error) {
        console.error('Error fetching badge counts:', error);
      }
    };

    if (groupId) {
        fetchBadgeCounts();
    }
  }, [groupId]);

  // Function to create URL with all existing params
  const createTabUrl = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    return `/groups/${groupId}?${params.toString()}`;
  };

  // Check scroll position for buttons
  const checkScrollPosition = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Handle resize and scroll events
  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, []);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Mobile Header with Dropdown Toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {/* Use visibleTabs here safely */}
          {visibleTabs.find(tab => tab.id === activeTab)?.icon}
          <span className="font-semibold text-gray-900">
            {visibleTabs.find(tab => tab.id === activeTab)?.label || 'Overview'}
          </span>
          {badges[activeTab] > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-accent text-white rounded-full">
              {badges[activeTab]}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-4 py-2 space-y-1">
            {/* Map over visibleTabs instead of all tabs */}
            {visibleTabs
              .filter(tab => tab.id !== activeTab)
              .map((tab) => (
                <Link
                  key={tab.id}
                  href={createTabUrl(tab.id)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {tab.icon}
                    <span className="font-medium text-gray-900">{tab.label}</span>
                  </div>
                  {badges[tab.id] > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-accent text-white rounded-full">
                      {badges[tab.id]}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Desktop Tabs with Scrollable Container */}
      <div className="hidden md:block relative">
        {showScrollButtons && (
          <>
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-center"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-center"
                aria-label="Scroll right"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            )}
          </>
        )}

        <div
          ref={tabsContainerRef}
          className="flex space-x-0 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Map over visibleTabs */}
          {visibleTabs.map((tab) => (
            <Link
              key={tab.id}
              href={createTabUrl(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap min-w-fit ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="md:hidden lg:inline-block">{tab.icon}</span>
              <span className="font-medium text-sm lg:text-base">{tab.label}</span>
              
              {badges[tab.id] > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-accent text-white rounded-full min-w-[20px] text-center ml-1">
                  {badges[tab.id]}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Tablet/Medium Screen Optimized View */}
      <div className="hidden sm:block md:hidden">
        <div className="grid grid-cols-4 gap-1 p-2">
          {/* Map over visibleTabs */}
          {visibleTabs.map((tab) => (
            <Link
              key={tab.id}
              href={createTabUrl(tab.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {badges[tab.id] > 0 && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-medium bg-accent text-white rounded-full min-w-[18px] text-center">
                    {badges[tab.id]}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium mt-1 text-center">
                {tab.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}