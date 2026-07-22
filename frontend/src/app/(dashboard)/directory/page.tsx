'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Phone, 
  Mail, 
  MessageSquare,
  Sparkles,
  Users,
  Compass,
  X,
  Grid,
  List,
  GitFork,
  Globe,
  Clock
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';

export default function DirectoryPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Fetch employees
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
    router.push(`/chat?contactId=${colleague.id}&name=${encodeURIComponent(colleague.firstName + ' ' + colleague.lastName)}&avatarUrl=${encodeURIComponent(colleague.avatarUrl || '')}&status=${colleague.status}`);
  };

  // Status text formatter
  const formatStatus = (s: string) => {
    if (s === 'IN_MEETING') return 'In Meeting';
    if (s === 'ON_LEAVE') return 'On Leave';
    return s.toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Colleague Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Explore skills, locate office departments, check timezone availability, and connect with teammates.</p>
      </div>

      {/* Directory Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        {[
          { label: 'Total Teammates', value: data?.users?.length || 0, icon: '👥' },
          { label: 'Online Now', value: data?.users?.filter((u: any) => u.status === 'ONLINE').length || 0, icon: '🟢' },
          { label: 'Active Depts', value: Array.from(new Set(data?.users?.map((u: any) => u.department?.name).filter(Boolean))).length || 0, icon: '🏢' },
          { label: 'Office Locations', value: Array.from(new Set(data?.users?.map((u: any) => u.officeLocation || u.location).filter(Boolean))).length || 0, icon: '📍' }
        ].map((card, idx) => (
          <div key={idx} className="p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
              <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
            </div>
            <span className="text-xl leading-none">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 font-semibold text-xs text-muted-foreground items-end">
        <div className="space-y-1 text-left">
          <label className="uppercase text-[9px] tracking-wider">Search Name, Role, or Skill</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Alice, React, Designer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>
        </div>

        <div className="space-y-1 text-left">
          <label className="uppercase text-[9px] tracking-wider">Office / City Location</label>
          <input
            type="text"
            placeholder="e.g. New York, HQ..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        <div className="space-y-1 text-left">
          <label className="uppercase text-[9px] tracking-wider">Availability Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="AWAY">Away</option>
            <option value="BUSY">Busy</option>
            <option value="DND">Do Not Disturb</option>
            <option value="IN_MEETING">In Meeting</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>

        <div className="space-y-1 text-left">
          <label className="uppercase text-[9px] tracking-wider">View Mode</label>
          <div className="flex border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 text-xs font-bold shadow-xs h-[38px] items-center p-1 space-x-1 border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Results */}
      {isLoading ? (
        <div className="text-center text-xs text-slate-400 py-20">Loading directory...</div>
      ) : data?.users?.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-20 border rounded-2xl bg-white dark:bg-slate-900">
          No teammates match your filter inputs.
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {data?.users?.map((colleague: any) => (
            <div
              key={colleague.id}
              onClick={() => setSelectedUser(colleague)}
              className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden"
            >
              <div className="space-y-3.5">
                {/* Header profile */}
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-11 w-11 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-extrabold uppercase text-slate-500 overflow-hidden shrink-0">
                      {colleague.avatarUrl ? (
                        <img src={colleague.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        `${colleague.firstName[0]}${colleague.lastName[0]}`
                      )}
                    </div>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      colleague.status === 'ONLINE' ? 'bg-green-500' :
                      colleague.status === 'AWAY' ? 'bg-amber-500' :
                      colleague.status === 'BUSY' ? 'bg-red-500' :
                      colleague.status === 'DND' ? 'bg-rose-600' :
                      colleague.status === 'IN_MEETING' ? 'bg-indigo-500' :
                      colleague.status === 'ON_LEAVE' ? 'bg-sky-500' :
                      'bg-slate-400'
                    }`} />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="font-extrabold text-xs leading-none truncate group-hover:text-primary transition-all">
                      {colleague.firstName} {colleague.lastName}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate font-semibold leading-none">
                      {colleague.designation || 'Teammate'}
                    </p>
                  </div>
                </div>

                {/* Location / Department */}
                <div className="space-y-1.5 text-[10px] text-slate-505 dark:text-slate-400 font-semibold leading-none text-left">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-405" />
                    <span>{colleague.officeLocation || colleague.location || 'Remote'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-slate-405" />
                    <span>{colleague.department?.name || 'General Org'}</span>
                  </div>
                  {colleague.timezone && (
                    <div className="flex items-center space-x-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-405" />
                      <span>Timezone: {colleague.timezone}</span>
                    </div>
                  )}
                </div>

                {/* Skill tags */}
                {colleague.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {colleague.skills.slice(0, 3).map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border rounded-full text-[9px] font-bold text-slate-500">
                        {s}
                      </span>
                    ))}
                    {colleague.skills.length > 3 && (
                      <span className="text-[9px] text-slate-400 font-extrabold self-center">
                        +{colleague.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Chat action button */}
              {colleague.id !== currentUser?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartChat(colleague);
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold rounded-xl transition-all"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Start Conversation</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-x-auto shadow-sm text-left">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-800/40 text-slate-450 uppercase font-extrabold text-[9px] tracking-wider">
                <th className="p-4">Teammate</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Department</th>
                <th className="p-4">Office Location</th>
                <th className="p-4">Time Zone</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((colleague: any) => (
                <tr
                  key={colleague.id}
                  onClick={() => setSelectedUser(colleague)}
                  className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                >
                  <td className="p-4 flex items-center space-x-3">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold uppercase text-slate-500 overflow-hidden shrink-0 border">
                      {colleague.avatarUrl ? (
                        <img src={colleague.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        `${colleague.firstName[0]}${colleague.lastName[0]}`
                      )}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {colleague.firstName} {colleague.lastName}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-650 dark:text-slate-350">{colleague.designation || 'Teammate'}</td>
                  <td className="p-4 text-slate-550 font-medium">{colleague.department?.name || 'General Org'}</td>
                  <td className="p-4 text-slate-550 font-medium">{colleague.officeLocation || colleague.location || 'Remote'}</td>
                  <td className="p-4 text-slate-555 font-medium">{colleague.timezone || 'UTC'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                      colleague.status === 'ONLINE' 
                        ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-950/20 dark:border-green-900/30' 
                        : colleague.status === 'AWAY'
                        ? 'bg-amber-550/10 border-amber-205 text-amber-600 dark:bg-amber-950/20'
                        : colleague.status === 'BUSY' || colleague.status === 'DND'
                        ? 'bg-rose-50 border-rose-205 text-rose-600 dark:bg-rose-950/20'
                        : colleague.status === 'IN_MEETING'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-650'
                        : colleague.status === 'ON_LEAVE'
                        ? 'bg-sky-50 border-sky-200 text-sky-650'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        colleague.status === 'ONLINE' ? 'bg-green-550' :
                        colleague.status === 'AWAY' ? 'bg-amber-550' :
                        colleague.status === 'BUSY' ? 'bg-red-500' :
                        colleague.status === 'DND' ? 'bg-rose-600' :
                        colleague.status === 'IN_MEETING' ? 'bg-indigo-500' :
                        colleague.status === 'ON_LEAVE' ? 'bg-sky-500' :
                        'bg-slate-450'
                      }`} />
                      <span>{formatStatus(colleague.status)}</span>
                    </span>
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-2">
                      {colleague.id !== currentUser?.id && (
                        <button
                          onClick={() => handleStartChat(colleague)}
                          className="px-3 py-1.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold rounded-lg transition-all"
                        >
                          Send message
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUser(colleague)}
                        className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-505 hover:text-foreground font-semibold"
                      >
                        View Profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Colleague details dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedUser(null)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>

            {/* Profile Avatar Card */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-extrabold uppercase text-slate-500 overflow-hidden border-2">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`
                  )}
                </div>
                <span className={`absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  selectedUser.status === 'ONLINE' ? 'bg-green-500' :
                  selectedUser.status === 'AWAY' ? 'bg-amber-500' :
                  selectedUser.status === 'BUSY' ? 'bg-red-500' :
                  selectedUser.status === 'DND' ? 'bg-rose-600' :
                  selectedUser.status === 'IN_MEETING' ? 'bg-indigo-500' :
                  selectedUser.status === 'ON_LEAVE' ? 'bg-sky-500' :
                  'bg-slate-400'
                }`} />
              </div>

              <div>
                <h3 className="font-extrabold text-base">{selectedUser.firstName} {selectedUser.lastName}</h3>
                <p className="text-xs text-primary font-bold uppercase tracking-wider mt-0.5">{selectedUser.designation}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{selectedUser.location || 'Remote'} • {selectedUser.department?.name || 'General Org'}</p>
              </div>
            </div>

            {/* Availability Detail */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs font-semibold text-slate-650 dark:text-slate-350 text-left">
              <div>
                <h4 className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider mb-1 flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Office Location</span>
                </h4>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.officeLocation || selectedUser.location || 'Main Office'}</p>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider mb-1 flex items-center space-x-1">
                  <Globe className="h-3 w-3" />
                  <span>Time Zone</span>
                </h4>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.timezone || 'UTC'}</p>
              </div>
              {selectedUser.workingHours && (
                <div className="col-span-2">
                  <h4 className="font-extrabold text-slate-400 uppercase text-[8px] tracking-wider mb-1 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Working Hours</span>
                  </h4>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.workingHours}</p>
                </div>
              )}
            </div>

            {/* Reporting Manager Tree */}
            <div className="space-y-2 border-t pt-4 text-left">
              <h4 className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider flex items-center space-x-1.5">
                <GitFork className="h-3.5 w-3.5 transform rotate-180 text-slate-400" />
                <span>Reporting Manager Tree</span>
              </h4>
              <div className="pl-3 py-1 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                {(() => {
                  const chain = getReportingChain(selectedUser);
                  if (chain.length === 0) {
                    return (
                      <div className="text-[10px] text-slate-400 italic">Reports to no one (Top of hierarchy)</div>
                    );
                  }
                  return (
                    <>
                      {/* Render chain from CEO down to manager */}
                      {[...chain].reverse().map((mgr: any) => (
                        <div key={mgr.id} className="flex items-center space-x-2 text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-350 dark:bg-slate-650 shrink-0" />
                          <span className="font-bold text-[10px]">{mgr.firstName} {mgr.lastName}</span>
                          <span className="text-[8px] text-slate-400">({mgr.designation || 'Staff'})</span>
                        </div>
                      ))}
                      {/* Selected user node */}
                      <div className="flex items-center space-x-2 text-primary font-bold">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span>{selectedUser.firstName} {selectedUser.lastName}</span>
                        <span className="text-[8px] uppercase tracking-wider text-primary/80">(Selected)</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bio */}
            {selectedUser.bio && (
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider flex items-center space-x-1">
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  <span>Biography</span>
                </h4>
                <p className="p-3 bg-slate-50/50 dark:bg-slate-850/45 border rounded-xl text-slate-600 dark:text-slate-350 leading-relaxed">
                  {selectedUser.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {selectedUser.skills?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                  <span>Technical Competencies</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUser.skills.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border rounded-xl text-[10px] font-bold text-slate-500">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact details */}
            <div className="space-y-2 border-t pt-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <div className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${selectedUser.email}`} className="hover:underline">{selectedUser.email}</a>
              </div>
              {selectedUser.phone && (
                <div className="flex items-center space-x-2.5">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{selectedUser.phone}</span>
                </div>
              )}
            </div>

            {/* DM link */}
            {selectedUser.id !== currentUser?.id && (
              <button
                onClick={() => {
                  setSelectedUser(null);
                  handleStartChat(selectedUser);
                }}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>DM {selectedUser.firstName}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
