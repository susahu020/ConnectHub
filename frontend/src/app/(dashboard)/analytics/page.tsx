'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldAlert } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsHeader } from '../../../components/analytics/AnalyticsHeader';
import { AnalyticsTabs, SubTabType } from '../../../components/analytics/AnalyticsTabs';
import { OverviewTab } from '../../../components/analytics/tabs/OverviewTab';
import { ProductivityTab } from '../../../components/analytics/tabs/ProductivityTab';
import { UsersTab } from '../../../components/analytics/tabs/UsersTab';
import { ChatTab } from '../../../components/analytics/tabs/ChatTab';
import { DepartmentsTab } from '../../../components/analytics/tabs/DepartmentsTab';
import { TasksTab } from '../../../components/analytics/tabs/TasksTab';
import { FilesTab } from '../../../components/analytics/tabs/FilesTab';

export default function AnalyticsDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTabType>('overview');

  // Role Gate: restrict access to ADMIN and MANAGER
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      router.replace('/dashboard');
      toast.error('Access denied. Analytics dashboard is restricted to managers and administrators.');
    }
  }, [user, router]);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => api.getAnalytics(),
    enabled: !!user && (user.role === 'ADMIN' || user.role === 'MANAGER'),
    refetchInterval: 10000, // auto-refresh stats every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <Activity className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Aggregating workspace analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center">
        <ShieldAlert className="h-8 w-8 text-rose-500 mb-3" />
        <p className="text-sm font-bold text-slate-800 dark:text-white">Failed to load analytics</p>
        <p className="text-xs text-slate-500 mt-1">Please ensure your user role has administrative permissions.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
      <AnalyticsHeader />
      <AnalyticsTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="min-h-[450px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'productivity' && <ProductivityTab stats={stats} />}
            {activeTab === 'users' && <UsersTab stats={stats} />}
            {activeTab === 'chat' && <ChatTab stats={stats} />}
            {activeTab === 'departments' && <DepartmentsTab stats={stats} />}
            {activeTab === 'tasks' && <TasksTab stats={stats} />}
            {activeTab === 'files' && <FilesTab stats={stats} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
