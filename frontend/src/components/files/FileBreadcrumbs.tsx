import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

export function FileBreadcrumbs({
  breadcrumbs,
  onNavigateRoot,
  onNavigateCrumb,
}: {
  breadcrumbs: any[] | undefined;
  onNavigateRoot: () => void;
  onNavigateCrumb: (id: string) => void;
}) {
  return (
    <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground bg-card dark:bg-card px-4 py-3 border rounded-xl shadow-xs">
      <button onClick={onNavigateRoot} className="flex items-center space-x-1 hover:text-primary transition-all">
        <Home className="h-4 w-4" />
        <span>Root Drive</span>
      </button>

      {breadcrumbs?.map((crumb: any) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <button onClick={() => onNavigateCrumb(crumb.id)} className="hover:text-primary transition-all max-w-[100px] truncate">
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
