export function getCategoryBadgeColor(category?: string) {
  switch (category?.toUpperCase()) {
    case 'SOP':
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50';
    case 'POLICY':
      return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50';
    case 'HR':
      return 'bg-info/10 text-info-dark border border-info/20 dark:bg-info/15 dark:text-info dark:border-info/25';
    case 'ENGINEERING':
      return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50';
    default:
      return 'bg-muted text-muted-foreground border border-border dark:bg-card dark:text-foreground dark:border-border/50';
  }
}
