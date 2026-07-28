export function statusDotColor(status: string) {
  switch (status) {
    case 'ONLINE':
      return 'bg-green-500';
    case 'AWAY':
      return 'bg-amber-500';
    case 'BUSY':
      return 'bg-red-500';
    case 'DND':
      return 'bg-rose-600';
    case 'IN_MEETING':
      return 'bg-indigo-500';
    case 'ON_LEAVE':
      return 'bg-sky-500';
    default:
      return 'bg-slate-400';
  }
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'ONLINE':
      return 'bg-green-50 border-green-200 text-green-600 dark:bg-green-950/20 dark:border-green-900/30';
    case 'AWAY':
      return 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20';
    case 'BUSY':
    case 'DND':
      return 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20';
    case 'IN_MEETING':
      return 'bg-indigo-50 border-indigo-200 text-indigo-650';
    case 'ON_LEAVE':
      return 'bg-sky-50 border-sky-200 text-sky-650';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-500';
  }
}

export function formatStatus(s: string) {
  if (s === 'IN_MEETING') return 'In Meeting';
  if (s === 'ON_LEAVE') return 'On Leave';
  return s.toLowerCase();
}
