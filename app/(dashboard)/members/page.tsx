// app/members/page.tsx
import { Metadata } from 'next';
import MembersClient from '@/components/members/MembersClient';

export const metadata: Metadata = {
  title: 'Members Management | ROSCA',
  description: 'View and manage all members across your savings groups.',
};

export default function MembersPage() {
  return <MembersClient />;
}