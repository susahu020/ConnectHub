'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Trello,
  Megaphone,
  FolderHeart,
  Briefcase,
  Contact,
  BarChart3,
  Settings2,
  ShieldAlert,
  Video,
  Hash,
  FileText,
  Calendar,
  BookOpen,
  Sparkles,
  Network,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useOrganizationSettings } from '../../hooks/useOrganizationSettings';
import { toast } from 'react-hot-toast';
import { Sidebar, NavGroup } from '../../components/layout/Sidebar';
import { TopBar, SearchCategory } from '../../components/layout/TopBar';
import { SessionWarningModal } from '../../components/layout/SessionWarningModal';
import { CelebrationModal } from '../../components/layout/CelebrationModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, token, isAuthenticated, updateUser } = useAuthStore();
  const { socket } = useSocket();
  const { settings: orgSettings } = useOrganizationSettings();

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

  // Cheerful Birthday Modal state
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  useEffect(() => {
    if (user?.birthday) {
      const bday = new Date(user.birthday);
      const today = new Date();
      const isBdayToday = bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
      const currentYear = today.getFullYear();
      const hasSeen = localStorage.getItem(`bday_wish_seen_${user.id}_${currentYear}`);

      if (isBdayToday && !hasSeen) {
        setShowBirthdayModal(true);
      }
    }
  }, [user]);

  // Cheerful Work Anniversary Modal state
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);
  const [anniversaryYears, setAnniversaryYears] = useState(0);

  useEffect(() => {
    if (user?.createdAt) {
      const joinDate = new Date(user.createdAt);
      const today = new Date();
      const isAnniversaryToday = joinDate.getDate() === today.getDate() && joinDate.getMonth() === today.getMonth();
      const completedYears = today.getFullYear() - joinDate.getFullYear();
      const currentYear = today.getFullYear();
      const hasSeen = localStorage.getItem(`anniversary_wish_seen_${user.id}_${currentYear}`);

      if (isAnniversaryToday && completedYears > 0 && !hasSeen) {
        setAnniversaryYears(completedYears);
        setShowAnniversaryModal(true);
      }
    }
  }, [user]);

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

  // Global Platform Search Query
  const { data: globalSearchResults } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: () => api.globalSearch(searchQuery),
    enabled: isAuthenticated && searchQuery.trim().length > 0,
  });

  const matchedUsers = globalSearchResults?.users || [];
  const matchedGroups = globalSearchResults?.groups || []; // Groups represent Channels
  const matchedTeams = globalSearchResults?.teams || []; // Teams represent Teams
  const matchedTasks = globalSearchResults?.tasks || [];
  const matchedAnnouncements = globalSearchResults?.announcements || [];
  const matchedMessages = globalSearchResults?.messages || [];
  const matchedFiles = globalSearchResults?.files || [];
  const matchedDepartments = globalSearchResults?.departments || [];
  const matchedWikiPages = globalSearchResults?.wikiPages || [];

  const hasSearchResults =
    matchedUsers.length > 0 ||
    matchedGroups.length > 0 ||
    matchedTeams.length > 0 ||
    matchedTasks.length > 0 ||
    matchedAnnouncements.length > 0 ||
    matchedMessages.length > 0 ||
    matchedFiles.length > 0 ||
    matchedDepartments.length > 0 ||
    matchedWikiPages.length > 0;

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

  const isManagerOrAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Nav items grouped for scannability (Linear/Notion-style sidebar sections)
  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [{ name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> }],
    },
    {
      label: 'Collaborate',
      items: [
        { name: 'Direct Chat', href: '/chat', icon: <MessageSquare /> },
        { name: 'Channels', href: '/groups', icon: <Users /> },
        { name: 'Meetings', href: '/meetings', icon: <Video /> },
        { name: 'Announcements', href: '/announcements', icon: <Megaphone /> },
      ],
    },
    {
      label: 'Work',
      items: [
        { name: 'Kanban Tasks', href: '/tasks', icon: <Trello /> },
        { name: 'Calendar', href: '/calendar', icon: <Calendar /> },
        ...(isAdmin ? [{ name: 'Automations', href: '/workflows', icon: <Sparkles /> }] : []),
      ],
    },
    {
      label: 'Resources',
      items: [
        { name: 'Knowledge Base', href: '/wiki', icon: <BookOpen /> },
        { name: 'File Storage', href: '/files', icon: <FolderHeart /> },
      ],
    },
    {
      label: 'People',
      items: [
        { name: 'HR Portal', href: '/hr', icon: <Briefcase /> },
        { name: 'Directory', href: '/directory', icon: <Contact /> },
        { name: 'Org Chart', href: '/org-chart', icon: <Network /> },
        ...(isManagerOrAdmin ? [{ name: 'Analytics', href: '/analytics', icon: <BarChart3 /> }] : []),
      ],
    },
    {
      label: 'General',
      items: [
        { name: 'Settings', href: '/settings', icon: <Settings2 /> },
        ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: <ShieldAlert /> }] : []),
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const pageTitle = allNavItems.find((l) => pathname.startsWith(l.href))?.name ?? 'ConnectHub';

  const unreadNotifCount = notifications.filter((n: any) => !n.isRead).length;

  // Flatten global search results into generic categories for the TopBar
  const searchCategories: SearchCategory[] = [
    {
      label: 'Teammates',
      items: matchedUsers.map((item: any) => ({
        id: item.id,
        href: `/chat?contactId=${item.id}&name=${encodeURIComponent(item.firstName + ' ' + item.lastName)}&status=${item.status}`,
        title: `${item.firstName} ${item.lastName}`,
        subtitle: item.designation || 'Teammate',
        icon: (
          <span className="h-full w-full rounded-full bg-muted flex items-center justify-center text-[10px] font-black uppercase text-muted-foreground">
            {item.firstName[0]}{item.lastName[0]}
          </span>
        ),
      })),
    },
    {
      label: 'Channels',
      items: matchedGroups.map((item: any) => ({
        id: item.id,
        href: '/groups',
        title: `#${item.name}`,
        subtitle: `${item.members?.length || 0} followers`,
        icon: <Hash className="text-primary" />,
      })),
    },
    {
      label: 'Teams',
      items: matchedTeams.map((item: any) => ({
        id: item.id,
        href: '/directory',
        title: item.name,
        subtitle: item.description || 'Organization Team',
        icon: <Users className="text-indigo-500" />,
      })),
    },
    {
      label: 'Tasks',
      items: matchedTasks.map((item: any) => ({
        id: item.id,
        href: '/tasks',
        title: item.title,
        subtitle: `${item.status.replace('_', ' ')} • ${item.priority}`,
        icon: <Trello className="text-emerald-500" />,
      })),
    },
    {
      label: 'Announcements',
      items: matchedAnnouncements.map((item: any) => ({
        id: item.id,
        href: '/announcements',
        title: item.title,
        subtitle: new Date(item.createdAt).toLocaleDateString(),
        icon: <Megaphone className="text-indigo-500" />,
      })),
    },
    {
      label: 'Chat Messages',
      items: matchedMessages.map((item: any) => ({
        id: item.id,
        href: '/chat',
        title: `${item.sender?.firstName} ${item.sender?.lastName}`,
        subtitle: item.content,
        icon: <MessageSquare className="text-info" />,
      })),
    },
    {
      label: 'Files & Documents',
      items: matchedFiles.map((item: any) => ({
        id: item.id,
        href: '/files',
        title: item.name,
        subtitle: `${(item.size / 1024).toFixed(1)} KB • ${item.fileType?.toUpperCase()}`,
        icon: <FileText className="text-amber-500" />,
      })),
    },
    {
      label: 'Knowledge Base',
      items: matchedWikiPages.map((item: any) => ({
        id: item.id,
        href: `/wiki?id=${item.id}`,
        title: item.title,
        subtitle: `${item.category} • ${new Date(item.updatedAt).toLocaleDateString()}`,
        icon: <BookOpen className="text-primary" />,
      })),
    },
    {
      label: 'Departments',
      items: matchedDepartments.map((item: any) => ({
        id: item.id,
        href: '/directory',
        title: item.name,
        subtitle: `Code: ${item.code}`,
        icon: <Layers className="text-primary" />,
      })),
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950">
      <Sidebar
        orgSettings={orgSettings}
        user={user}
        pathname={pathname}
        navGroups={navGroups}
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        statusMenuOpen={statusMenuOpen}
        onToggleStatusMenu={() => setStatusMenuOpen(!statusMenuOpen)}
        statusRef={statusRef}
        onSetStatus={(status) => {
          if (socket) {
            socket.emit('update_presence', { status });
          }
          updateUser({ status });
          setStatusMenuOpen(false);
        }}
        onLogout={handleLogout}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          pageTitle={pageTitle}
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          searchRef={searchRef}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchFocused={searchFocused}
          onSearchFocus={() => setSearchFocused(true)}
          onSearchClose={() => setSearchFocused(false)}
          searchCategories={searchCategories}
          hasSearchResults={hasSearchResults}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifications={notifications}
          notifOpen={notifOpen}
          onToggleNotif={() => setNotifOpen(!notifOpen)}
          onCloseNotif={() => setNotifOpen(false)}
          showUnreadOnly={showUnreadOnly}
          onToggleUnreadOnly={setShowUnreadOnly}
          onMarkNotifRead={markNotifRead}
          onMarkAllNotifRead={markAllNotifRead}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">{children}</main>
      </div>

      {showWarningModal && (
        <SessionWarningModal
          countdown={countdown}
          onSignOut={handleLogoutForce}
          onStayLoggedIn={handleStayLoggedIn}
        />
      )}

      {showBirthdayModal && (
        <CelebrationModal
          emoji="🎂"
          title={`Happy Birthday, ${user?.firstName}! 🎉`}
          message={`${orgSettings.orgName} wishes you a wonderful birthday filled with happiness, success, and amazing achievements! Thank you for being such an invaluable part of our team! 🎁✨`}
          confettiEmojis={['🎈', '🥳', '🎁', '🎉']}
          onDismiss={() => {
            setShowBirthdayModal(false);
            if (user?.id) {
              const currentYear = new Date().getFullYear();
              localStorage.setItem(`bday_wish_seen_${user.id}_${currentYear}`, 'true');
            }
          }}
        />
      )}

      {showAnniversaryModal && (
        <CelebrationModal
          emoji="🎖️"
          title="Happy Work Anniversary! 🎉"
          message={`Congratulations, ${user?.firstName}, on completing ${anniversaryYears} Year${anniversaryYears > 1 ? 's' : ''} with ${orgSettings.orgName}! We appreciate your hard work, commitment, and the outstanding contributions you bring to our team every day! 🥂✨`}
          confettiEmojis={['🎖️', '👏', '🌟', '🎉']}
          onDismiss={() => {
            setShowAnniversaryModal(false);
            if (user?.id) {
              const currentYear = new Date().getFullYear();
              localStorage.setItem(`anniversary_wish_seen_${user.id}_${currentYear}`, 'true');
            }
          }}
        />
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
