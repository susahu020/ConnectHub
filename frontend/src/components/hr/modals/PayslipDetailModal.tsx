import React from 'react';
import { X, Download } from 'lucide-react';

export function PayslipDetailModal({ payslip, orgName, onClose }: { payslip: any; orgName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl w-full max-w-lg p-6 space-y-6 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-foreground">Payslip Details</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border border-border dark:border-border rounded-xl p-5 space-y-4 bg-muted dark:bg-card/50">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <h4 className="text-base font-black text-foreground">{orgName} Enterprise</h4>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Statement of Earnings</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-foreground dark:text-foreground">
                {new Date(0, payslip.month - 1).toLocaleString([], { month: 'long' })} {payslip.year}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Issued by: {payslip.generatedBy?.firstName} {payslip.generatedBy?.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground font-bold text-[10px] uppercase">Employee Details</p>
              <p className="font-bold text-foreground dark:text-foreground mt-1">
                {payslip.user?.firstName} {payslip.user?.lastName}
              </p>
              <p className="text-muted-foreground">{payslip.user?.designation}</p>
              <p className="text-muted-foreground">{payslip.user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground font-bold text-[10px] uppercase">Payment Status</p>
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
              <span className="text-muted-foreground">Basic Salary</span>
              <span className="font-bold text-foreground dark:text-foreground">${payslip.basicSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allowances</span>
              <span className="font-bold text-green-500">+${payslip.allowances.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductions</span>
              <span className="font-bold text-rose-500">-${payslip.deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-dashed pt-2 text-sm font-black">
              <span className="text-foreground">Net Payout</span>
              <span className="text-primary">${payslip.netSalary.toLocaleString()}</span>
            </div>
          </div>

          {payslip.attendanceSummary?.overtime && payslip.attendanceSummary.overtime.appliedRule && payslip.attendanceSummary.overtime.totalOvertimeHours > 0 && (
            <div className="border-t pt-3 space-y-1 text-[10px] text-muted-foreground">
              <p className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Overtime (included above)</p>
              <p>
                <span className="font-bold text-foreground">{payslip.attendanceSummary.overtime.totalOvertimeHours}h</span> at{' '}
                <span className="font-bold text-foreground">${payslip.attendanceSummary.overtime.hourlyRate}/hr</span> ={' '}
                <span className="font-bold text-foreground">${payslip.attendanceSummary.overtime.totalOvertimePay}</span>
              </p>
            </div>
          )}

          {payslip.statutoryDeductions && (
            payslip.statutoryDeductions.appliedRules?.providentFund ||
            payslip.statutoryDeductions.appliedRules?.professionalTax ||
            payslip.statutoryDeductions.appliedRules?.incomeTax
          ) && (
            <div className="border-t pt-3 space-y-1 text-[10px] text-muted-foreground">
              <p className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Statutory deductions (included above)</p>
              <div className="grid grid-cols-3 gap-x-3">
                {payslip.statutoryDeductions.appliedRules.providentFund && (
                  <div>PF: <span className="font-bold text-foreground">${payslip.statutoryDeductions.providentFundEmployee}</span></div>
                )}
                {payslip.statutoryDeductions.appliedRules.professionalTax && (
                  <div>Prof. Tax: <span className="font-bold text-foreground">${payslip.statutoryDeductions.professionalTax}</span></div>
                )}
                {payslip.statutoryDeductions.appliedRules.incomeTax && (
                  <div>Est. Tax: <span className="font-bold text-foreground">${payslip.statutoryDeductions.incomeTaxEstimateMonthly}</span></div>
                )}
              </div>
            </div>
          )}

          {payslip.notes && (
            <div className="bg-card dark:bg-card p-2.5 rounded border text-[10px] text-muted-foreground italic mt-3">Notes: &quot;{payslip.notes}&quot;</div>
          )}
        </div>

        <div className="flex gap-2">
          {payslip.fileUrl ? (
            <a
              href={payslip.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 border border-border dark:border-border text-foreground dark:text-foreground text-xs font-black rounded-xl hover:bg-muted dark:hover:bg-card transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          ) : (
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 border border-border dark:border-border text-foreground dark:text-foreground text-xs font-black rounded-xl hover:bg-muted dark:hover:bg-card transition-all flex items-center justify-center gap-1.5"
              title="No generated PDF is on file for this payslip — this prints the on-screen summary instead."
            >
              <Download className="h-4 w-4" />
              Print Payslip
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary-dark transition-all">
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
}
