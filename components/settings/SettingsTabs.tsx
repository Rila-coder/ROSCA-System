'use client';

import Link from 'next/link';
import { User, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';

interface SettingsTabsProps {
  activeTab: string;
}

const tabs = [
  {
    id: 'profile',
    label: 'Profile',
    icon: <User size={18} />,
    description: 'Personal information',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={18} />,
    description: 'Password & security',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <AlertTriangle size={18} />,
    description: 'Delete account',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
];

export default function SettingsTabs({ activeTab }: SettingsTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Function to build URL with all existing query params except 'tab'
  const buildTabUrl = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="card p-2">
      <div className="mb-4 px-2">
        <h3 className="font-medium text-text mb-1">Settings Navigation</h3>
        <p className="text-xs text-text/60">
          Manage different aspects of your account
        </p>
      </div>
      
      <div className="space-y-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              className={`block w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? `${tab.bgColor} border-l-4 border-l-${tab.color.split('-')[1]}-500`
                  : 'hover:bg-gray-50 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  isActive 
                    ? tab.bgColor.replace('50', '100')
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <div className={isActive ? tab.color : 'text-text/60'}>
                    {tab.icon}
                  </div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate text-text">
                      {tab.label}
                    </div>
                    {isActive && (
                      <CheckCircle size={14} className="text-green-500" />
                    )}
                  </div>
                  <div className={`text-xs truncate ${
                    isActive ? tab.color : 'text-text/60'
                  }`}>
                    {tab.description}
                  </div>
                </div>
              </div>
              
              {/* Active indicator for mobile */}
              {isActive && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${tab.bgColor.replace('50', '500')}`}></div>
                    <span className="text-xs text-text/60">Currently viewing</span>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
      
      {/* Additional Info */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-text/60 mb-1">Quick Tips:</p>
        <ul className="text-xs text-text/60 space-y-1">
          <li className="flex items-center">
            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
            Profile updates save automatically
          </li>
          <li className="flex items-center">
            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
            Password changes take effect immediately
          </li>
          <li className="flex items-center">
            <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
            Account deletion is permanent
          </li>
        </ul>
      </div>
    </div>
  );
}