import React from 'react';

export function DepartmentsTab({ stats }: { stats: any }) {
  const { departmentProductivity } = stats;

  return (
    <div className="space-y-6">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-border">
          <p className="text-sm font-bold text-foreground dark:text-foreground">Department Performance Logs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                <th className="px-5 py-3">Department Name</th>
                <th className="px-5 py-3">Total Members</th>
                <th className="px-5 py-3">Active Tasks</th>
                <th className="px-5 py-3">Completed Tasks</th>
                <th className="px-5 py-3">Task Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {departmentProductivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No departments configured.
                  </td>
                </tr>
              ) : (
                departmentProductivity.map((dept: any) => (
                  <tr key={dept.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                    <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">{dept.name}</td>
                    <td className="px-5 py-4 text-muted-foreground font-semibold">{dept.totalMembers} Members</td>
                    <td className="px-5 py-4 text-amber-500 font-bold">{dept.pendingTasks} Pending</td>
                    <td className="px-5 py-4 text-green-500 font-bold">{dept.completedTasks} Completed</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{dept.completionRate}%</span>
                        <div className="w-24 bg-muted dark:bg-card h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${dept.completionRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
