'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Layers, 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Trello, 
  Megaphone, 
  FolderHeart, 
  Contact, 
  BarChart3, 
  Settings2, 
  ShieldAlert, 
  LogOut,
  Video, 
  Bell, 
  Search, 
  Sun, 
  Moon,
  Menu,
  X,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Hash,
  FileText,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { toast } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, token, isAuthenticated, updateUser } = useAuthStore();
  const { socket } = useSocket();

  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutsideSearch = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSearch);
    };
  }, []);

  // Global Platform Search Queries
  const { data: searchDirUsers } = useQuery({
    queryKey: ['global-search-users'],
    queryFn: () => api.getDirectory('limit=100'),
    enabled: isAuthenticated && searchQuery.trim().length > 0,
  });

  const { data: searchGroups } = useQuery({
    queryKey: ['global-search-groups'],
    queryFn: () => api.getGroups(),
    enabled: isAuthenticated && searchQuery.trim().length > 0,
  });

  const { data: searchTasks } = useQuery({
    queryKey: ['global-search-tasks'],
    queryFn: () => api.getTasks('limit=100'),
    enabled: isAuthenticated && searchQuery.trim().length > 0,
  });

  const { data: searchAnnouncements } = useQuery({
    queryKey: ['global-search-announcements'],
    queryFn: () => api.getAnnouncements('limit=100'),
    enabled: isAuthenticated && searchQuery.trim().length > 0,
  });

  // Filter matches based on search query
  const queryClean = searchQuery.toLowerCase().trim();
  
  const matchedUsers = queryClean
    ? (searchDirUsers?.users || []).filter((u: any) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(queryClean) ||
        u.email.toLowerCase().includes(queryClean) ||
        (u.designation || '').toLowerCase().includes(queryClean)
      ).slice(0, 3)
    : [];

  const matchedGroups = queryClean
    ? (searchGroups || []).filter((g: any) =>
        g.name.toLowerCase().includes(queryClean) ||
        (g.description || '').toLowerCase().includes(queryClean)
      ).slice(0, 3)
    : [];

  const matchedTasks = queryClean
    ? (searchTasks?.tasks || []).filter((t: any) =>
        t.title.toLowerCase().includes(queryClean) ||
        (t.description || '').toLowerCase().includes(queryClean)
      ).slice(0, 3)
    : [];

  const matchedAnnouncements = queryClean
    ? (searchAnnouncements?.announcements || []).filter((a: any) =>
        a.title.toLowerCase().includes(queryClean) ||
        (a.content || '').toLowerCase().includes(queryClean)
      ).slice(0, 3)
    : [];

  const hasSearchResults = matchedUsers.length > 0 || matchedGroups.length > 0 || matchedTasks.length > 0 || matchedAnnouncements.length > 0;

  // Inactivity & Heartbeat states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [lastPingTime, setLastPingTime] = useState(Date.now());
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Time constants
  const IDLE_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes before warning pops up (15 mins total)
  const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // ping server every 5 minutes

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/login');
    }
  }, [isAuthenticated, token, router]);

  // Idle detection & Heartbeat timer
  useEffect(() => {
    if (!isAuthenticated) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (showWarningModal) return; // Freeze reset when warning modal is open
      
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setShowWarningModal(true);
        setCountdown(60);
      }, IDLE_TIMEOUT_MS);

      // Throttled Heartbeat: extend session if active
      const now = Date.now();
      if (isTabVisible && now - lastPingTime > HEARTBEAT_INTERVAL_MS) {
        api.extendSession().catch(err => console.warn('Heartbeat extend session failed:', err));
        setLastPingTime(now);
      }
    };

    // Events to monitor user activity
    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [isAuthenticated, showWarningModal, lastPingTime, isTabVisible]);

  // Warning modal countdown interval
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (showWarningModal) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            handleLogoutForce();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(countdownInterval);
    };
  }, [showWarningModal]);

  // Tab Visibility API monitor
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible) {
        api.extendSession().catch(err => console.warn('Extend session on tab focus failed:', err));
        setLastPingTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleStayLoggedIn = () => {
    api.extendSession().catch(err => console.warn('Extend session failed:', err));
    setLastPingTime(Date.now());
    setShowWarningModal(false);
    setCountdown(60);
  };

  const handleLogoutForce = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Network logout failed:', e);
    }
    logout();
    toast.error('Session expired due to inactivity.');
    window.location.href = '/login';
  };

  // Load Notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated]);

  // Handle incoming real-time notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      toast((t) => (
        <span className="flex flex-col text-xs font-semibold">
          <strong className="text-primary">{notification.title}</strong>
          <span>{notification.message}</span>
        </span>
      ));

      // Browser Push Notification (respects user settings & browser permissions)
      const pushEnabled = user?.settings?.pushEnabled ?? true;
      const desktopEnabled = user?.settings?.desktopEnabled ?? true;
      if (
        pushEnabled &&
        desktopEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Browser Notification construction failed:', e);
        }
      }
    };

    socket.on('notification_received', handleNewNotification);
    socket.on('message', (msg) => {
      // If it's a message notification, re-fetch notifications
      if (msg.senderId !== user?.id) {
        fetchNotifications();
      }
    });

    return () => {
      socket.off('notification_received', handleNewNotification);
      socket.off('message');
    };
  }, [socket, user]);

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = root.classList.contains('dark') ? 'dark' : 'light';
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('dark');
      setTheme('dark');
    } else {
      root.classList.remove('dark');
      setTheme('light');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Network logout error:', e);
    }
    logout();
    window.location.href = '/login';
  };

  const markNotifRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotifRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: 'Direct Chat', href: '/chat', icon: <MessageSquare className="h-4 w-4" /> },
    { name: 'Channels', href: '/groups', icon: <Users className="h-4 w-4" /> },
    { name: 'Meetings', href: '/meetings', icon: <Video className="h-4 w-4" /> },
    { name: 'Kanban Tasks', href: '/tasks', icon: <Trello className="h-4 w-4" /> },
    { name: 'Announcements', href: '/announcements', icon: <Megaphone className="h-4 w-4" /> },
    { name: 'File Storage', href: '/files', icon: <FolderHeart className="h-4 w-4" /> },
    { name: 'Directory', href: '/directory', icon: <Contact className="h-4 w-4" /> },
    { name: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { name: 'Settings', href: '/settings', icon: <Settings2 className="h-4 w-4" /> },
  ];

  // Admin Link
  if (user.role === 'ADMIN') {
    navLinks.push({
      name: 'Admin Panel',
      href: '/admin',
      icon: <ShieldAlert className="h-4 w-4" />,
    });
  }

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r transition-all duration-300 md:relative md:translate-x-0 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header Branding */}
        <div className={`h-16 border-b flex items-center transition-all duration-300 ${
          sidebarCollapsed ? 'px-2 justify-center' : 'px-6 justify-between'
        }`}>
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-lg tracking-tight shrink-0">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            {!sidebarCollapsed && <span>ConnectHub</span>}
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="hidden md:block p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'px-2' : 'px-4'
        }`}>
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                title={sidebarCollapsed ? link.name : undefined}
                className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                  sidebarCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-4 py-2.5'
                } ${
                  active
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-foreground'
                }`}
              >
                <div className="shrink-0">{link.icon}</div>
                {!sidebarCollapsed && <span>{link.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className={`border-t space-y-4 transition-all duration-300 ${
          sidebarCollapsed ? 'p-2' : 'p-4'
        }`}>
          <div ref={statusRef} className={`flex items-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 relative transition-all duration-300 ${
            sidebarCollapsed ? 'justify-center p-1.5' : 'space-x-3 px-2 py-1.5'
          }`}>
            <button 
              type="button"
              aria-label="Change status"
              className="relative focus:outline-none shrink-0" 
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            >
              <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-semibold uppercase text-slate-600 dark:text-slate-300 overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  `${user.firstName[0]}${user.lastName[0]}`
                )}
              </div>
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                user.status === 'ONLINE' ? 'bg-green-500' : 
                user.status === 'AWAY' ? 'bg-amber-500' : 
                user.status === 'BUSY' ? 'bg-red-500' : 
                user.status === 'DND' ? 'bg-rose-600' : 
                user.status === 'INVISIBLE' ? 'bg-slate-400' :
                'bg-slate-400'
              }`} />
            </button>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <Link href="/profile" className="block cursor-pointer">
                  <p className="text-xs font-bold truncate leading-none mb-1 hover:underline">{user.firstName} {user.lastName}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider truncate font-semibold leading-none">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} • {user.status.toLowerCase()}
                  </p>
                </Link>
              </div>
            )}

            {statusMenuOpen && (
              <div className={`absolute bottom-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xl w-44 z-50 space-y-1 animate-slide-up ${
                sidebarCollapsed ? 'left-14' : 'left-2'
              }`}>
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider p-1.5 leading-none">Set Status</p>
                {[
                  { key: 'ONLINE', label: 'Online', color: 'bg-green-500' },
                  { key: 'AWAY', label: 'Away', color: 'bg-amber-500' },
                  { key: 'BUSY', label: 'Busy', color: 'bg-red-500' },
                  { key: 'DND', label: 'Do Not Disturb', color: 'bg-rose-600' },
                  { key: 'INVISIBLE', label: 'Invisible', color: 'bg-slate-400' }
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => {
                      if (socket) {
                        socket.emit('update_presence', { status: st.key });
                      }
                      updateUser({ status: st.key });
                      setStatusMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      user.status === st.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${st.color}`} />
                    <span>{st.label}</span>
                    {user.status === st.key && <Check className="h-3 w-3 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Sign Out Workspace" : undefined}
            className={`flex items-center justify-center border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-all ${
              sidebarCollapsed ? 'p-2.5 w-full' : 'space-x-2 py-2 px-3 w-full'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out Workspace</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b flex items-center justify-between px-6 z-30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div ref={searchRef} className="hidden sm:block relative max-w-xs w-full">
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border text-xs font-medium text-muted-foreground shadow-sm w-full">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Global platform search..."
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full text-foreground"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full shrink-0">
                    <XCircle className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* FLOATING GLASS SEARCH RESULTS OVERLAY */}
              {searchFocused && searchQuery.trim() !== '' && (
                <div className="absolute top-10 left-0 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[999] p-3 space-y-4 max-h-[380px] overflow-y-auto animate-slide-up text-left">
                  
                  {/* Category: Teammates */}
                  {matchedUsers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-1">Teammates</div>
                      <div className="space-y-1">
                        {matchedUsers.map((item: any) => (
                          <Link
                            key={item.id}
                            href={`/chat?contactId=${item.id}&name=${encodeURIComponent(item.firstName + ' ' + item.lastName)}&status=${item.status}`}
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all"
                          >
                            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black uppercase text-slate-500 shrink-0">
                              {item.firstName[0]}{item.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate leading-none mb-0.5">{item.firstName} {item.lastName}</p>
                              <p className="text-[8px] text-muted-foreground truncate leading-none">{item.designation || 'Teammate'}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Channels */}
                  {matchedGroups.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-1">Channels</div>
                      <div className="space-y-1">
                        {matchedGroups.map((item: any) => (
                          <Link
                            key={item.id}
                            href="/groups"
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all"
                          >
                            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Hash className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate leading-none mb-0.5">#{item.name}</p>
                              <p className="text-[8px] text-muted-foreground truncate leading-none">{item.members?.length || 0} followers</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Tasks */}
                  {matchedTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-1">Tasks</div>
                      <div className="space-y-1">
                        {matchedTasks.map((item: any) => (
                          <Link
                            key={item.id}
                            href="/tasks"
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all"
                          >
                            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Trello className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate leading-none mb-0.5">{item.title}</p>
                              <p className="text-[8px] text-muted-foreground truncate leading-none">{item.status.replace('_', ' ')} • {item.priority}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Announcements */}
                  {matchedAnnouncements.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider px-1">Announcements</div>
                      <div className="space-y-1">
                        {matchedAnnouncements.map((item: any) => (
                          <Link
                            key={item.id}
                            href="/announcements"
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center space-x-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all"
                          >
                            <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Megaphone className="h-3.5 w-3.5 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate leading-none mb-0.5">{item.title}</p>
                              <p className="text-[8px] text-muted-foreground truncate leading-none">{new Date(item.createdAt).toLocaleDateString()}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty Results Fallback */}
                  {!hasSearchResults && (
                    <div className="text-center py-6 space-y-2">
                      <Search className="h-6 w-6 text-slate-350 dark:text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Notification Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl relative transition-all"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1.5 h-4 min-w-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div onClick={() => setNotifOpen(false)} className="fixed inset-0 z-40" />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border rounded-2xl shadow-xl z-50 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-sm">Notifications Center</h4>
                      <div className="flex items-center space-x-2.5">
                        <label className="flex items-center space-x-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showUnreadOnly}
                            onChange={(e) => setShowUnreadOnly(e.target.checked)}
                            className="rounded border-slate-350 dark:border-slate-700 text-primary focus:ring-primary h-3 w-3"
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unread Only</span>
                        </label>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={markAllNotifRead}
                            className="text-[9px] text-primary font-bold hover:underline uppercase tracking-wider"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {(showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications).length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-6">
                          No {showUnreadOnly ? 'unread' : ''} notifications yet.
                        </div>
                      ) : (
                        (showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotifRead(notif.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex items-start space-x-2 ${
                              !notif.isRead ? 'border-primary bg-primary/5' : 'bg-slate-50/50'
                            }`}
                          >
                            <div className="flex-1 space-y-0.5">
                              <p className="font-bold leading-none">{notif.title}</p>
                              <p className="text-muted-foreground leading-normal mt-1">{notif.message}</p>
                              <p className="text-[9px] text-slate-400 mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!notif.isRead && <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-1" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      {/* Session Expiring Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative text-center">
            <div className="p-3 bg-amber-500/10 w-fit mx-auto rounded-full text-amber-500">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-base">Inactivity Warning</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your session is expiring in <span className="font-extrabold text-red-500 text-sm">{countdown}</span> seconds due to inactivity.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <button
                onClick={handleLogoutForce}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl transition-all"
              >
                Sign Out
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="py-2.5 px-4 bg-primary text-white rounded-xl shadow transition-all hover:bg-primary/95"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline fallback loader helper
const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
