'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Camera, Save, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '/Images/avatar.jpeg',
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [hasCustomAvatar, setHasCustomAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/profile');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (res.ok) {
        const avatarUrl = data.user?.avatar || '/Images/avatar.jpeg';
        const isCustomAvatar = avatarUrl !== '/Images/avatar.jpeg' && 
                              !avatarUrl.startsWith('/Images/avatar.jpeg');
        
        setProfile({
          name: data.user?.name || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          avatar: avatarUrl,
        });
        setHasCustomAvatar(isCustomAvatar);
      } else {
        throw new Error(data.error || 'Failed to load profile');
      }
    } catch (error: any) {
      console.error('Fetch profile error:', error);
      toast.error('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be smaller than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
          setAvatarChanged(true);
          setHasCustomAvatar(true);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({ 
      ...prev, 
      avatar: '/Images/avatar.jpeg' 
    }));
    setAvatarChanged(true);
    setHasCustomAvatar(false);
    toast.success('Avatar removed. Default avatar will be restored.');
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profile.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Phone validation (optional)
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(profile.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for API
      let avatarToSend;
      if (profile.avatar === '/Images/avatar.jpeg') {
        avatarToSend = null; // Indicate to use default
      } else if (avatarChanged) {
        avatarToSend = profile.avatar; // Send base64 string
      } else {
        avatarToSend = ''; // No change
      }

      const updateData = {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        avatar: avatarToSend
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Profile updated successfully');
        setAvatarChanged(false);
        
        // Dispatch event to notify DashboardHeader
        if (typeof window !== 'undefined') {
          // Method 1: Dispatch a custom event
          window.dispatchEvent(new CustomEvent('profileUpdated'));
          
          // Method 2: Also update localStorage to trigger refresh
          localStorage.setItem('profileLastUpdated', Date.now().toString());
          
          // Method 3: Broadcast to all tabs
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('profile_updates');
            channel.postMessage({ type: 'profileUpdated', timestamp: Date.now() });
            channel.close();
          }
        }
        
        // Refresh profile data
        await fetchProfile();
        
        // Also trigger a refresh of the auth/me endpoint
        try {
          await fetch('/api/auth/me', { cache: 'no-store' });
        } catch (e) {
          // Silent fail for this optional call
        }
        
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <Loader2 className="animate-spin inline-block w-8 h-8 text-primary mb-4" />
          <p className="text-text/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <User size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-text">Profile Settings</h2>
      </div>

      {/* Avatar Section */}
      <div className="mb-8">
        <h3 className="font-medium text-text mb-4">Profile Picture</h3>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative self-start">
            <div className="relative group">
              <img
                src={profile.avatar}
                alt={profile.name || 'User Avatar'}
                className="w-20 h-20 lg:w-24 lg:h-24 rounded-full border-4 border-white shadow-lg object-cover bg-gray-100 transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.log('Avatar failed to load, falling back to default');
                  e.currentTarget.src = '/Images/avatar.jpeg';
                }}
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors"></div>
              
              {/* Change Avatar Button */}
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors z-10 shadow-lg"
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <Camera size={14} />
              </button>
              
              {/* Remove Avatar Button (only shows when custom avatar exists) */}
              {hasCustomAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -bottom-1 -right-10 p-2 bg-error text-white rounded-full hover:bg-error/90 transition-colors z-10 shadow-lg"
                  title="Remove profile picture"
                  aria-label="Remove profile picture"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
              id="avatar-upload"
              aria-label="Upload profile picture"
            />
          </div>
          
          <div className="flex-1">
            <p className="text-text/60 text-sm mb-3">
              Upload a clear photo. Supported formats: JPG, PNG, GIF. Max size: 2MB.
            </p>
            
            <div className="space-y-2">
              {avatarChanged && (
                <div className="flex items-center space-x-2 text-primary text-sm animate-pulse">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Avatar changes pending save</span>
                </div>
              )}
              
              {hasCustomAvatar && (
                <div className="flex items-center space-x-2 text-text/60 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Click the <X size={12} className="inline align-middle mx-0.5" /> button to remove custom avatar</span>
                </div>
              )}
              
              {!hasCustomAvatar && !avatarChanged && (
                <div className="flex items-center space-x-2 text-text/60 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Using default avatar</span>
                </div>
              )}
            </div>
            
            {/* Avatar Upload Tips */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> After saving changes, your profile picture will update across the entire application, including the header.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="mb-8">
        <h3 className="font-medium text-text mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-text/60 mb-2">
              Full Name <span className="text-error">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-text/40" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="input-field pl-10 w-full"
                placeholder="Enter your full name"
                required
                aria-required="true"
              />
            </div>
            <p className="text-xs text-text/40 mt-1">This name will be visible to other group members</p>
          </div>

          <div>
            <label className="block text-sm text-text/60 mb-2">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-text/40" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="input-field pl-10 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                title="Email cannot be changed"
                aria-label="Email address (read-only)"
              />
            </div>
            <p className="text-xs text-text/60 mt-1 flex items-center">
              <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
              Email address cannot be changed for security reasons
            </p>
          </div>

          <div>
            <label className="block text-sm text-text/60 mb-2">
              Phone Number <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-text/40" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input-field pl-10 w-full"
                placeholder="+91 1234567890"
                required
                aria-required="true"
              />
            </div>
            <p className="text-xs text-text/40 mt-1">Used for payment reminders and notifications</p>
          </div>
        </div>
      </div>

      {/* Save Button with Enhanced Feedback */}
      <div className="flex justify-end pt-4 border-t">
        <div className="w-full sm:w-auto space-y-3">
          {avatarChanged && (
            <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2"></div>
              <span>You have unsaved avatar changes</span>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setProfile({
                  name: '',
                  email: profile.email, // Keep email
                  phone: '',
                  avatar: '/Images/avatar.jpeg',
                });
                setAvatarChanged(false);
                setHasCustomAvatar(false);
                toast('Form reset to default values');
              }}
              type="button"
              className="px-4 py-2.5 border border-gray-300 text-text rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Reset form"
            >
              Reset
            </button>
            
            <button
              onClick={handleSave}
              // ✅ FIXED LOGIC HERE: Button enabled if saving OR name/phone are NOT empty
              disabled={isSaving || !profile.name.trim() || !profile.phone.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-35"
              aria-label="Save profile changes"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
          
          {/* Save Status Indicator */}
          <div className="text-xs text-text/60 text-right">
            {isSaving ? (
              <span className="text-primary">Updating profile across the application...</span>
            ) : avatarChanged ? (
              <span className="text-primary">✓ Changes will update your profile picture everywhere</span>
            ) : profile.name && profile.phone ? (
              <span className="text-green-600">✓ All changes saved</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}