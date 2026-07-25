import React from 'react';
import { Coffee, Edit, Trash2 } from 'lucide-react';
import { statusBadgeClass } from '../statusBadge';

export function AttendanceTab({
  timeStr,
  todayAttendance,
  attendanceLogs,
  isManager,
  isAdmin,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onEditLog,
  onDeleteLog,
}: {
  timeStr: string;
  todayAttendance: any;
  attendanceLogs: any[];
  isManager: boolean;
  isAdmin: boolean;
  onClockIn: () => void;
  onClockOut: (notes?: string) => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onEditLog: (log: any) => void;
  onDeleteLog: (id: string) => void;
}) {
  const onBreak = todayAttendance?.breaks?.some((b: any) => b.endTime === null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Office Punch Clock</span>
        <p className="text-4xl font-black text-slate-800 dark:text-white tabular-nums tracking-tight mb-4">{timeStr}</p>

        <div className="flex items-center gap-2 mb-6">
          <span className={`h-2.5 w-2.5 rounded-full ${todayAttendance ? (todayAttendance.clockOut ? 'bg-rose-500' : 'bg-green-500') : 'bg-slate-300'}`} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {todayAttendance ? (todayAttendance.clockOut ? 'Clocked Out' : 'Active Duty') : 'Offline / Signed Out'}
          </span>
        </div>

        <div className="w-full space-y-3">
          {!todayAttendance && (
            <button onClick={onClockIn} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black shadow-md hover:shadow-lg transition-all">
              Clock In
            </button>
          )}

          {todayAttendance && !todayAttendance.clockOut && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {onBreak ? (
                <button onClick={onEndBreak} className="py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-sm transition-all">
                  End Break
                </button>
              ) : (
                <button
                  onClick={onStartBreak}
                  className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Coffee className="h-4 w-4" />
                  Start Break
                </button>
              )}

              <button
                onClick={() => {
                  const note = prompt('Leave a clock out note (optional):') || undefined;
                  onClockOut(note);
                }}
                className="py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black shadow-sm transition-all"
              >
                Clock Out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{isManager ? 'Company Attendance Feed' : 'My Attendance History'}</p>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                {isManager && <th className="px-5 py-3">Employee</th>}
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Clock In</th>
                <th className="px-5 py-3">Clock Out</th>
                <th className="px-5 py-3">Status</th>
                {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="text-center py-8 text-slate-400">
                    No attendance logs.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {isManager && (
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {log.user?.firstName} {log.user?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400">{log.user?.designation}</p>
                      </td>
                    )}
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(log.status)}`}>{log.status}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onEditLog(log)} className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850" title="Edit punch times">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this attendance log?')) {
                                onDeleteLog(log.id);
                              }
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
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
