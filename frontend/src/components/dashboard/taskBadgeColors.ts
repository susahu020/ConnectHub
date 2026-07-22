export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
    case 'HIGH':
      return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
    case 'NORMAL':
      return 'text-primary bg-primary/5 border-primary/20';
    default:
      return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-500 text-white';
    case 'REVIEW':
      return 'bg-amber-500 text-white';
    case 'IN_PROGRESS':
      return 'bg-primary text-white';
    default:
      return 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
  }
}
