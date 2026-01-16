// app/groups/test/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups');
      
      console.log('Test - Groups API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Test - Groups data:', data);
        setGroups(data.groups || []);
      } else {
        const error = await response.text();
        console.error('Test - Error:', error);
      }
    } catch (error) {
      console.error('Test - Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testGroupApi = async (groupId: string) => {
    try {
      console.log(`Test - Fetching group ${groupId}...`);
      const response = await fetch(`/api/groups/${groupId}`);
      
      console.log(`Test - Group ${groupId} API Response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Test - Group ${groupId} data:`, data);
        alert(`Group ${groupId} found: ${data.group?.name}`);
      } else {
        const error = await response.text();
        console.error(`Test - Group ${groupId} error:`, error);
        alert(`Error fetching group ${groupId}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Test - Group ${groupId} fetch error:`, error);
      alert(`Network error fetching group ${groupId}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Groups</h1>
      
      <div className="mb-6">
        <button
          onClick={fetchGroups}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark mr-4"
        >
          Refresh Groups
        </button>
        <button
          onClick={() => router.push('/groups/create')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Create New Group
        </button>
      </div>
      
      {loading ? (
        <p>Loading groups...</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Your Groups ({groups.length})
          </h2>
          
          {groups.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p>No groups found. Try creating one first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{group.name}</h3>
                      <p className="text-sm text-gray-600">ID: {group._id}</p>
                      <p className="text-sm text-gray-600">
                        Members: {group.memberCount || 0} | Status: {group.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testGroupApi(group._id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Test API
                      </button>
                      <button
                        onClick={() => router.push(`/groups/${group._id}`)}
                        className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}