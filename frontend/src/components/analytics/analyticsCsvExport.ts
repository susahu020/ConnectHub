// Flattens the /analytics response into a simple two-column
// metric/value CSV plus a department breakdown table underneath.
// Distinct from the audit-log export (Reports:Export, in admin.controller.ts) —
// this is the workspace-metrics snapshot, not a security/compliance log.
// Previously there was no way to get any of this data out of the app at
// all; screenshotting the dashboard was the only option.
export function analyticsStatsToCsv(stats: any, rangeLabel: string): string {
  const lines: string[] = [];
  const esc = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells: any[]) => lines.push(cells.map(esc).join(','));

  row('ConnectHub Workspace Analytics Export');
  row('Range', rangeLabel);
  row('Scope', stats?.meta?.scopedToDepartment ? 'Your department only' : 'Company-wide');
  row('Exported at', new Date().toISOString());
  row('');

  row('Metric', 'Value');
  row('Total Users', stats?.activeUsers?.totalUsers);
  row('Currently Online', stats?.activeUsers?.activeSocketUsers);
  row('Total Messages', stats?.chatAnalytics?.totalMessages);
  row('Total Channels', stats?.chatAnalytics?.totalChannels);
  row('Avg Chat Response (min)', stats?.chatAnalytics?.avgChatResponseMinutes);
  row('Total Tasks', stats?.taskCompletion?.totalTasks);
  row('Task Completion Rate (%)', stats?.taskCompletion?.completionRate);
  row('Avg Task Resolution (hrs)', stats?.taskCompletion?.avgTaskResolutionHours);
  row('Total Files', stats?.fileUsage?.totalFiles);
  row('Total Storage (bytes)', stats?.fileUsage?.totalStorageBytes);
  row('Engagement Score', stats?.productivityMetrics?.engagementScore);
  row('');

  if (Array.isArray(stats?.departmentProductivity) && stats.departmentProductivity.length > 0) {
    row('Department Breakdown');
    row('Department', 'Members', 'Total Tasks', 'Completed', 'Pending', 'Completion Rate (%)');
    stats.departmentProductivity.forEach((d: any) => {
      row(d.name, d.totalMembers, d.totalTasks, d.completedTasks, d.pendingTasks, d.completionRate);
    });
  }

  return lines.join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
