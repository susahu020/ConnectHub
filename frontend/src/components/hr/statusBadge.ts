export function statusBadgeClass(status: string) {
  switch (status) {
    case 'APPROVED':
    case 'PRESENT':
    case 'PAID':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'REJECTED':
    case 'ABSENT':
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    case 'PENDING':
    case 'LATE':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'PENDING_SECOND_APPROVAL':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'HALF_DAY':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
