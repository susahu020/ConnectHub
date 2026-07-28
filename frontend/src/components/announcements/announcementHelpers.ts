export function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
    case 'HIGH':
      return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
    case 'NORMAL':
      return 'text-primary bg-primary/5 border-primary/20';
    default:
      return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  }
}
