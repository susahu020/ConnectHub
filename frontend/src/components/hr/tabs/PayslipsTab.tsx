import React from 'react';
import { Plus, Eye, Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { statusBadgeClass } from '../statusBadge';

export function PayslipsTab({
  payslips,
  isManager,
  isAdmin,
  onGeneratePayslip,
  onViewPayslip,
  onMarkPaid,
  onDeletePayslip,
}: {
  payslips: any[];
  isManager: boolean;
  isAdmin: boolean;
  onGeneratePayslip: () => void;
  onViewPayslip: (pay: any) => void;
  onMarkPaid: (id: string) => void;
  onDeletePayslip: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('hr.payslips.heading')}</h3>
        {isAdmin && (
          <button
            onClick={onGeneratePayslip}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('hr.payslips.generate')}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{isAdmin ? t('hr.payslips.allPayslips') : t('hr.payslips.myPayslips')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                {isAdmin && <th className="px-5 py-3">{t('hr.payslips.employee')}</th>}
                <th className="px-5 py-3">{t('hr.payslips.monthYear')}</th>
                <th className="px-5 py-3">{t('hr.payslips.basicSalary')}</th>
                <th className="px-5 py-3">{t('hr.payslips.allowances')}</th>
                <th className="px-5 py-3">{t('hr.payslips.deductions')}</th>
                <th className="px-5 py-3">{t('hr.payslips.netSalary')}</th>
                <th className="px-5 py-3">{t('hr.payslips.status')}</th>
                <th className="px-5 py-3 text-right">{t('hr.payslips.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-slate-400">
                    {t('hr.payslips.noPayslips')}
                  </td>
                </tr>
              ) : (
                payslips.map((pay: any) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {pay.user?.firstName} {pay.user?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{pay.user?.designation}</p>
                      </td>
                    )}
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {new Date(0, pay.month - 1).toLocaleString([], { month: 'long' })} {pay.year}
                    </td>
                    <td className="px-5 py-4 text-slate-500">${pay.basicSalary.toLocaleString()}</td>
                    <td className="px-5 py-4 text-green-500 font-semibold">+${pay.allowances.toLocaleString()}</td>
                    <td className="px-5 py-4 text-rose-500 font-semibold">-${pay.deductions.toLocaleString()}</td>
                    <td className="px-5 py-4 font-black text-slate-800 dark:text-white">${pay.netSalary.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadgeClass(pay.status)}`}>{pay.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onViewPayslip(pay)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title={t('hr.payslips.viewDetails')}>
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && pay.status === 'UNPAID' && (
                          <button onClick={() => onMarkPaid(pay.id)} className="p-1 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20" title={t('hr.payslips.markPaid')}>
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(t('hr.payslips.deleteConfirm'))) {
                                onDeletePayslip(pay.id);
                              }
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title={t('hr.payslips.deletePayslip')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
