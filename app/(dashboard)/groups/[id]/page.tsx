// app/groups/[id]/page.tsx
import { Metadata } from 'next';
import GroupDetailsClient from './GroupDetailsClient';
import connectDB from '@/lib/db/connect';
import { Group } from '@/lib/db/models/Group';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 1. Dynamic Metadata Generator
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;

  try {
    await connectDB();
    // Fetch only the name for metadata efficiency
    const group = await Group.findById(id).select('name');

    if (!group) {
      return {
        title: 'Group Not Found | ROSCA',
      };
    }

    return {
      title: `${group.name} | ROSCA`,
      description: `Manage savings and payments for ${group.name}`,
    };
  } catch (error) {
    return {
      title: 'Group Details | ROSCA',
    };
  }
}

// 2. The Page Component
export default function GroupDetailsPage() {
  return <GroupDetailsClient />;
}