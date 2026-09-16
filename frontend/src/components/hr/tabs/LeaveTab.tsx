import React from 'react';
import { Plus, Check, X, Trash2, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { statusBadgeClass } from '../statusBadge';

export function LeaveTab({
  leaves,
  balances,
  currentUserId,
  isManager,
  isAdmin,
  onOpenLeaveModal,
  onUpdateLeaveStatus,
  onDeleteLeave,
}: {
  leaves: any[];
  balances: any[];
  currentUserId?: string;
  isManager: boolean;
  isAdmin: boolean;
  onOpenLeaveModal: () => void;
  onUpdateLeaveStatus: (id: string, status: string, managerNotes?: string) => void;
  onDeleteLeave: (id: string) => void;
}) {
  const { t } = useTranslation();
  const myLeaves = leaves.filter((l: any) => l.userId === currentUserId);
  const pendingApprovals = leaves.filter((l: any) => l.status === 'PENDING' && l.userId !== currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground">{t('hr.leave.heading')}</h3>
        <button
          onClick={onOpenLeaveModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          {t('hr.leave.requestLeave')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {balances.map((bal: any) => (
          <div key={bal.id} className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{bal.leaveType}</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {bal.total - bal.used} <span className="text-xs text-muted-foreground font-bold">{t('hr.leave.leftOfTotal', { total: bal.total })}</span>
            </p>
            <div className="w-full bg-muted dark:bg-card h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (bal.used / bal.total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-border">
          <p className="text-sm font-bold text-foreground dark:text-foreground">{t('hr.leave.myHistory')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                <th className="px-5 py-3">{t('hr.leave.leaveType')}</th>
                <th className="px-5 py-3">{t('hr.leave.dates')}</th>
                <th className="px-5 py-3">{t('hr.leave.days')}</th>
                <th className="px-5 py-3">{t('hr.leave.reason')}</th>
                <th className="px-5 py-3">{t('hr.leave.status')}</th>
                <th className="px-5 py-3">{t('hr.leave.approverNotes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {myLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('hr.leave.noRequests')}
                  </td>
                </tr>
              ) : (
                myLeaves.map((req: any) => {
                  const days = req.isHalfDay
                    ? 0.5
                    : Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <tr key={req.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                      <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                        {req.leaveType}
                        {req.isHalfDay && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">½ Day</span>
                        )}
                        {req.attachmentUrl && (
                          <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex text-muted-foreground hover:text-primary" title="View attached document">
                            <Paperclip className="h-3 w-3 inline" />
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-foreground dark:text-foreground">{t('hr.leave.days', { count: days })}</td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-5 py-4 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(req.status)}`}>{req.status}</span>
                        {(isAdmin || req.status === 'PENDING') && (
                          <button
                            onClick={() => {
                              const isMine = req.userId === currentUserId;
                              const confirmText =
                                isMine && req.status === 'PENDING' ? t('hr.leave.cancelRequestConfirm') : t('hr.leave.deleteRequestConfirm');
                              if (confirm(confirmText)) {
                                onDeleteLeave(req.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-muted dark:hover:bg-card text-rose-500"
                            title={req.status === 'PENDING' ? t('hr.leave.cancelRequest') : t('hr.leave.deleteRequest')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground italic">{req.managerNotes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isManager && (
        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border dark:border-border">
            <p className="text-sm font-bold text-foreground dark:text-foreground">{t('hr.leave.pendingApprovals')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                  <th className="px-5 py-3">{t('hr.leave.employee')}</th>
                  <th className="px-5 py-3">{t('hr.leave.leaveType')}</th>
                  <th className="px-5 py-3">{t('hr.leave.dates')}</th>
                  <th className="px-5 py-3">{t('hr.leave.reason')}</th>
                  <th className="px-5 py-3 text-right">{t('hr.leave.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('hr.leave.noPendingApprovals')}
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map((req: any) => (
                    <tr key={req.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground dark:text-foreground">
                          {req.user?.firstName} {req.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{req.user?.designation}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                        {req.leaveType}
                        {req.isHalfDay && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">½ Day</span>
                        )}
                        {req.attachmentUrl && (
                          <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex text-muted-foreground hover:text-primary" title="View attached document">
                            <Paperclip className="h-3 w-3 inline" />
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onUpdateLeaveStatus(req.id, 'APPROVED')}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            title={t('hr.leave.approve')}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt(t('hr.leave.rejectionNotesPrompt'));
                              onUpdateLeaveStatus(req.id, 'REJECTED', notes || undefined);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                            title={t('hr.leave.reject')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
