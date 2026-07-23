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

export function isBlocked(task: any) {
  return task.dependencies?.some((dep: any) => dep.dependsOnTask?.status !== 'COMPLETED');
}

export function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= numDays; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

export const KANBAN_COLUMNS = [
  { title: 'To Do', status: 'TODO', color: 'border-t-slate-400 bg-slate-50/40 dark:bg-slate-900/10' },
  { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-t-primary bg-primary/5' },
  { title: 'In Review', status: 'REVIEW', color: 'border-t-orange-400 bg-orange-50/10' },
  { title: 'Completed', status: 'COMPLETED', color: 'border-t-green-400 bg-green-50/10' },
];
