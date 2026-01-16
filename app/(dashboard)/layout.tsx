import type { Metadata } from 'next';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Dashboard | ROSCA',
  description: 'Manage your savings groups and activities',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <DashboardHeader />
        </div>

        {/* Offset for header */}
        <div className="h-16 md:h-16 lg:h-16"></div>

        {/* Main content area */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* Mobile Sidebar */}
          <aside className="lg:hidden w-full flex-shrink-0">
            <DashboardSidebar />
          </aside>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DashboardSidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
