import React from 'react';
import { X, Download } from 'lucide-react';

export function PayslipDetailModal({ payslip, orgName, onClose }: { payslip: any; orgName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Payslip Details</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">{orgName} Enterprise</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statement of Earnings</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                {new Date(0, payslip.month - 1).toLocaleString([], { month: 'long' })} {payslip.year}
              </p>
              <p className="text-[10px] text-slate-400">
                Issued by: {payslip.generatedBy?.firstName} {payslip.generatedBy?.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase">Employee Details</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                {payslip.user?.firstName} {payslip.user?.lastName}
              </p>
              <p className="text-slate-500">{payslip.user?.designation}</p>
              <p className="text-slate-500">{payslip.user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold text-[10px] uppercase">Payment Status</p>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border mt-1.5 ${
                  payslip.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}
              >
                {payslip.status}
              </span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Basic Salary</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">${payslip.basicSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allowances</span>
              <span className="font-bold text-green-500">+${payslip.allowances.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Deductions</span>
              <span className="font-bold text-rose-500">-${payslip.deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-dashed pt-2 text-sm font-black">
              <span className="text-slate-900 dark:text-white">Net Payout</span>
              <span className="text-primary">${payslip.netSalary.toLocaleString()}</span>
            </div>
          </div>

          {payslip.notes && (
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded border text-[10px] text-slate-500 italic mt-3">Notes: &quot;{payslip.notes}&quot;</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Print Payslip
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
}
