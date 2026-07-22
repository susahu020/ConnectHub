'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Briefcase,
  Layers,
  Activity,
  User,
  Coffee,
  GitFork,
  ArrowDown,
  X
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrgChart() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['org-chart-data'],
    queryFn: () => api.getOrgChart(),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <Activity className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Loading organization chart...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center">
        <GitFork className="h-8 w-8 text-rose-500 mb-3" />
        <p className="text-sm font-bold text-slate-800 dark:text-white">Failed to load company hierarchy</p>
        <p className="text-xs text-slate-500 mt-1">Please try again later.</p>
      </div>
    );
  }

  const { users = [], departments = [] } = data;

  // 1. Identify CEO/Root Node(s)
  // Look for users whose designation contains "CEO" or "Chief Executive" or reporting to no one with a top role.
  const isCeo = (u: any) => {
    const des = (u.designation || '').toUpperCase();
    return des.includes('CEO') || des.includes('CHIEF EXECUTIVE') || des.includes('FOUNDER') || (u.managerId === null && u.role === 'ADMIN');
  };

  const ceos = users.filter(isCeo);
  
  // If no official CEO, pick the users with managerId: null (or anyone reporting to no one)
  const rootUsers = ceos.length > 0 ? ceos : users.filter((u: any) => u.managerId === null);

  // 2. Identify Departments and their members
  const deptList = departments.map((dept: any) => {
    // Find manager
    const manager = users.find((u: any) => u.id === dept.managerId);
    
    // Find all users in this department (excluding manager and CEO if they are root)
    const members = users.filter((u: any) => 
      u.departmentId === dept.id && 
      u.id !== dept.managerId && 
      !rootUsers.some((ru: any) => ru.id === u.id)
    );

    return {
      ...dept,
      manager,
      members
    };
  });

  // Filter out departments that are empty (optional, but keep them for full structure)
  // Toggle all expand/collapse helper
  const toggleAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    departments.forEach((dept: any) => {
      updated[dept.id] = expand;
    });
    setExpandedDepts(updated);
  };

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to check if a user matches search term
  const userMatchesSearch = (u: any) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      (u.designation || '').toLowerCase().includes(term)
    );
  };

  // Status color mapper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'AWAY': return 'bg-amber-500';
      case 'BUSY':
      case 'DND': return 'bg-rose-500';
      default: return 'bg-slate-350 dark:bg-slate-650';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GitFork className="h-8 w-8 text-primary transform rotate-180" />
            Company Org Chart
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore the reporting lines, department heads, and active personnel hierarchy.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="px-3.5 py-2 text-xs font-black text-slate-700 bg-white border dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-all"
          >
            Expand All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-3.5 py-2 text-xs font-black text-slate-700 bg-white border dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 rounded-xl hover:bg-slate-50 transition-all"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-12 flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-450 shrink-0" />
        <input
          type="text"
          placeholder="Search team members by name or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="p-1 rounded text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* INTERACTIVE ORGANIZATIONAL TREE VIZ */}
      <div className="flex flex-col items-center space-y-12 pb-24 select-none">
        
        {/* LEVEL 1: CEO / EXECUTIVE OFFICE */}
        <div className="flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-6">
            {rootUsers.map((ceo: any) => {
              const highlighted = userMatchesSearch(ceo);
              return (
                <div 
                  key={ceo.id}
                  className={`bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-5 shadow-xl w-64 flex flex-col items-center text-center relative border-2 transition-all ${
                    highlighted ? 'border-amber-400 ring-4 ring-amber-400/35 scale-105' : 'border-transparent'
                  }`}
                >
                  <div className="relative h-16 w-16 rounded-full border-2 border-white overflow-hidden mb-3">
                    {ceo.avatarUrl ? (
                      <img src={ceo.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-slate-700 flex items-center justify-center font-bold text-lg">
                        {ceo.firstName[0]}{ceo.lastName[0]}
                      </div>
                    )}
                    {/* Live status badge */}
                    <span className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-primary-dark ${getStatusColor(ceo.status)}`} />
                  </div>

                  <h3 className="text-base font-black leading-tight">{ceo.firstName} {ceo.lastName}</h3>
                  <p className="text-[10px] uppercase font-black text-primary tracking-widest mt-1">
                    {ceo.designation || 'Chief Executive Officer'}
                  </p>
                  
                  {highlighted && (
                    <span className="absolute -top-3 bg-amber-400 text-slate-950 font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      Match
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Connector Down */}
          <div className="h-10 w-0.5 bg-slate-300 dark:bg-slate-800 relative">
            <ArrowDown className="absolute top-full -left-1.5 h-3.5 w-3.5 text-slate-300 dark:text-slate-800" />
          </div>
        </div>

        {/* LEVEL 2: DEPARTMENTS */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {deptList.map((dept: any) => {
            const isExpanded = expandedDepts[dept.id] !== false; // Default expanded
            const managerHighlight = dept.manager && userMatchesSearch(dept.manager);
            const matchingMembersCount = dept.members.filter(userMatchesSearch).length;

            return (
              <div 
                key={dept.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col space-y-4 h-fit"
              >
                {/* Department Header */}
                <div 
                  onClick={() => toggleDept(dept.id)}
                  className="flex items-center justify-between border-b pb-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight group-hover:text-primary transition-all">
                        {dept.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {dept.members.length + (dept.manager ? 1 : 0)} members
                        {matchingMembersCount > 0 && (
                          <span className="text-amber-500 ml-1.5">({matchingMembersCount} matches)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-650" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-650" />
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* LEVEL 3: DEPARTMENT MANAGER */}
                      {dept.manager ? (
                        <div className="flex flex-col items-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Department Manager</p>
                          <div 
                            className={`w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 relative transition-all ${
                              managerHighlight ? 'border-amber-400 ring-2 ring-amber-400/25' : ''
                            }`}
                          >
                            <div className="relative h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                              {dept.manager.avatarUrl ? (
                                <img src={dept.manager.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center font-bold text-xs uppercase text-slate-650">
                                  {dept.manager.firstName[0]}{dept.manager.lastName[0]}
                                </div>
                              )}
                              <span className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-slate-50 ${getStatusColor(dept.manager.status)}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                                {dept.manager.firstName} {dept.manager.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                                {dept.manager.designation || 'Manager'}
                              </p>
                            </div>
                            {managerHighlight && (
                              <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 font-black text-[7px] uppercase px-1.5 py-0.5 rounded shadow">
                                Match
                              </span>
                            )}
                          </div>

                          {dept.members.length > 0 && (
                            <div className="h-4 w-0.5 bg-slate-200 dark:bg-slate-800" />
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-slate-400 italic text-[10px]">No manager assigned.</div>
                      )}

                      {/* LEVEL 4: EMPLOYEES GRID */}
                      {dept.members.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Employees</p>
                          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin">
                            {dept.members.map((emp: any) => {
                              const empHighlight = userMatchesSearch(emp);
                              return (
                                <div 
                                  key={emp.id}
                                  className={`bg-slate-50/50 dark:bg-slate-850/40 border border-slate-100/50 dark:border-slate-850 rounded-xl p-2.5 flex items-center gap-2.5 relative transition-all ${
                                    empHighlight ? 'border-amber-400 ring-2 ring-amber-400/25 bg-amber-500/5' : ''
                                  }`}
                                >
                                  <div className="relative h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                    {emp.avatarUrl ? (
                                      <img src={emp.avatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center font-bold text-[10px] uppercase text-slate-650">
                                        {emp.firstName[0]}{emp.lastName[0]}
                                      </div>
                                    )}
                                    <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-slate-50 ${getStatusColor(emp.status)}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                      {emp.firstName} {emp.lastName}
                                    </p>
                                    <p className="text-[9px] text-slate-450 truncate mt-0.5">
                                      {emp.designation || 'Employee'}
                                    </p>
                                  </div>
                                  {empHighlight && (
                                    <span className="absolute top-1.5 right-1.5 bg-amber-400 text-slate-950 font-black text-[6px] uppercase px-1 rounded shadow">
                                      Match
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
