import React from 'react';

export function DepartmentsTab({ stats }: { stats: any }) {
  const { departmentProductivity } = stats;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Department Performance Logs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
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
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No departments configured.
                  </td>
                </tr>
              ) : (
                departmentProductivity.map((dept: any) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{dept.name}</td>
                    <td className="px-5 py-4 text-slate-500 font-semibold">{dept.totalMembers} Members</td>
                    <td className="px-5 py-4 text-amber-500 font-bold">{dept.pendingTasks} Pending</td>
                    <td className="px-5 py-4 text-green-500 font-bold">{dept.completedTasks} Completed</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">{dept.completionRate}%</span>
                        <div className="w-24 bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
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
