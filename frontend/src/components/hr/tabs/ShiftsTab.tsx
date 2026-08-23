import React from 'react';
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ShiftsTab({
  shiftAssignments,
  swapRequests,
  isManager,
  isAdmin,
  currentUserId,
  onOpenSwapModal,
  onOpenCreateShiftModal,
  onOpenAssignShiftModal,
  onDeleteShiftAssignment,
  onUpdateSwapStatus,
}: {
  shiftAssignments: any[];
  swapRequests: any[];
  isManager: boolean;
  isAdmin: boolean;
  currentUserId?: string;
  onOpenSwapModal: () => void;
  onOpenCreateShiftModal: () => void;
  onOpenAssignShiftModal: () => void;
  onDeleteShiftAssignment: (id: string) => void;
  onUpdateSwapStatus: (id: string, status: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground">{t('hr.shifts.heading')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSwapModal}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-foreground bg-card border border-border dark:bg-card dark:border-border dark:text-foreground rounded-xl shadow-sm hover:bg-muted dark:hover:bg-card transition-all"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('hr.shifts.requestSwap')}
          </button>
          {isManager && (
            <>
              <button
                onClick={onOpenCreateShiftModal}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-background bg-foreground rounded-xl shadow-md hover:bg-foreground/90 transition-all"
              >
                <Plus className="h-4 w-4" />
                {t('hr.shifts.defineShift')}
              </button>
              <button
                onClick={onOpenAssignShiftModal}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
              >
                <Plus className="h-4 w-4" />
                {t('hr.shifts.assignShift')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border dark:border-border">
            <p className="text-sm font-bold text-foreground dark:text-foreground">{isManager ? t('hr.shifts.orgRoster') : t('hr.shifts.myCalendar')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                  {isManager && <th className="px-5 py-3">{t('hr.shifts.employee')}</th>}
                  <th className="px-5 py-3">{t('hr.shifts.shiftName')}</th>
                  <th className="px-5 py-3">{t('hr.shifts.hours')}</th>
                  <th className="px-5 py-3">{t('hr.shifts.dateRange')}</th>
                  {isAdmin && <th className="px-5 py-3 text-right">{t('hr.shifts.action')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {shiftAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? (isAdmin ? 5 : 4) : 3} className="text-center py-8 text-muted-foreground">
                      {t('hr.shifts.noShifts')}
                    </td>
                  </tr>
                ) : (
                  shiftAssignments.map((assign: any) => (
                    <tr key={assign.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                      {isManager && (
                        <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                          {assign.user?.firstName} {assign.user?.lastName}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: assign.shift?.color || '#3b82f6' }} />
                          <span className="font-bold text-foreground dark:text-foreground">{assign.shift?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground font-semibold">
                        {assign.shift?.startTime} - {assign.shift?.endTime}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(assign.startDate).toLocaleDateString()} to {new Date(assign.endDate).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm(t('hr.shifts.deleteAssignmentConfirm'))) {
                                onDeleteShiftAssignment(assign.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-muted dark:hover:bg-card text-rose-500"
                            title={t('hr.shifts.deleteAssignment')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-black text-foreground mb-4">{t('hr.shifts.swapRequestsFeed')}</h4>
          <div className="space-y-4">
            {swapRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t('hr.shifts.noSwapRequests')}</p>
            ) : (
              swapRequests.map((swap: any) => (
                <div key={swap.id} className="border border-border dark:border-border rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-foreground dark:text-foreground">
                      {swap.requester?.firstName} ⟷ {swap.assignee?.firstName}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        swap.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : swap.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {swap.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('hr.shifts.swapping')} <span className="font-bold">{swap.requesterAssignment?.shift?.name}</span> ({swap.requesterAssignment?.shift?.startTime}){' '}
                    {t('hr.shifts.with')} <span className="font-bold">{swap.assigneeAssignment?.shift?.name}</span> ({swap.assigneeAssignment?.shift?.startTime})
                  </p>

                  {isManager && swap.status === 'PENDING' && swap.requesterId !== currentUserId && swap.assigneeId !== currentUserId && (
                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                      <button
                        onClick={() => onUpdateSwapStatus(swap.id, 'APPROVED')}
                        className="px-2.5 py-1 text-[10px] font-black text-primary-foreground bg-green-500 rounded-lg hover:bg-green-600 transition-all"
                      >
                        {t('hr.shifts.approve')}
                      </button>
                      <button
                        onClick={() => onUpdateSwapStatus(swap.id, 'REJECTED')}
                        className="px-2.5 py-1 text-[10px] font-black text-muted-foreground bg-muted hover:bg-secondary rounded-lg transition-all"
                      >
                        {t('hr.shifts.reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
