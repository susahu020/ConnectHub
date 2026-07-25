import React from 'react';
import { Plus, ExternalLink, Trash2, Check, X } from 'lucide-react';
import { statusBadgeClass } from '../statusBadge';

export function ExpensesTab({
  expenses,
  currentUserId,
  isManager,
  isAdmin,
  onOpenExpenseModal,
  onUpdateExpenseStatus,
  onDeleteExpense,
}: {
  expenses: any[];
  currentUserId?: string;
  isManager: boolean;
  isAdmin: boolean;
  onOpenExpenseModal: () => void;
  onUpdateExpenseStatus: (id: string, status: string, managerNotes?: string) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const myClaims = expenses.filter((c: any) => c.userId === currentUserId);
  const pendingClaims = expenses.filter((c: any) => c.status === 'PENDING' && c.userId !== currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Expense Claims</h3>
        <button
          onClick={onOpenExpenseModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          New Expense Claim
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">My Claim History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                <th className="px-5 py-3">Expense Claim</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Receipt</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {myClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No expense claims found.
                  </td>
                </tr>
              ) : (
                myClaims.map((claim: any) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{claim.title}</td>
                    <td className="px-5 py-4 text-slate-500 font-bold uppercase">{claim.category}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {claim.currency} {claim.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      {claim.receiptUrl ? (
                        <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(claim.status)}`}>{claim.status}</span>
                      {(isAdmin || claim.status === 'PENDING') && (
                        <button
                          onClick={() => {
                            const isMine = claim.userId === currentUserId;
                            const confirmText = isMine && claim.status === 'PENDING' ? 'Withdraw this expense claim?' : 'Are you sure you want to delete this expense claim?';
                            if (confirm(confirmText)) {
                              onDeleteExpense(claim.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                          title={claim.status === 'PENDING' ? 'Withdraw Claim' : 'Delete Claim'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400 italic">{claim.managerNotes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isManager && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Claims (Manager Panel)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Claim</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {pendingClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No pending expense claims.
                    </td>
                  </tr>
                ) : (
                  pendingClaims.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {claim.user?.firstName} {claim.user?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{claim.user?.designation}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{claim.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase leading-none mt-0.5">{claim.category}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {claim.currency} {claim.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        {claim.receiptUrl ? (
                          <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            View Receipt
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onUpdateExpenseStatus(claim.id, 'APPROVED')}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Enter rejection notes (optional):');
                              onUpdateExpenseStatus(claim.id, 'REJECTED', notes || undefined);
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
