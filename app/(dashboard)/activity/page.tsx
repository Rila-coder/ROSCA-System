import ActivityLog from '@/components/activity/ActivityLog';
import { getServerSession } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Activity Log | ROSCA',
  description: 'View recent activities in your groups',
};

export default async function ActivityPage() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex items-center justify-between mt-0 md:mt-5 lg:mt-0">
        <div>
          <h1 className="text-2xl font-bold text-text">Activity Log</h1>
          <p className="text-text/60">
            Recent activities in your groups
          </p>
        </div>
      </div>

      {/* Activity Log Component */}
      <ActivityLog />
    </div>
  );
}