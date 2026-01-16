// app/groups/page.tsx
import { Metadata } from 'next';
import GroupsClient from '@/components/groups/GroupsClient';

export const metadata: Metadata = {
  title: 'My Groups | ROSCA',
  description: 'Manage your savings circles, track contributions, and monitor group progress.',
};

export default function GroupsPage() {
  return <GroupsClient />;
}