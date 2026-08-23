import React from 'react';
import { Coffee, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const onBreak = todayAttendance?.breaks?.some((b: any) => b.endTime === null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{t('hr.attendance.punchClock')}</span>
        <p className="text-4xl font-black text-foreground tabular-nums tracking-tight mb-4">{timeStr}</p>

        <div className="flex items-center gap-2 mb-6">
          <span className={`h-2.5 w-2.5 rounded-full ${todayAttendance ? (todayAttendance.clockOut ? 'bg-rose-500' : 'bg-green-500') : 'bg-secondary'}`} />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {todayAttendance ? (todayAttendance.clockOut ? t('hr.attendance.clockedOut') : t('hr.attendance.activeDuty')) : t('hr.attendance.offline')}
          </span>
        </div>

        <div className="w-full space-y-3">
          {!todayAttendance && (
            <button onClick={onClockIn} className="w-full py-3 bg-green-500 hover:bg-green-600 text-primary-foreground rounded-xl font-black shadow-md hover:shadow-lg transition-all">
              {t('hr.attendance.clockIn')}
            </button>
          )}

          {todayAttendance && !todayAttendance.clockOut && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {onBreak ? (
                <button onClick={onEndBreak} className="py-3 bg-amber-500 hover:bg-amber-600 text-primary-foreground rounded-xl font-black shadow-sm transition-all">
                  {t('hr.attendance.endBreak')}
                </button>
              ) : (
                <button
                  onClick={onStartBreak}
                  className="py-3 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground rounded-xl font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Coffee className="h-4 w-4" />
                  {t('hr.attendance.startBreak')}
                </button>
              )}

              <button
                onClick={() => {
                  const note = prompt(t('hr.attendance.clockOutNotePrompt')) || undefined;
                  onClockOut(note);
                }}
                className="py-3 bg-rose-500 hover:bg-rose-600 text-primary-foreground rounded-xl font-black shadow-sm transition-all"
              >
                {t('hr.attendance.clockOut')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border dark:border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground dark:text-foreground">{isManager ? t('hr.attendance.companyFeed') : t('hr.attendance.myHistory')}</p>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                {isManager && <th className="px-5 py-3">{t('hr.attendance.employee')}</th>}
                <th className="px-5 py-3">{t('hr.attendance.date')}</th>
                <th className="px-5 py-3">{t('hr.attendance.clockInCol')}</th>
                <th className="px-5 py-3">{t('hr.attendance.clockOutCol')}</th>
                <th className="px-5 py-3">{t('hr.attendance.status')}</th>
                {isAdmin && <th className="px-5 py-3 text-right">{t('hr.attendance.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    {t('hr.attendance.noLogs')}
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                    {isManager && (
                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground dark:text-foreground">
                          {log.user?.firstName} {log.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{log.user?.designation}</p>
                      </td>
                    )}
                    <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                      {new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(log.status)}`}>{log.status}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onEditLog(log)} className="p-1 rounded text-muted-foreground hover:bg-muted dark:hover:bg-card" title={t('hr.attendance.editPunchTimes')}>
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t('hr.attendance.deleteConfirm'))) {
                                onDeleteLog(log.id);
                              }
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title={t('hr.attendance.deleteRecord')}
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
