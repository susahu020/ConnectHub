'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Folder, 
  CheckCircle, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  FileText, 
  Database,
  PieChart,
  Calendar,
  Layers,
  ShieldAlert,
  Coffee,
  X
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type SubTabType = 'overview' | 'users' | 'chat' | 'departments' | 'tasks' | 'files';

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

  // Format Bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { activeUsers, chatAnalytics, departmentProductivity, taskCompletion, fileUsage } = stats;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Workspace Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry and aggregated system performance audits.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Telemetry Hooked</span>
        </div>
      </div>

      {/* DASHBOARD TAB CONTROLS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="h-4 w-4" /> },
          { id: 'users', label: 'Active Users', icon: <Users className="h-4 w-4" /> },
          { id: 'chat', label: 'Chat Activity', icon: <MessageSquare className="h-4 w-4" /> },
          { id: 'departments', label: 'Department Output', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'tasks', label: 'Tasks Metric', icon: <CheckCircle className="h-4 w-4" /> },
          { id: 'files', label: 'File Storage', icon: <Folder className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SubTabType)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all duration-200 leading-none ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-650 hover:border-slate-200 dark:hover:border-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER DETAILED SECTION */}
      <div className="min-h-[450px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                
                {/* Metrics Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Card 1: Active Users */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Members</span>
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                        {activeUsers.activeSocketUsers} <span className="text-xs text-slate-400 font-bold">/ {activeUsers.totalUsers} online</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Live active socket connections: {activeUsers.activeSocketConnections}</p>
                    </div>
                  </div>

                  {/* Card 2: Chat Output */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chat Throughput</span>
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                        {chatAnalytics.totalMessages.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Total messages sent across {chatAnalytics.totalChannels} channels</p>
                    </div>
                  </div>

                  {/* Card 3: Task Health */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Completion</span>
                      <CheckCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                        {taskCompletion.completionRate}%
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {taskCompletion.statusCounts.COMPLETED} completed of {taskCompletion.totalTasks} tasks
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Storage usage */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage Consumption</span>
                      <Database className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                        {formatBytes(fileUsage.totalStorageBytes)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Allocated across {fileUsage.totalFiles} files</p>
                    </div>
                  </div>

                </div>

                {/* Sub panels grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Department Productivity rank */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                      Department Productivity Ranking
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                    </h4>
                    <div className="space-y-4">
                      {departmentProductivity.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">No department metrics available.</p>
                      ) : (
                        departmentProductivity.map((dept: any, idx: number) => (
                          <div key={dept.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span>#{idx + 1} {dept.name} ({dept.totalMembers} staff)</span>
                              <span>{dept.completionRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full" 
                                style={{ width: `${dept.completionRate}%` }} 
                              />
                            </div>
                            <p className="text-[9px] text-slate-400">{dept.completedTasks} completed / {dept.totalTasks} total tasks</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Task priority breakdown chart */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                      Task Priority Distribution
                      <PieChart className="h-4 w-4 text-slate-400" />
                    </h4>
                    <div className="space-y-4">
                      {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => {
                        const count = taskCompletion.priorityCounts[priority] || 0;
                        const pct = taskCompletion.totalTasks > 0 ? ((count / taskCompletion.totalTasks) * 100).toFixed(0) : '0';
                        const colorMap: Record<string, string> = {
                          LOW: 'bg-slate-400',
                          NORMAL: 'bg-blue-500',
                          HIGH: 'bg-amber-500',
                          URGENT: 'bg-rose-500'
                        };
                        return (
                          <div key={priority} className="flex items-center gap-4">
                            <span className="w-16 text-right text-xs font-bold text-slate-400">{priority}</span>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-4 rounded-lg overflow-hidden flex items-center relative">
                              <div 
                                className={`${colorMap[priority]} h-full`} 
                                style={{ width: `${pct}%` }} 
                              />
                              <span className="absolute left-2 text-[10px] font-black text-slate-800 dark:text-white leading-none">
                                {count} tasks ({pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ACTIVE USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                
                {/* Active user cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'ONLINE', count: activeUsers.statusCounts.ONLINE, color: 'bg-green-500' },
                    { label: 'AWAY', count: activeUsers.statusCounts.AWAY, color: 'bg-amber-500' },
                    { label: 'BUSY / DND', count: activeUsers.statusCounts.BUSY + activeUsers.statusCounts.DND, color: 'bg-rose-500' },
                    { label: 'OFFLINE', count: activeUsers.statusCounts.OFFLINE, color: 'bg-slate-350 dark:bg-slate-650' }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${stat.color}`} />
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white leading-none mt-0.5">{stat.count}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sockets Details */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4">WebSocket Session Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-slate-300">
                    <div className="space-y-2 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6">
                      <div className="flex justify-between py-1">
                        <span>Unique Connected Users</span>
                        <span className="font-bold text-slate-850 dark:text-white">{activeUsers.activeSocketUsers}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Total Open WebSockets</span>
                        <span className="font-bold text-slate-850 dark:text-white">{activeUsers.activeSocketConnections}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Average Sockets per User</span>
                        <span className="font-bold text-slate-850 dark:text-white">
                          {activeUsers.activeSocketUsers > 0 ? (activeUsers.activeSocketConnections / activeUsers.activeSocketUsers).toFixed(1) : 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1">
                        <span>Total Office Roster</span>
                        <span className="font-bold text-slate-850 dark:text-white">{activeUsers.totalUsers} Members</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Connection Ratio</span>
                        <span className="font-bold text-slate-850 dark:text-white">
                          {activeUsers.totalUsers > 0 ? ((activeUsers.activeSocketUsers / activeUsers.totalUsers) * 100).toFixed(0) : 0}% Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* CHAT ANALYTICS TAB */}
            {activeTab === 'chat' && (
              <div className="space-y-6">
                
                {/* SVG Line Graph for Chat history */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Message History (Last 7 Days)</h4>
                  
                  {chatAnalytics.chatHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-12 text-center">No chat logs recorded.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* SVG Chart */}
                      <div className="w-full h-48 border-b border-l flex items-end justify-between px-4 pb-1 relative">
                        {(() => {
                          const counts = chatAnalytics.chatHistory.map((d: any) => d.count);
                          const maxCount = Math.max(...counts, 5);
                          return chatAnalytics.chatHistory.map((day: any, idx: number) => {
                            const heightPct = (day.count / maxCount) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end px-2">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                                  {day.count} messages
                                </div>
                                {/* Bar */}
                                <div 
                                  className="w-8 bg-primary rounded-t-lg transition-all group-hover:bg-primary-dark"
                                  style={{ height: `${Math.max(4, heightPct)}%` }} 
                                />
                                <span className="text-[8px] font-bold text-slate-400 mt-2 truncate w-full text-center">
                                  {day.date.slice(5)}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* DEPARTMENT TAB */}
            {activeTab === 'departments' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Department Performance Logs</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                          <th className="px-5 py-3">Department Name</th>
                          <th className="px-5 py-3">Total Members</th>
                          <th className="px-5 py-3">Active Tasks</th>
                          <th className="px-5 py-3">Completed Tasks</th>
                          <th className="px-5 py-3">Task Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {departmentProductivity.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400">No departments configured.</td>
                          </tr>
                        ) : (
                          departmentProductivity.map((dept: any) => (
                            <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{dept.name}</td>
                              <td className="px-5 py-4 text-slate-500 font-semibold">{dept.totalMembers} Members</td>
                              <td className="px-5 py-4 text-amber-500 font-bold">{dept.pendingTasks} Pending</td>
                              <td className="px-5 py-4 text-green-500 font-bold">{dept.completedTasks} Completed</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 dark:text-white">{dept.completionRate}%</span>
                                  <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full" style={{ width: `${dept.completionRate}%` }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TASK COMPLETION TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                
                {/* Task status counts grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'TODO', count: taskCompletion.statusCounts.TODO, color: 'border-slate-200 bg-slate-500/10 text-slate-650' },
                    { label: 'IN PROGRESS', count: taskCompletion.statusCounts.IN_PROGRESS, color: 'border-blue-200 bg-blue-500/10 text-blue-600' },
                    { label: 'REVIEW', count: taskCompletion.statusCounts.REVIEW, color: 'border-amber-200 bg-amber-500/10 text-amber-600' },
                    { label: 'COMPLETED', count: taskCompletion.statusCounts.COMPLETED, color: 'border-green-200 bg-green-500/10 text-green-600' }
                  ].map((stat, idx) => (
                    <div key={idx} className={`border rounded-xl p-4 shadow-sm ${stat.color} flex flex-col justify-between h-20`}>
                      <span className="text-[10px] font-black uppercase tracking-wider">{stat.label}</span>
                      <span className="text-2xl font-black leading-none">{stat.count}</span>
                    </div>
                  ))}
                </div>

                {/* Overall status progress */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Completion Meter</span>
                  <p className="text-5xl font-black text-slate-900 dark:text-white">{taskCompletion.completionRate}%</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Of the {taskCompletion.totalTasks} total tasks assigned in the system, {taskCompletion.statusCounts.COMPLETED} have been successfully verified and completed.
                  </p>
                  <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-6">
                    <div className="bg-primary h-full" style={{ width: `${taskCompletion.completionRate}%` }} />
                  </div>
                </div>

              </div>
            )}

            {/* FILE USAGE TAB */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                
                {/* File size distribution progress */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">File Type Capacity Distribution</h4>
                  
                  <div className="space-y-4">
                    {fileUsage.fileTypeDistribution.map((group: any) => {
                      const countPct = fileUsage.totalFiles > 0 ? ((group.count / fileUsage.totalFiles) * 100).toFixed(0) : '0';
                      return (
                        <div key={group.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                            <span>{group.category} ({group.count} files)</span>
                            <span>{formatBytes(group.totalSize)} ({countPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden flex">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${countPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
