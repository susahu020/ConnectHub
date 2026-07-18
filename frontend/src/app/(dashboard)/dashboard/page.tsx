'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Bell, 
  Trello, 
  Users, 
  Megaphone, 
  FileText, 
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  Settings,
  GripVertical,
  Check,
  Eye,
  EyeOff,
  Plus,
  Play,
  Activity,
  FolderOpen
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../hooks/useSocket';
import CelebrationsWidget from '../../../components/CelebrationsWidget';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  // Live Date-Clock system
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // 1. Fetch dashboard statistics
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });

  // Fetch celebration wishes sent to the current user today
  const { data: myWishes = [] } = useQuery({
    queryKey: ['my-wishes'],
    queryFn: () => api.getMyWishes(),
    enabled: !!user,
  });

  // Keep the celebration wishes widget live: refresh as soon as a teammate sends a new wish
  useEffect(() => {
    if (!socket) return;

    const handleHRUpdate = (data: any) => {
      if (data?.type === 'RECOGNITION') {
        queryClient.invalidateQueries({ queryKey: ['my-wishes'] });
      }
    };

    socket.on('hr_update', handleHRUpdate);
    return () => {
      socket.off('hr_update', handleHRUpdate);
    };
  }, [socket, queryClient]);

  // 2. Fetch widget layouts
  const { data: layoutData, isLoading: loadingLayout } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: () => api.getDashboardLayout(),
  });

  useEffect(() => {
    if (layoutData) {
      // Sort by order/index or grid coordinates (y then x) to render properly
      const sorted = [...layoutData].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      setLayouts(sorted);
    }
  }, [layoutData]);

  // 3. Save Layout Mutation
  const saveLayoutMutation = useMutation({
    mutationFn: (layoutsArray: any[]) => api.saveDashboardLayout(layoutsArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
      setIsEditing(false);
      toast.success('Dashboard layout saved.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save layout.');
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'HIGH': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
      case 'NORMAL': return 'text-primary bg-primary/5 border-primary/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'REVIEW': return 'bg-yellow-500 text-white';
      case 'IN_PROGRESS': return 'bg-primary text-white';
      default: return 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350';
    }
  };

  // Toggle Visibility helper
  const handleToggleWidget = (key: string) => {
    setLayouts((prev) =>
      prev.map((l) => (l.widgetKey === key ? { ...l, visible: !l.visible } : l))
    );
  };

  // Resize helpers
  const handleResizeWidget = (key: string, type: 'w' | 'h', delta: number) => {
    setLayouts((prev) =>
      prev.map((l) => {
        if (l.widgetKey === key) {
          const val = type === 'w' ? l.w : l.h;
          const nextVal = Math.max(1, Math.min(4, val + delta));
          return { ...l, [type]: nextVal };
        }
        return l;
      })
    );
  };

  // Save changes handler
  const handleSaveLayout = () => {
    saveLayoutMutation.mutate(layouts);
  };

  // Drag and Drop Swap handlers
  const handleDragStart = (key: string) => {
    if (!isEditing) return;
    setDraggedKey(key);
  };

  const handleDrop = (targetKey: string) => {
    if (!isEditing || !draggedKey || draggedKey === targetKey) return;

    const copy = [...layouts];
    const idx1 = copy.findIndex((l) => l.widgetKey === draggedKey);
    const idx2 = copy.findIndex((l) => l.widgetKey === targetKey);

    if (idx1 !== -1 && idx2 !== -1) {
      // Swap coordinates (x, y)
      const tempX = copy[idx1].x;
      const tempY = copy[idx1].y;
      copy[idx1].x = copy[idx2].x;
      copy[idx1].y = copy[idx2].y;
      copy[idx2].x = tempX;
      copy[idx2].y = tempY;

      // Re-sort layouts array by coordinates (y then x) to render properly
      const sorted = copy.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      setLayouts(sorted);
    }
    setDraggedKey(null);
  };

  if (loadingStats || loadingLayout) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl border" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl border col-span-2" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl border" />
        </div>
      </div>
    );
  }

  // Calculate Productivity Score dynamically (Completed Tasks / Total Tasks * 100)
  const totalTasks = stats?.tasks?.length || 0;
  const completedTasks = stats?.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
  const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 85;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400">
            {getGreeting()}, {user?.firstName}! 👋
          </h1>
          {currentTime && (
            <p className="text-[10px] bg-slate-150/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-black uppercase tracking-wider w-fit mt-1.5 flex items-center space-x-1 border border-slate-200/50 dark:border-slate-800/60 leading-none">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} •{' '}
                {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </p>
          )}
        </div>

        {/* Layout customization toolbar */}
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  if (layoutData) setLayouts(layoutData);
                  setIsEditing(false);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900 shadow-sm"
              >
                Discard
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={saveLayoutMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>Save Layout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-primary/30 transition-all bg-white/70 dark:bg-slate-900/60 shadow-sm flex items-center space-x-1.5 backdrop-blur-md"
            >
              <Settings className="h-4 w-4 text-primary shrink-0" />
              <span>Customize Widgets</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Toggles Control Center */}
      {isEditing && (
        <div className="p-4 border bg-primary/5 border-primary/20 rounded-2xl space-y-3">
          <p className="text-xs font-extrabold uppercase text-primary tracking-wider">Configure Dashboard Widgets</p>
          <div className="flex flex-wrap gap-3">
            {layouts.map((w) => (
              <button
                key={w.widgetKey}
                onClick={() => handleToggleWidget(w.widgetKey)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${
                  w.visible
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-slate-900 text-muted-foreground border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span className="capitalize">{w.widgetKey.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Celebration Wishes Dashboard Widget */}
      {myWishes.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/5 border border-primary/20 rounded-3xl p-6 space-y-4 shadow-sm relative overflow-hidden text-left mb-6">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">🎂🎖️</div>
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
              🎉 Teammate Celebration Wishes
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Wishes sent to you today by your colleagues. These will automatically clear tomorrow!
            </p>
          </div>
          
          <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myWishes.map((wish: any) => (
                <div key={wish.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase shrink-0 border dark:border-slate-700">
                      {wish.sender?.avatarUrl ? (
                        <img src={wish.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        `${wish.sender?.firstName?.[0]}${wish.sender?.lastName?.[0]}`
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                        {wish.sender?.firstName} {wish.sender?.lastName}
                      </h4>
                      <p className="text-[9px] text-slate-450">{wish.sender?.designation || 'Teammate'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-350 italic pl-3 border-l-2 border-primary/30 leading-relaxed whitespace-pre-line">
                    "{wish.message}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Draggable CSS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {layouts
          .filter((w) => w.visible)
          .map((widget) => {
            const isDragged = draggedKey === widget.widgetKey;

            return (
              <div
                key={widget.widgetKey}
                style={{
                  gridColumn: `span ${widget.w}`,
                  gridRow: `span ${widget.h}`,
                }}
                draggable={isEditing}
                onDragStart={() => handleDragStart(widget.widgetKey)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(widget.widgetKey)}
                className={`bg-white/65 dark:bg-slate-900/65 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5 relative ${
                  isEditing 
                    ? 'ring-2 ring-dashed ring-primary/40 cursor-grab active:cursor-grabbing hover:border-primary/50' 
                    : ''
                } ${isDragged ? 'opacity-30 scale-95 border-primary' : ''}`}
              >
                {/* Custom Edit Overlays with sizes controls */}
                {isEditing && (
                  <div className="absolute top-2 right-2 bg-slate-900/95 border border-slate-850 p-1.5 rounded-lg flex items-center space-x-1 text-[9px] font-bold text-white shadow-xl z-20">
                    <div className="flex items-center space-x-1 px-1.5 border-r border-slate-700 leading-none mr-1">
                      <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>DRAG</span>
                    </div>
                    <button
                      onClick={() => handleResizeWidget(widget.widgetKey, 'w', 1)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-center shrink-0 border border-slate-700"
                    >
                      W+
                    </button>
                    <button
                      onClick={() => handleResizeWidget(widget.widgetKey, 'w', -1)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-center shrink-0 border border-slate-700"
                    >
                      W-
                    </button>
                    <button
                      onClick={() => handleResizeWidget(widget.widgetKey, 'h', 1)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-center shrink-0 border border-slate-700"
                    >
                      H+
                    </button>
                    <button
                      onClick={() => handleResizeWidget(widget.widgetKey, 'h', -1)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-center shrink-0 border border-slate-700"
                    >
                      H-
                    </button>
                  </div>
                )}

                {/* Render corresponding widget view based on key */}
                <div className="flex-1 flex flex-col p-6 space-y-4">
                  {/* WIDGET: STATS */}
                  {widget.widgetKey === 'stats' && (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80 dark:border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-base">Key Metrics</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                        <div className="flex items-center space-x-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl transition-all duration-300 hover:shadow-md">
                          <div className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Unread DMs</p>
                            <p className="text-xl font-black leading-none mt-2 text-blue-600 dark:text-blue-400">{stats?.unreadMessages || 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-2xl transition-all duration-300 hover:shadow-md">
                          <div className="p-3 bg-gradient-to-tr from-rose-500 to-red-600 text-white rounded-xl shadow-lg shadow-rose-500/20 shrink-0">
                            <Bell className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Alerts</p>
                            <p className="text-xl font-black leading-none mt-2 text-rose-550 dark:text-rose-400">{stats?.unreadNotifications || 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl transition-all duration-300 hover:shadow-md">
                          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 shrink-0">
                            <Trello className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">My Tasks</p>
                            <p className="text-xl font-black leading-none mt-2 text-emerald-500">{stats?.pendingTasksCount || 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl transition-all duration-300 hover:shadow-md">
                          <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Online Users</p>
                            <p className="text-xl font-black leading-none mt-2 text-amber-550 dark:text-amber-400">{stats?.onlineEmployees || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WIDGET: TODAY'S CELEBRATIONS */}
                  {widget.widgetKey === 'celebrations' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80 dark:border-slate-800/80 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg leading-none">🎉</span>
                          <h3 className="font-bold text-base">Today's Celebrations</h3>
                        </div>
                      </div>
                      <CelebrationsWidget variant="compact" embedded />
                    </div>
                  )}

                  {/* WIDGET: TASKS */}
                  {widget.widgetKey === 'tasks' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Trello className="h-5 w-5 text-emerald-500" />
                          <h3 className="font-bold text-base">My Active Tasks</h3>
                        </div>
                        <Link href="/tasks" className="text-xs text-primary font-bold hover:underline flex items-center space-x-0.5">
                          <span>Board</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {stats?.tasks?.length === 0 ? (
                          <div className="text-center text-xs text-muted-foreground py-8">No pending tasks.</div>
                        ) : (
                          stats?.tasks?.map((task: any) => (
                            <div key={task.id} className="p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getStatusColor(task.status)}`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs truncate leading-snug">{task.title}</h4>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold">{new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: ANNOUNCEMENTS */}
                  {widget.widgetKey === 'announcements' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Megaphone className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-base">Latest Announcements</h3>
                        </div>
                        <Link href="/announcements" className="text-xs text-primary font-bold hover:underline flex items-center space-x-0.5">
                          <span>Bulletin</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {stats?.recentAnnouncements?.length === 0 ? (
                          <div className="text-center text-xs text-muted-foreground py-8">No announcements.</div>
                        ) : stats?.recentAnnouncements?.map((ann: any) => (
                          <div key={ann.id} className="p-3.5 border border-slate-200/50 dark:border-slate-800/60 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:border-primary/20 transition-all space-y-1.5 bg-white/40 dark:bg-slate-900/40 hover:shadow-sm">
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                              <span className="font-bold">{ann.creator.firstName} {ann.creator.lastName}</span>
                              <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-xs truncate leading-snug">{ann.title}</h4>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{ann.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: ACTIVITY FEED */}
                  {widget.widgetKey === 'activity_feed' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-indigo-500" />
                          <h3 className="font-bold text-base">Recent Activity Feed</h3>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[220px]">
                        {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 py-8">No recent activity logs.</div>
                        ) : (
                          stats.recentActivity.map((log: any) => (
                            <div key={log.id} className="flex items-start space-x-3 text-xs">
                              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <p className="font-semibold text-foreground leading-normal capitalize">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>
                                <span className="text-[9px] text-slate-400 font-semibold">{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: PROJECTS */}
                  {widget.widgetKey === 'projects' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-5 w-5 text-emerald-500" />
                          <h3 className="font-bold text-base">Active Projects</h3>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {!stats?.projects || stats.projects.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 py-8">No active projects.</div>
                        ) : (
                          stats.projects.map((proj: any) => (
                            <div key={proj.id} className="p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex items-center justify-between gap-4">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h4 className="font-bold text-xs truncate leading-snug">{proj.name}</h4>
                                <p className="text-[10px] text-muted-foreground truncate">Team: {proj.team?.name || 'General'}</p>
                              </div>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">
                                {proj.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: MEETINGS */}
                  {widget.widgetKey === 'meetings' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-base">Today's Agenda</h3>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {(() => {
                          const today = new Date().toDateString();
                          const todayTasks = stats?.tasks?.filter((t: any) => {
                            if (!t.dueDate) return false;
                            return new Date(t.dueDate).toDateString() === today;
                          }) || [];

                          if (todayTasks.length === 0) {
                            return <div className="text-center text-xs text-slate-400 py-8">No events/tasks scheduled for today.</div>;
                          }

                          return todayTasks.map((task: any) => (
                            <div key={task.id} className="p-3 border-l-4 border-l-primary bg-slate-50/55 dark:bg-slate-850 rounded-r-xl transition-all space-y-1">
                              <div className="flex items-center justify-between text-[9px] text-slate-400">
                                <span className="font-bold flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>All Day Event</span>
                                </span>
                                <span>{task.priority}</span>
                              </div>
                              <h4 className="font-bold text-xs truncate leading-snug">{task.title}</h4>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: FILES */}
                  {widget.widgetKey === 'files' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-indigo-500" />
                          <h3 className="font-bold text-base">Recent Uploads</h3>
                        </div>
                        <Link href="/files" className="text-xs text-primary font-bold hover:underline flex items-center space-x-0.5">
                          <span>Storage</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {stats?.recentFiles?.length === 0 ? (
                          <div className="text-center text-xs text-muted-foreground py-8">No files.</div>
                        ) : (
                          stats?.recentFiles?.map((file: any) => (
                            <div key={file.id} className="p-2.5 border border-slate-200/50 dark:border-slate-800/60 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:border-indigo-500/20 transition-all flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 hover:shadow-sm">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="h-7 w-7 bg-indigo-500/10 text-indigo-500 rounded flex items-center justify-center shrink-0 text-[8px] font-black uppercase">
                                  {file.fileType.substring(0, 3)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate leading-none mb-1">{file.name}</p>
                                  <p className="text-[8px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                              </div>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-foreground" />
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: QUICK ACTIONS */}
                  {widget.widgetKey === 'quick_actions' && (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Play className="h-5 w-5 text-indigo-500" />
                          <h3 className="font-bold text-base">Quick Shortcuts</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <Link
                          href="/tasks"
                          className="flex flex-col items-center justify-center p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-emerald-500/30 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:shadow-md group space-y-2 bg-white/40 dark:bg-slate-900/40"
                        >
                          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-extrabold tracking-tight">New Task</span>
                        </Link>
                        <Link
                          href="/announcements"
                          className="flex flex-col items-center justify-center p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-primary/30 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:shadow-md group space-y-2 bg-white/40 dark:bg-slate-900/40"
                        >
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <Megaphone className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-extrabold tracking-tight">Bulletin</span>
                        </Link>
                        <Link
                          href="/files"
                          className="flex flex-col items-center justify-center p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-indigo-500/30 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:shadow-md group space-y-2 bg-white/40 dark:bg-slate-900/40"
                        >
                          <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-extrabold tracking-tight">Upload File</span>
                        </Link>
                        <Link
                          href="/chat"
                          className="flex flex-col items-center justify-center p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-primary/30 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:shadow-md group space-y-2 bg-white/40 dark:bg-slate-900/40"
                        >
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-extrabold tracking-tight">Start DM</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* WIDGET: ONLINE */}
                  {widget.widgetKey === 'online' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-primary" />
                          <h3 className="font-bold text-base">Online Teammates</h3>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {stats?.onlineUsersList?.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 py-8">Only you are online.</div>
                        ) : (
                          stats?.onlineUsersList?.map((olUser: any) => (
                            <div key={olUser.id} className="flex items-center space-x-3 p-1 rounded-xl">
                              <div className="relative">
                                <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-500 shrink-0">
                                  {olUser.firstName[0]}{olUser.lastName[0]}
                                </div>
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500 flex items-center justify-center">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate leading-none mb-1">{olUser.firstName} {olUser.lastName}</p>
                                <p className="text-[9px] text-muted-foreground truncate leading-none">{olUser.designation || 'Engineer'}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* WIDGET: PERFORMANCE */}
                  {widget.widgetKey === 'performance' && (
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-indigo-500" />
                          <h3 className="font-bold text-base">Workspace Productivity</h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-around gap-6 pt-2">
                        {/* Circular Progress Gauge */}
                        <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
                          <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                            <defs>
                              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                            </defs>
                            <path
                              className="text-slate-100 dark:text-slate-800"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="transition-all duration-1000"
                              strokeDasharray={`${productivityScore}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="url(#scoreGrad)"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="text-center">
                            <span className="text-base font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-sky-400 dark:to-indigo-400">{productivityScore}%</span>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold leading-none mt-1">Score</p>
                          </div>
                        </div>

                        {/* Task metrics data labels */}
                        <div className="space-y-3 flex-1">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>Tasks Completed</span>
                              <span>{completedTasks} / {totalTasks}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full" style={{ width: `${productivityScore}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>Drive Space</span>
                              <span>4.2 GB / 10 GB</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{ width: '42%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
