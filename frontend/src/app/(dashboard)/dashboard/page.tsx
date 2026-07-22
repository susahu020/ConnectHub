'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../hooks/useSocket';
import { WelcomeHeader } from '../../../components/dashboard/WelcomeHeader';
import { WidgetVisibilityBar } from '../../../components/dashboard/WidgetVisibilityBar';
import { CelebrationWishesBanner } from '../../../components/dashboard/CelebrationWishesBanner';
import { DashboardSkeleton } from '../../../components/dashboard/DashboardSkeleton';
import { WidgetCard } from '../../../components/dashboard/WidgetCard';
import { StatsWidget } from '../../../components/dashboard/widgets/StatsWidget';
import { CelebrationsSummaryWidget } from '../../../components/dashboard/widgets/CelebrationsSummaryWidget';
import { TasksWidget } from '../../../components/dashboard/widgets/TasksWidget';
import { AnnouncementsWidget } from '../../../components/dashboard/widgets/AnnouncementsWidget';
import { ActivityFeedWidget } from '../../../components/dashboard/widgets/ActivityFeedWidget';
import { ProjectsWidget } from '../../../components/dashboard/widgets/ProjectsWidget';
import { MeetingsWidget } from '../../../components/dashboard/widgets/MeetingsWidget';
import { FilesWidget } from '../../../components/dashboard/widgets/FilesWidget';
import { QuickActionsWidget } from '../../../components/dashboard/widgets/QuickActionsWidget';
import { OnlineTeammatesWidget } from '../../../components/dashboard/widgets/OnlineTeammatesWidget';
import { PerformanceWidget } from '../../../components/dashboard/widgets/PerformanceWidget';

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
    return <DashboardSkeleton />;
  }

  // Calculate Productivity Score dynamically (Completed Tasks / Total Tasks * 100)
  const totalTasks = stats?.tasks?.length || 0;
  const completedTasks = stats?.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
  const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 85;

  return (
    <div className="space-y-8">
      <WelcomeHeader
        greeting={getGreeting()}
        firstName={user?.firstName}
        currentTime={currentTime}
        isEditing={isEditing}
        isSaving={saveLayoutMutation.isPending}
        onDiscard={() => {
          if (layoutData) setLayouts(layoutData);
          setIsEditing(false);
        }}
        onSave={handleSaveLayout}
        onStartEditing={() => setIsEditing(true)}
      />

      {isEditing && <WidgetVisibilityBar layouts={layouts} onToggleWidget={handleToggleWidget} />}

      <CelebrationWishesBanner wishes={myWishes} />

      {/* Main Draggable CSS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {layouts
          .filter((w) => w.visible)
          .map((widget) => (
            <WidgetCard
              key={widget.widgetKey}
              widgetKey={widget.widgetKey}
              w={widget.w}
              h={widget.h}
              isEditing={isEditing}
              isDragged={draggedKey === widget.widgetKey}
              onDragStart={() => handleDragStart(widget.widgetKey)}
              onDrop={() => handleDrop(widget.widgetKey)}
              onResize={(type, delta) => handleResizeWidget(widget.widgetKey, type, delta)}
            >
              {widget.widgetKey === 'stats' && <StatsWidget stats={stats} />}
              {widget.widgetKey === 'celebrations' && <CelebrationsSummaryWidget />}
              {widget.widgetKey === 'tasks' && <TasksWidget tasks={stats?.tasks} />}
              {widget.widgetKey === 'announcements' && (
                <AnnouncementsWidget announcements={stats?.recentAnnouncements} />
              )}
              {widget.widgetKey === 'activity_feed' && (
                <ActivityFeedWidget activity={stats?.recentActivity} />
              )}
              {widget.widgetKey === 'projects' && <ProjectsWidget projects={stats?.projects} />}
              {widget.widgetKey === 'meetings' && <MeetingsWidget tasks={stats?.tasks} />}
              {widget.widgetKey === 'files' && <FilesWidget files={stats?.recentFiles} />}
              {widget.widgetKey === 'quick_actions' && <QuickActionsWidget />}
              {widget.widgetKey === 'online' && (
                <OnlineTeammatesWidget onlineUsers={stats?.onlineUsersList} />
              )}
              {widget.widgetKey === 'performance' && (
                <PerformanceWidget
                  productivityScore={productivityScore}
                  completedTasks={completedTasks}
                  totalTasks={totalTasks}
                />
              )}
            </WidgetCard>
          ))}
      </div>
    </div>
  );
}
