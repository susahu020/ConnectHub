import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-96 bg-muted animate-pulse rounded-2xl border border-border col-span-2" />
        <div className="h-96 bg-muted animate-pulse rounded-2xl border border-border" />
      </div>
    </div>
  );
}
