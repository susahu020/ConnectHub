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
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('hr.shifts.heading')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSwapModal}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-slate-700 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('hr.shifts.requestSwap')}
          </button>
          {isManager && (
            <>
              <button
                onClick={onOpenCreateShiftModal}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-slate-800 dark:bg-slate-700 rounded-xl shadow-md hover:bg-slate-900 transition-all"
              >
                <Plus className="h-4 w-4" />
                {t('hr.shifts.defineShift')}
              </button>
              <button
                onClick={onOpenAssignShiftModal}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
              >
                <Plus className="h-4 w-4" />
                {t('hr.shifts.assignShift')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{isManager ? t('hr.shifts.orgRoster') : t('hr.shifts.myCalendar')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
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
                    <td colSpan={isManager ? (isAdmin ? 5 : 4) : 3} className="text-center py-8 text-slate-400">
                      {t('hr.shifts.noShifts')}
                    </td>
                  </tr>
                ) : (
                  shiftAssignments.map((assign: any) => (
                    <tr key={assign.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {isManager && (
                        <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                          {assign.user?.firstName} {assign.user?.lastName}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: assign.shift?.color || '#3b82f6' }} />
                          <span className="font-bold text-slate-850 dark:text-slate-200">{assign.shift?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-semibold">
                        {assign.shift?.startTime} - {assign.shift?.endTime}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
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
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4">{t('hr.shifts.swapRequestsFeed')}</h4>
          <div className="space-y-4">
            {swapRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">{t('hr.shifts.noSwapRequests')}</p>
            ) : (
              swapRequests.map((swap: any) => (
                <div key={swap.id} className="border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                  <p className="text-[10px] text-slate-500">
                    {t('hr.shifts.swapping')} <span className="font-bold">{swap.requesterAssignment?.shift?.name}</span> ({swap.requesterAssignment?.shift?.startTime}){' '}
                    {t('hr.shifts.with')} <span className="font-bold">{swap.assigneeAssignment?.shift?.name}</span> ({swap.assigneeAssignment?.shift?.startTime})
                  </p>

                  {isManager && swap.status === 'PENDING' && swap.requesterId !== currentUserId && swap.assigneeId !== currentUserId && (
                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                      <button
                        onClick={() => onUpdateSwapStatus(swap.id, 'APPROVED')}
                        className="px-2.5 py-1 text-[10px] font-black text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all"
                      >
                        {t('hr.shifts.approve')}
                      </button>
                      <button
                        onClick={() => onUpdateSwapStatus(swap.id, 'REJECTED')}
                        className="px-2.5 py-1 text-[10px] font-black text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
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
