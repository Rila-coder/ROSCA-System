"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Settings,
  HelpCircle,
  Menu,
  X,
  Loader2,
  LayoutDashboard,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserData {
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

interface SearchResult {
  type: 'group' | 'member';
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  url: string;
}

export default function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ groups: SearchResult[], members: SearchResult[] } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch User Data
  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me");
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const avatarUrl = data.user?.avatar || '/Images/avatar.jpeg';
      
      setUser({
        name: data.user?.name || "User",
        email: data.user?.email || "",
        phone: data.user?.phone || "",
        avatar: avatarUrl,
      });
    } catch (error: any) {
      console.error("Failed to fetch user:", error);
      // Set default user data if fetch fails
      setUser({
        name: "User",
        email: "user@example.com",
        avatar: '/Images/avatar.jpeg',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Notification Count Function
  const fetchNotificationCount = async () => {
    try {
      // Fetch only unread counts
      const res = await fetch('/api/notifications?filter=unread&limit=1');
      if (res.ok) {
        const data = await res.json();
        setNotificationsCount(data.counts?.unread || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications count", error);
    }
  };

  // Search Functionality
  const performSearch = async (query: string) => {
    if (query.trim().length >= 2) {
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Search failed", error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults(null);
      setShowSearchResults(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchNotificationCount(); // Initial fetch
    
    // Event listeners for updates
    const handleProfileUpdate = () => {
      console.log('Profile updated event received, refreshing header...');
      fetchUser();
    };
    
    const handleNotificationUpdate = () => {
      console.log('Notification update event received, refreshing count...');
      fetchNotificationCount();
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profileLastUpdated') {
        console.log('Profile updated in another tab, refreshing...');
        fetchUser();
      }
    };
    
    // Set up listeners
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for updates every 60 seconds
    const interval = setInterval(() => {
      fetchUser();
      fetchNotificationCount();
    }, 60000);
    
    // Click outside to close search and dropdown
    const handleClickOutside = (event: MouseEvent) => {
      // Close search results if clicking outside
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      
      // Close dropdown if clicking outside (handled by the overlay div)
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { 
        method: "POST" 
      });
      
      if (response.ok) {
        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Logout failed");
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Logout failed");
    }
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/Images/avatar.jpeg';
  };

  const handleSearchResultClick = () => {
    setShowSearchResults(false);
    setSearchQuery("");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo/Brand - Hidden on mobile, shown on md+ */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden p-0">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  width={60}
                  height={60}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-primary sm:block">
                ROSCA
              </span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Search Bar with Results */}
          <div className="flex-1 max-w-2xl relative" ref={searchRef}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="search"
                placeholder="Search groups, members, or payments..."
                className="w-full pl-10 pr-4 py-2.5 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                {searchResults && (searchResults.groups.length > 0 || searchResults.members.length > 0) ? (
                  <>
                    {/* Groups Section */}
                    {searchResults.groups.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">Groups</div>
                        {searchResults.groups.map((item) => (
                          <Link 
                            key={item.id} 
                            href={item.url}
                            onClick={handleSearchResultClick}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                          >
                            <div className="p-2 bg-indigo-100 text-primary rounded-lg group-hover:bg-indigo-200 transition-colors">
                              <LayoutDashboard size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{item.title}</div>
                              <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Members Section */}
                    {searchResults.members.length > 0 && (
                      <div className="p-2 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1 mt-1">Members</div>
                        {searchResults.members.map((item) => (
                          <Link 
                            key={item.id} 
                            href={item.url}
                            onClick={handleSearchResultClick}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.title} 
                                  className="w-full h-full object-cover"
                                  onError={handleAvatarError}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  <User size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{item.title}</div>
                              <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  // Not Found State (only show if not searching and query exists)
                  !isSearching && searchQuery.length >= 2 && (
                    <div className="p-8 text-center text-gray-500">
                      <Search size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium">No results found for "{searchQuery}"</p>
                      <p className="text-xs text-gray-400 mt-1">Try checking for typos or searching something else.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right: Icons & Profile */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Notifications */}
            <button
              onClick={() => router.push("/notifications")}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              aria-label={`Notifications (${notificationsCount} unread)`}
            >
              <Bell size={20} className="text-text/70 group-hover:text-primary transition-colors" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center animate-pulse font-bold">
                  {notificationsCount > 99 ? '99+' : notificationsCount}
                </span>
              )}
            </button>

            {/* Help - Hidden on mobile */}
            <button
              onClick={() => router.push("/public-invite/relocat?title=Help %26 Support")}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              aria-label="Help"
            >
              <HelpCircle size={20} className="text-text/70 group-hover:text-primary transition-colors" />
            </button>

            {/* Settings - Hidden on mobile */}
            <button
              onClick={() => router.push("/settings")}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              aria-label="Settings"
            >
              <Settings size={20} className="text-text/70 group-hover:text-primary transition-colors" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                aria-label="User menu"
                disabled={loading}
              >
                <div className="relative w-8 h-8 md:w-9 md:h-9">
                  {loading ? (
                    <div className="w-full h-full rounded-full bg-gray-200 animate-pulse"></div>
                  ) : (
                    <>
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm group-hover:border-primary transition-colors"
                          onError={handleAvatarError}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center border-2 border-white">
                          <User size={16} className="text-primary" />
                        </div>
                      )}
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </>
                  )}
                </div>
                
                <div className="hidden lg:block text-left">
                  <div className="font-medium text-sm text-text truncate max-w-[120px]">
                    {loading ? "Loading..." : user?.name || "User"}
                  </div>
                  <div className="text-xs text-text/60 truncate max-w-[120px]">
                    {loading ? "..." : user?.email || ""}
                  </div>
                </div>
                
                <ChevronDown 
                  size={16} 
                  className={`text-text/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && !loading && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 md:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-5 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full object-cover"
                              onError={handleAvatarError}
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                              <User size={18} className="text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text truncate">
                            {user?.name}
                          </div>
                          <div className="text-xs text-text/60 truncate">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      {user?.phone && (
                        <div className="text-xs text-text/60">
                          📱 {user.phone}
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push("/settings");
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center space-x-3 text-sm transition-colors rounded-lg mx-1"
                      >
                        <Settings size={16} className="text-text/60" />
                        <span>Profile Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          router.push("/public-invite/relocat?title=Help %26 Support");
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center space-x-3 text-sm transition-colors rounded-lg mx-1"
                      >
                        <HelpCircle size={16} className="text-text/60" />
                        <span>Help & Support</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-error hover:bg-red-50 flex items-center space-x-3 text-sm transition-colors rounded-lg mx-1"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-in slide-in-from-top duration-200">
          <div className="px-4 py-3 space-y-1">
            <div className="px-3 py-2 mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={handleAvatarError}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">{user?.name || "User"}</div>
                  <div className="text-xs text-text/60">{user?.email || ""}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                router.push("/settings");
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={20} className="text-text/70" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                router.push("/public-invite/relocat?title=Help %26 Support");
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HelpCircle size={20} className="text-text/70" />
              <span>Help & Support</span>
            </button>
            
            <div className="pt-2 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 p-3 rounded-lg text-error hover:bg-red-50 transition-colors"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}