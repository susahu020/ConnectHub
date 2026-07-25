import React from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';
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
  const myLeaves = leaves.filter((l: any) => l.userId === currentUserId);
  const pendingApprovals = leaves.filter((l: any) => l.status === 'PENDING' && l.userId !== currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Leave Requests & Balance</h3>
        <button
          onClick={onOpenLeaveModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {balances.map((bal: any) => (
          <div key={bal.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{bal.leaveType}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {bal.total - bal.used} <span className="text-xs text-slate-400 font-bold">/ {bal.total} left</span>
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (bal.used / bal.total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">My Leave History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                <th className="px-5 py-3">Leave Type</th>
                <th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3">Days</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Approver Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {myLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                myLeaves.map((req: any) => {
                  const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{req.leaveType}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{days} Days</td>
                      <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-5 py-4 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(req.status)}`}>{req.status}</span>
                        {(isAdmin || req.status === 'PENDING') && (
                          <button
                            onClick={() => {
                              const isMine = req.userId === currentUserId;
                              const confirmText =
                                isMine && req.status === 'PENDING' ? 'Cancel this leave request?' : 'Are you sure you want to delete this leave request?';
                              if (confirm(confirmText)) {
                                onDeleteLeave(req.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                            title={req.status === 'PENDING' ? 'Cancel Request' : 'Delete Request'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 italic">{req.managerNotes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isManager && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Leave Approvals (Manager Panel)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No pending approvals.
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {req.user?.firstName} {req.user?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{req.user?.designation}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{req.leaveType}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onUpdateLeaveStatus(req.id, 'APPROVED')}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Enter rejection notes (optional):');
                              onUpdateLeaveStatus(req.id, 'REJECTED', notes || undefined);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                            title="Reject"
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
