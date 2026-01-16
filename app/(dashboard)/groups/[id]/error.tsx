// app/groups/[id]/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Group details page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We couldn't load the group details. This might be a temporary issue.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <RefreshCw size={20} />
              Try Again
            </button>
            
            <a
              href="/groups"
              className="block w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              Back to Groups
            </a>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
              <p className="text-sm font-medium text-gray-700 mb-1">Error Details:</p>
              <p className="text-sm text-gray-600 font-mono break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-1">Digest: {error.digest}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}