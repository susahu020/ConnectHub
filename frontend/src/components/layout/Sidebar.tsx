'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, LogOut, X } from 'lucide-react';
import type { OrganizationSettings } from '../../hooks/useOrganizationSettings';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

const STATUS_OPTIONS = [
  { key: 'ONLINE', label: 'Online', color: 'bg-emerald-500' },
  { key: 'AWAY', label: 'Away', color: 'bg-amber-500' },
  { key: 'BUSY', label: 'Busy', color: 'bg-red-500' },
  { key: 'DND', label: 'Do Not Disturb', color: 'bg-rose-600' },
  { key: 'IN_MEETING', label: 'In Meeting', color: 'bg-indigo-500' },
  { key: 'ON_LEAVE', label: 'On Leave', color: 'bg-sky-500' },
  { key: 'INVISIBLE', label: 'Invisible', color: 'bg-slate-400' },
] as const;

const STATUS_DOT_CLASS: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  AWAY: 'bg-amber-500',
  BUSY: 'bg-red-500',
  DND: 'bg-rose-600',
  IN_MEETING: 'bg-indigo-500',
  ON_LEAVE: 'bg-sky-500',
  INVISIBLE: 'bg-slate-400',
};

export function Sidebar({
  orgSettings,
  user,
  pathname,
  navGroups,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
  statusMenuOpen,
  onToggleStatusMenu,
  statusRef,
  onSetStatus,
  onLogout,
}: {
  orgSettings: OrganizationSettings;
  user: AuthUser;
  pathname: string;
  navGroups: NavGroup[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  statusMenuOpen: boolean;
  onToggleStatusMenu: () => void;
  statusRef: React.RefObject<HTMLDivElement>;
  onSetStatus: (status: string) => void;
  onLogout: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 h-full flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-border transition-[width,transform] duration-200 ease-out md:relative md:translate-x-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div
          className={`h-16 border-b border-border flex items-center shrink-0 ${
            collapsed ? 'px-3 justify-center' : 'px-5 justify-between'
          }`}
        >
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 font-bold text-[15px] tracking-tight shrink-0 min-w-0"
          >
            <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {orgSettings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={orgSettings.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-primary font-black text-sm">
                  {orgSettings.orgName.charAt(0)}
                </span>
              )}
            </span>
            {!collapsed && <span className="truncate">{orgSettings.orgName}</span>}
          </Link>
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="p-1.5 hover:bg-muted rounded-lg md:hidden shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2.5' : 'px-3'}`}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((link) => {
                  const active =
                    pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={onCloseMobile}
                      title={collapsed ? link.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                        collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
                      } ${
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
                      )}
                      <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">
                        {link.icon}
                      </span>
                      {!collapsed && <span className="truncate">{link.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex items-center justify-center mx-3 mb-2 h-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <span className="flex items-center gap-1 text-xs font-medium">
              <ChevronLeft className="h-4 w-4" /> Collapse
            </span>
          )}
        </button>

        {/* User / status / logout */}
        <div className={`border-t border-border ${collapsed ? 'p-2.5' : 'p-3'} space-y-2`}>
          <div
            ref={statusRef}
            className={`relative flex items-center rounded-lg hover:bg-muted transition-colors ${
              collapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-1.5'
            }`}
          >
            <button
              type="button"
              aria-label="Change status"
              aria-haspopup="menu"
              aria-expanded={statusMenuOpen}
              className="relative focus-visible:outline-none shrink-0 rounded-full"
              onClick={onToggleStatusMenu}
            >
              <div className="h-9 w-9 bg-muted rounded-full flex items-center justify-center text-xs font-semibold uppercase text-muted-foreground overflow-hidden ring-1 ring-border">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  `${user.firstName[0]}${user.lastName[0]}`
                )}
              </div>
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  STATUS_DOT_CLASS[user.status] ?? 'bg-slate-400'
                }`}
              />
            </button>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <Link href="/profile" onClick={onCloseMobile} className="block">
                  <p className="text-[13px] font-semibold truncate leading-tight hover:underline">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()} ·{' '}
                    {user.status === 'IN_MEETING'
                      ? 'in meeting'
                      : user.status === 'ON_LEAVE'
                      ? 'on leave'
                      : user.status.toLowerCase()}
                  </p>
                </Link>
              </div>
            )}

            {statusMenuOpen && (
              <div
                role="menu"
                className={`absolute bottom-12 bg-white dark:bg-slate-900 border border-border p-1.5 rounded-xl shadow-xl w-48 z-50 space-y-0.5 animate-slide-up ${
                  collapsed ? 'left-14' : 'left-1'
                }`}
              >
                <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider px-2 py-1">
                  Set status
                </p>
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st.key}
                    role="menuitem"
                    onClick={() => onSetStatus(st.key)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors hover:bg-muted ${
                      user.status === st.key ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${st.color}`} />
                    <span className="truncate">{st.label}</span>
                    {user.status === st.key && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex items-center justify-center border border-red-200 dark:border-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[13px] font-semibold transition-colors ${
              collapsed ? 'p-2.5 w-full' : 'gap-2 py-2 px-3 w-full'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
