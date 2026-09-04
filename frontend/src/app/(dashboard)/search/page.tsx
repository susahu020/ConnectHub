'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search, ArrowLeft, Loader2, Hash, Users, Trello, Megaphone,
  MessageSquare, FileText, BookOpen, Building2,
} from 'lucide-react';
import { api } from '../../../services/api';
import { HighlightMatch } from '../../../components/search/HighlightMatch';

const CATEGORY_LABELS: Record<string, string> = {
  users: 'Teammates',
  groups: 'Channels',
  teams: 'Teams',
  tasks: 'Tasks',
  announcements: 'Announcements',
  messages: 'Chat Messages',
  files: 'Files & Documents',
  wikiPages: 'Knowledge Base',
  departments: 'Departments',
};

// Renders one result item into {href, title, subtitle, icon} — mirrors
// the same mapping (dashboard)/layout.tsx uses to build the TopBar
// dropdown's preview, kept in sync manually since the two live in
// different files with different data shapes (preview gets all 9
// categories at once; this page gets one category's raw Prisma records).
function renderItem(category: string, item: any): { href: string; title: string; subtitle: string; icon: React.ReactNode } {
  switch (category) {
    case 'users':
      return {
        href: `/chat?contactId=${item.id}&name=${encodeURIComponent(item.firstName + ' ' + item.lastName)}`,
        title: `${item.firstName} ${item.lastName}`,
        subtitle: item.designation || 'Teammate',
        icon: <Users className="text-primary" />,
      };
    case 'groups':
      return { href: '/groups', title: `#${item.name}`, subtitle: item.description || 'Channel', icon: <Hash className="text-primary" /> };
    case 'teams':
      return { href: '/directory', title: item.name, subtitle: item.description || 'Organization Team', icon: <Users className="text-primary" /> };
    case 'tasks':
      return {
        href: '/tasks',
        title: item.title,
        subtitle: `${(item.status || '').replace('_', ' ')} • ${item.priority || ''}`,
        icon: <Trello className="text-emerald-500" />,
      };
    case 'announcements':
      return { href: '/announcements', title: item.title, subtitle: new Date(item.createdAt).toLocaleDateString(), icon: <Megaphone className="text-primary" /> };
    case 'messages':
      return {
        href: '/chat',
        title: `${item.sender?.firstName || ''} ${item.sender?.lastName || ''}`.trim() || 'Message',
        subtitle: item.content,
        icon: <MessageSquare className="text-info" />,
      };
    case 'files':
      return {
        href: '/files',
        title: item.name,
        subtitle: `${((item.size || 0) / 1024).toFixed(1)} KB • ${item.fileType?.toUpperCase() || ''}`,
        icon: <FileText className="text-amber-500" />,
      };
    case 'wikiPages':
      return {
        href: `/wiki?id=${item.id}`,
        title: item.title,
        subtitle: `${item.category} • ${new Date(item.updatedAt).toLocaleDateString()}`,
        icon: <BookOpen className="text-primary" />,
      };
    case 'departments':
      return { href: '/organization/departments', title: item.name, subtitle: item.description || 'Department', icon: <Building2 className="text-primary" /> };
    default:
      return { href: '#', title: item.name || item.title || 'Result', subtitle: '', icon: <Search className="text-muted-foreground" /> };
  }
}

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'users';
  const [page, setPage] = useState(1);
  // Accumulates results across pages — each query only returns one page's
  // worth, but "Load more" should grow the list, not replace it.
  const [accumulated, setAccumulated] = useState<any[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search-category', q, category, page],
    queryFn: () => api.searchCategory(q, category, page),
    enabled: q.trim().length > 0,
  });

  // A fresh search (query or category changed) resets back to page 1 and
  // clears whatever was accumulated for the previous search.
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [q, category]);

  // Append each page's results as they arrive, rather than replacing —
  // "Load more" should grow the list, not swap it out.
  useEffect(() => {
    if (!data?.results) return;
    setAccumulated((prev) => (page === 1 ? data.results : [...prev, ...data.results]));
  }, [data, page]);

  const results = accumulated;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">
            {CATEGORY_LABELS[category] || category} results for &ldquo;{q}&rdquo;
          </h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground mt-1">{total} {total === 1 ? 'result' : 'results'} found</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">No {(CATEGORY_LABELS[category] || category).toLowerCase()} matched &ldquo;{q}&rdquo;.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {results.map((item: any) => {
            const rendered = renderItem(category, item);
            return (
              <Link
                key={item.id}
                href={rendered.href}
                className="flex items-center gap-3 p-3 bg-card dark:bg-card border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-muted dark:bg-card flex items-center justify-center shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                  {rendered.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    <HighlightMatch text={rendered.title} query={q} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    <HighlightMatch text={rendered.subtitle} query={q} />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="px-5 py-2.5 border rounded-xl text-xs font-bold hover:bg-muted dark:hover:bg-card transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
