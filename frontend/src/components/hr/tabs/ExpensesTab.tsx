import React from 'react';
import { Plus, ExternalLink, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const myClaims = expenses.filter((c: any) => c.userId === currentUserId);
  const pendingClaims = expenses.filter((c: any) => c.status === 'PENDING' && c.userId !== currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{t('hr.expenses.heading')}</h3>
        <button
          onClick={onOpenExpenseModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          {t('hr.expenses.newClaim')}
        </button>
      </div>

      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border dark:border-border">
          <p className="text-sm font-bold text-foreground dark:text-foreground">{t('hr.expenses.myHistory')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                <th className="px-5 py-3">{t('hr.expenses.claim')}</th>
                <th className="px-5 py-3">{t('hr.expenses.category')}</th>
                <th className="px-5 py-3">{t('hr.expenses.amount')}</th>
                <th className="px-5 py-3">{t('hr.expenses.receipt')}</th>
                <th className="px-5 py-3">{t('hr.expenses.status')}</th>
                <th className="px-5 py-3">{t('hr.expenses.notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {myClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('hr.expenses.noClaims')}
                  </td>
                </tr>
              ) : (
                myClaims.map((claim: any) => (
                  <tr key={claim.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                    <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">{claim.title}</td>
                    <td className="px-5 py-4 text-muted-foreground font-bold uppercase">{claim.category}</td>
                    <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                      {claim.currency} {claim.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      {claim.receiptUrl ? (
                        <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {t('hr.expenses.view')}
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
                            const confirmText = isMine && claim.status === 'PENDING' ? t('hr.expenses.withdrawConfirm') : t('hr.expenses.deleteConfirm');
                            if (confirm(confirmText)) {
                              onDeleteExpense(claim.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-muted dark:hover:bg-card text-rose-500"
                          title={claim.status === 'PENDING' ? t('hr.expenses.withdrawClaim') : t('hr.expenses.deleteClaim')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground italic">{claim.managerNotes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isManager && (
        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border dark:border-border">
            <p className="text-sm font-bold text-foreground dark:text-foreground">{t('hr.expenses.pendingClaims')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted dark:bg-card/50 text-[10px] font-black uppercase text-muted-foreground tracking-wider border-b">
                  <th className="px-5 py-3">{t('hr.expenses.employee')}</th>
                  <th className="px-5 py-3">{t('hr.expenses.claim')}</th>
                  <th className="px-5 py-3">{t('hr.expenses.amount')}</th>
                  <th className="px-5 py-3">{t('hr.expenses.receipt')}</th>
                  <th className="px-5 py-3 text-right">{t('hr.expenses.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {pendingClaims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('hr.expenses.noPendingClaims')}
                    </td>
                  </tr>
                ) : (
                  pendingClaims.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-muted/50 dark:hover:bg-card/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground dark:text-foreground">
                          {claim.user?.firstName} {claim.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{claim.user?.designation}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-foreground dark:text-foreground">{claim.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase leading-none mt-0.5">{claim.category}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-foreground dark:text-foreground">
                        {claim.currency} {claim.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        {claim.receiptUrl ? (
                          <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {t('hr.expenses.viewReceipt')}
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
                            title={t('hr.expenses.approve')}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt(t('hr.expenses.rejectionNotesPrompt'));
                              onUpdateExpenseStatus(claim.id, 'REJECTED', notes || undefined);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                            title={t('hr.expenses.reject')}
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
