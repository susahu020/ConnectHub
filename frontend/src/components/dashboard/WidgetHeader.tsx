import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function WidgetHeader({
  icon,
  iconClassName = 'text-primary',
  title,
  action,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0 mb-4">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] ${iconClassName}`}>{icon}</span>
        <h3 className="font-semibold text-[15px] text-foreground">{title}</h3>
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5 shrink-0"
        >
          <span>{action.label}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export function WidgetEmptyState({ label }: { label: string }) {
  return <div className="text-center text-xs text-muted-foreground py-8">{label}</div>;
}
