'use client';

import { useState } from 'react';
import { Shield, Lock, Key, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SecuritySettings() {
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = async () => {
    // Validate passwords
    if (!passwords.newPassword || !passwords.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/users/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success('Password updated successfully');
        // Reset form
        setPasswords({ newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(data.error || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <Shield size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-text">Security Settings</h2>
      </div>

      <div className="mb-8">
        <h3 className="font-medium text-text mb-4">Change Password</h3>
        <p className="text-text/60 text-sm mb-4">
          Set a new password for your account. Password must be at least 6 characters long.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text/60 mb-2">New Password *</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-3 text-text/40" />
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="input-field pl-10 w-full"
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text/60 mb-2">Confirm New Password *</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-3 text-text/40" />
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="input-field pl-10 w-full"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={isSaving || !passwords.newPassword || !passwords.confirmPassword}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}