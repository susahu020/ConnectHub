'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { DirectoryMetricsBar } from '../../../components/directory/DirectoryMetricsBar';
import { DirectoryFilters } from '../../../components/directory/DirectoryFilters';
import { DirectoryGrid } from '../../../components/directory/DirectoryGrid';
import { DirectoryTable } from '../../../components/directory/DirectoryTable';
import { ColleagueDetailModal } from '../../../components/directory/ColleagueDetailModal';

export default function DirectoryPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const { data, isLoading } = useQuery({
    queryKey: ['directory', search, location, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);
      if (status) params.append('status', status);
      return api.getDirectory(params.toString());
    },
  });

  // Fetch all org chart nodes for tracing Reporting Manager Trees
  const { data: orgChart } = useQuery({
    queryKey: ['org-chart-data'],
    queryFn: () => api.getOrgChart(),
    enabled: !!currentUser,
  });

  // Trace manager line from selected user up to top CEO
  const getReportingChain = (u: any) => {
    if (!orgChart || !orgChart.users) return [];
    const chain = [];
    let current = u;

    // Safety check to prevent circular references
    const visited = new Set<string>();

    while (current && current.managerId && !visited.has(current.id)) {
      visited.add(current.id);
      const managerObj = orgChart.users.find((x: any) => x.id === current.managerId);
      if (managerObj) {
        chain.push(managerObj);
        current = managerObj;
      } else {
        break;
      }
    }
    return chain;
  };

  const handleStartChat = (colleague: any) => {
    router.push(
      `/chat?contactId=${colleague.id}&name=${encodeURIComponent(colleague.firstName + ' ' + colleague.lastName)}&avatarUrl=${encodeURIComponent(
        colleague.avatarUrl || ''
      )}&status=${colleague.status}`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Colleague Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore skills, locate office departments, check timezone availability, and connect with teammates.
        </p>
      </div>

      <DirectoryMetricsBar users={data?.users} />

      <DirectoryFilters
        search={search}
        onSearchChange={setSearch}
        location={location}
        onLocationChange={setLocation}
        status={status}
        onStatusChange={setStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading ? (
        <div className="text-center text-xs text-slate-400 py-20">Loading directory...</div>
      ) : data?.users?.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-20 border rounded-2xl bg-white dark:bg-slate-900">
          No teammates match your filter inputs.
        </div>
      ) : viewMode === 'GRID' ? (
        <DirectoryGrid users={data?.users || []} currentUserId={currentUser?.id} onSelectUser={setSelectedUser} onStartChat={handleStartChat} />
      ) : (
        <DirectoryTable users={data?.users || []} currentUserId={currentUser?.id} onSelectUser={setSelectedUser} onStartChat={handleStartChat} />
      )}

      {selectedUser && (
        <ColleagueDetailModal
          user={selectedUser}
          currentUserId={currentUser?.id}
          reportingChain={getReportingChain(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onStartChat={(u) => {
            setSelectedUser(null);
            handleStartChat(u);
          }}
        />
      )}
    </div>
  );
}
