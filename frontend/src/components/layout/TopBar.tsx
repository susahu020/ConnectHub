'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Search, XCircle, Sun, Moon, Bell } from 'lucide-react';

export interface SearchResultItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export interface SearchCategory {
  label: string;
  items: SearchResultItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function TopBar({
  pageTitle,
  onOpenMobileSidebar,
  searchRef,
  searchQuery,
  onSearchQueryChange,
  searchFocused,
  onSearchFocus,
  onSearchClose,
  searchCategories,
  hasSearchResults,
  theme,
  onToggleTheme,
  notifications,
  notifOpen,
  onToggleNotif,
  onCloseNotif,
  showUnreadOnly,
  onToggleUnreadOnly,
  onMarkNotifRead,
  onMarkAllNotifRead,
}: {
  pageTitle: string;
  onOpenMobileSidebar: () => void;
  searchRef: React.RefObject<HTMLDivElement>;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  searchFocused: boolean;
  onSearchFocus: () => void;
  onSearchClose: () => void;
  searchCategories: SearchCategory[];
  hasSearchResults: boolean;
  theme: string;
  onToggleTheme: () => void;
  notifications: NotificationItem[];
  notifOpen: boolean;
  onToggleNotif: () => void;
  onCloseNotif: () => void;
  showUnreadOnly: boolean;
  onToggleUnreadOnly: (v: boolean) => void;
  onMarkNotifRead: (id: string) => void;
  onMarkAllNotifRead: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifs = showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-border flex items-center justify-between gap-4 px-4 sm:px-6 z-30 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
          className="p-2 hover:bg-muted rounded-lg md:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="hidden md:block text-[15px] font-semibold text-foreground truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
        {/* Global search */}
        <div ref={searchRef} className="relative w-full max-w-xs">
          <div className="flex items-center gap-2 bg-muted/60 focus-within:bg-white dark:focus-within:bg-slate-950 px-3 py-1.5 rounded-lg border border-transparent focus-within:border-border text-[13px] font-medium text-muted-foreground transition-colors w-full">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="text"
              placeholder="Search ConnectHub..."
              aria-label="Global platform search"
              value={searchQuery}
              onFocus={onSearchFocus}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="bg-transparent border-none focus:outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                aria-label="Clear search"
                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full shrink-0"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchFocused && searchQuery.trim() !== '' && (
            <div className="absolute top-11 right-0 sm:left-0 w-[22rem] max-w-[90vw] bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border border-border rounded-xl shadow-2xl z-[999] p-3 space-y-4 max-h-[420px] overflow-y-auto animate-slide-up text-left">
              {searchCategories.map(
                (category) =>
                  category.items.length > 0 && (
                    <div key={category.label} className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider px-1">
                        {category.label}
                      </div>
                      <div className="space-y-0.5">
                        {category.items.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={onSearchClose}
                            className="flex items-center gap-2.5 p-1.5 hover:bg-muted rounded-lg transition-colors"
                          >
                            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
              )}

              {!hasSearchResults && (
                <div className="text-center py-6 space-y-2">
                  <Search className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-[13px] font-medium text-muted-foreground">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
        >
          {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        {/* Notifications */}
        <div className="relative shrink-0">
          <button
            onClick={onToggleNotif}
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            className="p-2 hover:bg-muted rounded-lg relative transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div onClick={onCloseNotif} className="fixed inset-0 z-40" aria-hidden="true" />
              <div
                role="menu"
                className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-900 border border-border rounded-xl shadow-2xl z-50 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h4 className="font-semibold text-[13px]">Notifications</h4>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showUnreadOnly}
                        onChange={(e) => onToggleUnreadOnly(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Unread only
                      </span>
                    </label>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotifRead}
                        className="text-[10px] text-primary font-semibold hover:underline uppercase tracking-wider"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {visibleNotifs.length === 0 ? (
                    <div className="text-center text-[13px] text-muted-foreground py-8">
                      No {showUnreadOnly ? 'unread' : ''} notifications yet.
                    </div>
                  ) : (
                    visibleNotifs.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => onMarkNotifRead(notif.id)}
                        className={`w-full p-2.5 rounded-lg border text-[13px] text-left transition-colors flex items-start gap-2.5 ${
                          !notif.isRead
                            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className="font-semibold leading-tight truncate">{notif.title}</p>
                          <p className="text-muted-foreground leading-snug text-[12px]">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
