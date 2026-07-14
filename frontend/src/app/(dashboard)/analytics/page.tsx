'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { 
  TrendingUp, 
  Activity, 
  Users, 
  Trello, 
  CheckCircle2, 
  BarChart4,
  Cpu,
  Database,
  Server,
  Lock,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuthStore();

  const { data: deptStats, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin-dept-stats'],
    queryFn: () => api.getDepartmentStats(),
  });

  const { data: sysMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin-sys-metrics'],
    queryFn: () => api.getSystemMetrics(),
    enabled: user?.role === 'ADMIN',
  });

  // Mocked time series data for Daily Messaging Volume (Slack style heatmap metric)
  const messageVolumeData = [
    { name: 'Mon', Messages: 120, Tasks: 5 },
    { name: 'Tue', Messages: 180, Tasks: 8 },
    { name: 'Wed', Messages: 240, Tasks: 12 },
    { name: 'Thu', Messages: 210, Tasks: 15 },
    { name: 'Fri', Messages: 300, Tasks: 9 },
    { name: 'Sat', Messages: 80, Tasks: 2 },
    { name: 'Sun', Messages: 95, Tasks: 3 },
  ];

  // Pie chart task distributions
  const taskDistribution = [
    { name: 'To Do', value: 12, color: '#94a3b8' },
    { name: 'In Progress', value: 18, color: '#3b82f6' },
    { name: 'Under Review', value: 8, color: '#f59e0b' },
    { name: 'Completed', value: 25, color: '#22c55e' },
  ];

  if (loadingDepts || (user?.role === 'ADMIN' && loadingMetrics)) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl border" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Collaboration Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track messaging velocities, department task completion rates, and platform engagement indices.</p>
      </div>

      {/* Analytics Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        {user?.role === 'ADMIN' ? [
          { label: 'Total Platform Users', value: sysMetrics?.database?.totalUsers || 0, icon: <Users className="h-5 w-5 text-blue-500" />, color: 'border-blue-100 dark:border-blue-900/30' },
          { label: 'Total Allocated Tasks', value: sysMetrics?.database?.totalTasks || 0, icon: <Trello className="h-5 w-5 text-emerald-500" />, color: 'border-emerald-100 dark:border-emerald-900/30' },
          { label: 'Security Audit Logs', value: sysMetrics?.queue?.totalAuditLogs || 0, icon: <ShieldCheck className="h-5 w-5 text-purple-500" />, color: 'border-purple-100 dark:border-purple-900/30' },
          { label: 'Active Cache Keys', value: sysMetrics?.redis?.keysCount || 0, icon: <Activity className="h-5 w-5 text-amber-500" />, color: 'border-amber-100 dark:border-amber-900/30' }
        ].map((card, idx) => (
          <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900 ${card.color}`}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
              <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
            </div>
            <span className="leading-none">{card.icon}</span>
          </div>
        )) : [
          { label: 'Active Departments', value: deptStats?.length || 0, icon: <Briefcase className="h-5 w-5 text-blue-500" />, color: 'border-blue-100 dark:border-blue-900/30' },
          { label: 'Department Members', value: deptStats?.reduce((acc: number, d: any) => acc + d.totalEmployees, 0) || 0, icon: <Users className="h-5 w-5 text-emerald-500" />, color: 'border-emerald-100 dark:border-emerald-900/30' },
          { label: 'Total Department Tasks', value: deptStats?.reduce((acc: number, d: any) => acc + (d.completedTasks + d.openTasks), 0) || 0, icon: <Trello className="h-5 w-5 text-purple-500" />, color: 'border-purple-100 dark:border-purple-900/30' },
          { label: 'Task Completion Rate', value: `${((deptStats?.reduce((acc: number, d: any) => acc + d.completedTasks, 0) || 0) / (deptStats?.reduce((acc: number, d: any) => acc + (d.completedTasks + d.openTasks), 0) || 1) * 100).toFixed(0)}%`, icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />, color: 'border-amber-100 dark:border-amber-900/30' }
        ].map((card, idx) => (
          <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900 ${card.color}`}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
              <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
            </div>
            <span className="leading-none">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Messages Volume Area Chart */}
        <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <div className="border-b pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm">Weekly Activity Trends</h3>
            </div>
            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 font-bold px-2 py-0.5 rounded-full">+12% vs last week</span>
          </div>
          <div className="h-72 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={messageVolumeData}>
                <defs>
                  <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="Messages" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMsgs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="border-b pb-3 flex items-center space-x-2">
            <Trello className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-sm">Task Allocations</h3>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 leading-none">
            {taskDistribution.map((t) => (
              <div key={t.name} className="flex items-center space-x-1.5 p-1">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span>{t.name} ({t.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Velocities Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-3">
          <div className="border-b pb-3 flex items-center space-x-2">
            <BarChart4 className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-sm">Department Performance Index</h3>
          </div>
          <div className="h-80 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedTasks" name="Completed Tasks" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="openTasks" name="Open Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalEmployees" name="Total Members" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System & Server Monitor (Only visible to ADMINs) */}
      {user?.role === 'ADMIN' && sysMetrics && (
        <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-5 text-left animate-fade-in">
          <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-purple-500" />
              <h3 className="font-bold text-sm">System & Server Infrastructure Status</h3>
            </div>
            <span className="text-[9px] text-green-500 bg-green-500/10 font-black px-2 py-0.5 rounded border border-green-200 dark:border-green-900 uppercase tracking-wider flex items-center space-x-1 w-max">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-slow" />
              <span>Real-time Monitor Online</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU & RAM Usage */}
            <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="h-4 w-4 text-slate-400" />
                <span>CPU & Memory Indices</span>
              </h4>
              <div className="space-y-3 text-xs font-semibold text-slate-600 dark:text-slate-350">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>CPU Core Usage</span>
                    <span>{sysMetrics.system?.cpuUsage || '0.00'}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${Math.min(parseFloat(sysMetrics.system?.cpuUsage || '0') * 10, 100)}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Process RSS Memory</span>
                    <span>{sysMetrics.system?.processMemory || '0'} MB</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min((parseFloat(sysMetrics.system?.processMemory || '0') / 1024) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Postgres Connection Pool */}
            <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Database className="h-4 w-4 text-slate-400" />
                <span>Prisma SQL Connection Pool</span>
              </h4>
              <div className="space-y-3 text-xs font-semibold text-slate-600 dark:text-slate-350">
                <div className="flex items-center justify-between">
                  <span>Pool Status</span>
                  <span className="text-[10px] bg-green-50 text-green-600 dark:bg-green-950/20 px-2 py-0.5 rounded font-black border border-green-200 dark:border-green-900">HEALTHY</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Active SQL Pools</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{sysMetrics.database?.activeConnections || 1} connection(s)</span>
                </div>
              </div>
            </div>

            {/* Redis Cache Status */}
            <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Activity className="h-4 w-4 text-slate-400" />
                <span>Redis Key-Value Cache</span>
              </h4>
              <div className="space-y-3 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="flex items-center justify-between">
                  <span>Cache Service Status</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black border uppercase ${
                    sysMetrics.redis?.status === 'Healthy' 
                      ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                      : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}>{sysMetrics.redis?.status || 'Offline'}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Total Cached Key entries</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{sysMetrics.redis?.keysCount || 0} keys cached</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
