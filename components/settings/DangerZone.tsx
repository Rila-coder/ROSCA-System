'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Shield, AlertCircle, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DangerZone() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  const handleOpenConfirm = () => {
    setShowConfirm(true);
  };

  const handleCloseConfirm = () => {
    setShowConfirm(false);
    setShowFinalConfirm(false);
    setConfirmText('');
    setDeletionReason('');
  };

  const handleProceedToFinal = () => {
    if (!deletionReason.trim()) {
      toast.error('Please select a reason for deletion');
      return;
    }
    setShowFinalConfirm(true);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE in uppercase to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/users/delete', { // Updated API path
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: deletionReason }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Account deleted successfully. Redirecting...');
        
        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Wait a moment before redirecting
        setTimeout(() => {
          router.push('/login');
          router.refresh();
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <AlertTriangle size={20} className="text-error" />
        <h2 className="text-xl font-bold text-text">Danger Zone</h2>
      </div>

      <div className="space-y-6">
        {/* Account Deletion Section */}
        <div className="p-4 border border-error/30 rounded-lg bg-error/5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-error/20 rounded-lg">
                <Trash2 size={20} className="text-error" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-error mb-1">Delete Account</h3>
                <p className="text-sm text-text/60 mb-2">
                  Permanently delete your account and all associated data. This action is irreversible.
                </p>
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">What will be deleted:</h4>
                      <ul className="text-xs text-red-700 mt-1 space-y-1 list-disc list-inside pl-1">
                        <li>Your personal profile information</li>
                        <li>All groups you created or joined</li>
                        <li>Payment history and transaction records</li>
                        <li>Activity logs and notification history</li>
                        <li>Your preferences and settings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenConfirm}
              className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 w-full sm:w-auto transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Warning Section */}
        <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50">
          <div className="flex items-start space-x-2">
            <Shield size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Considerations</h4>
              <p className="text-xs text-yellow-700">
                If you're a group leader, please transfer leadership to another member before deletion.
                Consider exporting your data if you need to keep records.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal - Step 1: Reason Selection */}
        {showConfirm && !showFinalConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <UserX size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Delete Account</h3>
                    <p className="text-sm text-text/60">Step 1 of 2: Confirm your decision</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">
                        This action cannot be undone. All your data will be permanently removed.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Why are you deleting your account? *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value="privacy"
                          checked={deletionReason === 'privacy'}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm">Privacy concerns</span>
                      </label>
                      <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value="not_using"
                          checked={deletionReason === 'not_using'}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm">Not using the service anymore</span>
                      </label>
                      <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value="found_better"
                          checked={deletionReason === 'found_better'}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm">Found a better alternative</span>
                      </label>
                      <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value="other"
                          checked={deletionReason === 'other'}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm">Other reasons</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleCloseConfirm}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProceedToFinal}
                      disabled={!deletionReason}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Confirmation Modal - Step 2: Type DELETE */}
        {showFinalConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Final Confirmation</h3>
                    <p className="text-sm text-text/60">Step 2 of 2: Type DELETE to confirm</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-800 font-medium mb-1">Final Warning!</p>
                        <p className="text-xs text-red-700">
                          You are about to permanently delete your account. This action cannot be reversed.
                          All your data will be lost forever.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Type <span className="font-bold text-red-600">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Type DELETE here"
                      autoFocus
                    />
                    <p className="text-xs text-text/60 mt-2">
                      This confirms you understand this action is permanent.
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowFinalConfirm(false);
                          setConfirmText('');
                        }}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 transition-colors disabled:opacity-50"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || confirmText !== 'DELETE'}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            <span>Permanently Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}