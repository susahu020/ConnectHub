import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { isConfigured as isCloudinaryConfigured, cloudinary } from '../config/cloudinary';

// ==========================================
// PAYSLIP PDF GENERATION
// ==========================================
// Previously Payslip.fileUrl was just a free-text field nobody ever
// actually populated — payslips existed only as rows in a table, with no
// downloadable document for the employee. This renders an actual PDF from
// the payslip + the attendance/leave breakdown recorded alongside it.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

export interface PayslipPdfInput {
  orgName: string;
  orgAddress?: string | null;
  orgSupportEmail?: string | null;
  employeeName: string;
  employeeDesignation?: string | null;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  generatedByName: string;
  generatedAt: Date;
  attendanceSummary?: {
    workingDays: number;
    presentDays: number;
    lateDays: number;
    halfDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    absentDays: number;
    payableDays: number;
  } | null;
  statutoryDeductions?: {
    providentFundEmployee: number;
    professionalTax: number;
    incomeTaxEstimateMonthly: number;
    totalStatutoryDeductions: number;
    appliedRules: { providentFund: boolean; professionalTax: boolean; incomeTax: boolean };
  } | null;
  overtime?: {
    totalOvertimeHours: number;
    hourlyRate: number;
    totalOvertimePay: number;
    appliedRule: boolean;
  } | null;
}

export const generatePayslipPdfBuffer = (input: PayslipPdfInput): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text(input.orgName, { continued: false });
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      if (input.orgAddress) doc.text(input.orgAddress);
      if (input.orgSupportEmail) doc.text(input.orgSupportEmail);
      doc.fillColor('#000000');
      doc.moveDown(1.5);

      doc.fontSize(14).font('Helvetica-Bold').text(`Payslip — ${MONTH_NAMES[input.month - 1]} ${input.year}`);
      doc.moveDown(0.75);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
      doc.moveDown(0.75);

      // Employee details
      doc.fontSize(10).font('Helvetica-Bold').text('Employee');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Name: ${input.employeeName}`);
      if (input.employeeDesignation) doc.text(`Designation: ${input.employeeDesignation}`);
      doc.text(`Employee ID: ${input.employeeId}`);
      doc.moveDown(1);

      // Attendance summary, when available
      if (input.attendanceSummary) {
        const s = input.attendanceSummary;
        doc.font('Helvetica-Bold').fontSize(10).text('Attendance Summary');
        doc.font('Helvetica').fontSize(9);
        doc.text(
          `Working Days: ${s.workingDays}    Present: ${s.presentDays}    Late: ${s.lateDays}    Half-Day: ${s.halfDays}`
        );
        doc.text(
          `Paid Leave: ${s.paidLeaveDays}    Unpaid Leave: ${s.unpaidLeaveDays}    Absent: ${s.absentDays}    Payable Days: ${s.payableDays}`
        );
        doc.moveDown(1);
      }

      // Overtime, when the policy was enabled and actual overtime hours
      // were logged this month — omitted entirely otherwise, same
      // "don't show an all-zero section" reasoning as statutory
      // deductions below.
      const overtime = input.overtime;
      if (overtime && overtime.appliedRule && overtime.totalOvertimeHours > 0) {
        doc.font('Helvetica-Bold').fontSize(10).text('Overtime');
        doc.font('Helvetica').fontSize(9);
        doc.text(
          `${overtime.totalOvertimeHours} hour(s) at ${formatCurrency(overtime.hourlyRate)}/hr (with multiplier) = ${formatCurrency(overtime.totalOvertimePay)}`
        );
        doc.moveDown(1);
      }

      // Statutory deduction breakdown, when any rule was enabled and
      // actually applied — kept off the page entirely for orgs that
      // haven't configured/opted into any of this, rather than showing a
      // confusing all-zero section.
      const statutory = input.statutoryDeductions;
      const hasStatutoryLine = statutory && (statutory.appliedRules.providentFund || statutory.appliedRules.professionalTax || statutory.appliedRules.incomeTax);
      if (statutory && hasStatutoryLine) {
        doc.font('Helvetica-Bold').fontSize(10).text('Statutory Deductions');
        doc.font('Helvetica').fontSize(9);
        const parts: string[] = [];
        if (statutory.appliedRules.providentFund) parts.push(`Provident Fund: ${formatCurrency(statutory.providentFundEmployee)}`);
        if (statutory.appliedRules.professionalTax) parts.push(`Professional Tax: ${formatCurrency(statutory.professionalTax)}`);
        if (statutory.appliedRules.incomeTax) parts.push(`Est. Income Tax: ${formatCurrency(statutory.incomeTaxEstimateMonthly)}`);
        doc.text(parts.join('    '));
        doc.fontSize(7.5).fillColor('#888888').text('Income tax figure is a simplified estimate, not a certified tax calculation.');
        doc.fillColor('#000000');
        doc.moveDown(1);
      }

      // Earnings/deductions table
      doc.font('Helvetica-Bold').fontSize(10).text('Compensation');
      doc.moveDown(0.3);

      const tableTop = doc.y;
      const rowHeight = 22;
      const col1X = 50;
      const col2X = 400;

      const rows: Array<[string, string, boolean?]> = [
        ['Basic Salary', formatCurrency(input.basicSalary)],
        ['Allowances', formatCurrency(input.allowances)],
        ['Deductions', `-${formatCurrency(input.deductions)}`],
      ];

      doc.font('Helvetica').fontSize(10);
      rows.forEach(([label, value], i) => {
        const y = tableTop + i * rowHeight;
        doc.text(label, col1X, y);
        doc.text(value, col2X, y, { width: 95, align: 'right' });
      });

      const netY = tableTop + rows.length * rowHeight + 4;
      doc.moveTo(col1X, netY).lineTo(545, netY).strokeColor('#333333').stroke();
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Net Salary', col1X, netY + 8);
      doc.text(formatCurrency(input.netSalary), col2X, netY + 8, { width: 95, align: 'right' });

      // The table rows above set an explicit x for the right-hand value
      // column; reset the cursor back to the left margin before writing
      // the footer, or PDFKit carries that x forward into the next
      // unpositioned .text() calls and wraps/clips them against the page
      // edge instead of the intended full-width column.
      doc.x = doc.page.margins.left;
      doc.y = netY + 8 + 40;

      doc.font('Helvetica').fontSize(9).fillColor('#666666');
      doc.text(`Status: ${input.status}`, doc.page.margins.left);
      doc.text(`Generated by ${input.generatedByName} on ${input.generatedAt.toLocaleDateString()}`, doc.page.margins.left);
      doc.fontSize(8).text(
        'This is a system-generated payslip. Figures reflect an attendance/leave-aware calculation reviewed and confirmed by an administrator.',
        doc.page.margins.left,
        undefined,
        { width: 495 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Same storage pattern as file.controller.ts's uploadFile: Cloudinary when
// configured (uploaded as a 'raw' resource, since it's a PDF, not an
// image), falling back to the local /uploads static directory otherwise.
// `req` is only used for building the local-fallback URL (protocol/host);
// callers pass the Express request they're already handling.
export const savePayslipPdf = async (
  buffer: Buffer,
  employeeId: string,
  month: number,
  year: number,
  req: { protocol: string; get: (name: string) => string | undefined }
): Promise<string> => {
  const filename = `payslip-${employeeId}-${year}-${String(month).padStart(2, '0')}-${Date.now()}.pdf`;
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localPath = path.join(uploadDir, filename);
  fs.writeFileSync(localPath, buffer);

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        resource_type: 'raw',
        folder: 'connecthub/payslips',
        public_id: filename,
      });
      fs.unlinkSync(localPath);
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary payslip upload failed, falling back to local file path:', err);
      // Fall through to local URL below — the file is still on disk.
    }
  }

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  return `${serverUrl}/uploads/${filename}`;
};
