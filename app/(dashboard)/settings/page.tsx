import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsTabs from '@/components/settings/SettingsTabs';
import ProfileSettings from '@/components/settings/ProfileSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import DangerZone from '@/components/settings/DangerZone';
import LoadingWrapper from '@/components/layout/LoadingWrapper';

interface SettingsPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export const metadata = {
  title: 'Settings | ROSCA',
  description: 'Manage your account settings',
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'profile';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'danger':
        return <DangerZone />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <LoadingWrapper pageTitle="Settings">
      <div className="space-y-6 p-4 sm:p-6">
        <SettingsHeader />
        
        {/* Mobile Tabs */}
        <div className="lg:hidden">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <div className="flex space-x-1 pb-2 min-w-max">
                {['profile', 'security', 'danger'].map((tab) => (
                  <a
                    key={tab}
                    href={`/settings?tab=${tab}`}
                    className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-primary text-white'
                        : 'text-text hover:bg-gray-100'
                    }`}
                  >
                    {tab === 'danger' ? 'Danger Zone' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <SettingsTabs activeTab={activeTab} />
          </div>
          
          {/* Content */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className="card">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}