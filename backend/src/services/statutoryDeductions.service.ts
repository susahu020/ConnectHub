// ==========================================
// STATUTORY PAYROLL DEDUCTIONS ENGINE
// ==========================================
// payroll.service.ts already prorates basicSalary against attendance and
// leave. This module adds the other half of a real payroll run: employer/
// statutory-style deductions computed from the (already-prorated) salary
// figures — Provident Fund, Professional Tax, and a simplified income-tax
// withholding estimate.
//
// IMPORTANT — this is a configurable template, not tax advice. Statutory
// deduction rules vary enormously by country/region and change over time.
// Every rule here defaults to `enabled: false` so an org is never silently
// taxed under assumptions it never agreed to — an Admin must explicitly
// configure and turn on the pieces that apply to them (via
// OrganizationSettings.payrollStatutoryPolicy) and should verify the
// configured rates/slabs against current local law or their accountant.
// Same "advisory, audited, never silently authoritative on its own" spirit
// as payroll.service.ts's attendance proration.

export interface ProvidentFundPolicy {
  enabled: boolean;
  /** Employee's own contribution, as a percentage of the PF-eligible wage (e.g. 12 for 12%). */
  employeeRatePercent: number;
  /** Caps the wage PF is calculated on (e.g. a statutory wage ceiling). Null = no cap, uses full basicSalary. */
  wageCeiling: number | null;
}

export interface ProfessionalTaxSlab {
  /** Inclusive lower bound of monthly gross salary this slab applies to. */
  minGross: number;
  /** Inclusive upper bound. Null = open-ended (top slab). */
  maxGross: number | null;
  /** Flat monthly deduction amount for gross salary falling in this slab. */
  amount: number;
}

export interface ProfessionalTaxPolicy {
  enabled: boolean;
  /** Should be sorted ascending by minGross; computeStatutoryDeductions sorts defensively anyway. */
  slabs: ProfessionalTaxSlab[];
}

export interface IncomeTaxSlab {
  /** Inclusive upper bound of *annual* taxable income this slab's rate applies up to. Null = open-ended (top slab). */
  upToAnnual: number | null;
  /** Marginal rate for the portion of annual taxable income falling in this slab. */
  ratePercent: number;
}

export interface IncomeTaxPolicy {
  enabled: boolean;
  /** Progressive slabs, applied to annualized (monthly gross x 12) income. Sorted ascending by upToAnnual (nulls last). */
  annualSlabs: IncomeTaxSlab[];
  /** Flat annual deduction applied before slabs (e.g. a standard deduction). */
  standardDeductionAnnual: number;
}

export interface StatutoryDeductionPolicy {
  providentFund: ProvidentFundPolicy;
  professionalTax: ProfessionalTaxPolicy;
  incomeTax: IncomeTaxPolicy;
}

export interface StatutoryDeductionInput {
  /** Prorated basic salary for the month — PF is calculated on this, not gross. */
  basicSalary: number;
  /** basicSalary + allowances for the month — professional tax and income tax are calculated on this. */
  grossSalary: number;
  policy: StatutoryDeductionPolicy;
}

export interface StatutoryDeductionBreakdown {
  providentFundEmployee: number;
  professionalTax: number;
  /** A simplified monthly estimate only — see module doc comment. 0 when incomeTax.enabled is false. */
  incomeTaxEstimateMonthly: number;
  totalStatutoryDeductions: number;
  /** Which pieces of the policy actually applied, for display/audit purposes. */
  appliedRules: { providentFund: boolean; professionalTax: boolean; incomeTax: boolean };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

// Disabled by default across the board — an org must opt in. The
// percentages/slabs below are common illustrative examples (India-style
// PF/Professional-Tax structures are a widely recognizable reference
// point) and are meant purely as a starting template to edit, not a
// default that quietly applies to every org.
export const DEFAULT_STATUTORY_DEDUCTION_POLICY: StatutoryDeductionPolicy = {
  providentFund: { enabled: false, employeeRatePercent: 12, wageCeiling: 15000 },
  professionalTax: {
    enabled: false,
    slabs: [
      { minGross: 0, maxGross: 15000, amount: 0 },
      { minGross: 15001, maxGross: 25000, amount: 150 },
      { minGross: 25001, maxGross: null, amount: 200 },
    ],
  },
  incomeTax: {
    enabled: false,
    standardDeductionAnnual: 50000,
    annualSlabs: [
      { upToAnnual: 300000, ratePercent: 0 },
      { upToAnnual: 700000, ratePercent: 5 },
      { upToAnnual: 1000000, ratePercent: 10 },
      { upToAnnual: 1200000, ratePercent: 15 },
      { upToAnnual: 1500000, ratePercent: 20 },
      { upToAnnual: null, ratePercent: 30 },
    ],
  },
};

const computeProvidentFund = (basicSalary: number, policy: ProvidentFundPolicy): number => {
  if (!policy.enabled || policy.employeeRatePercent <= 0) return 0;
  const eligibleWage = policy.wageCeiling != null ? Math.min(basicSalary, policy.wageCeiling) : basicSalary;
  return round2(Math.max(0, eligibleWage) * (policy.employeeRatePercent / 100));
};

const computeProfessionalTax = (grossSalary: number, policy: ProfessionalTaxPolicy): number => {
  if (!policy.enabled || policy.slabs.length === 0) return 0;
  const sortedSlabs = [...policy.slabs].sort((a, b) => a.minGross - b.minGross);
  const matched = sortedSlabs.find(
    (slab) => grossSalary >= slab.minGross && (slab.maxGross === null || grossSalary <= slab.maxGross)
  );
  return matched ? round2(Math.max(0, matched.amount)) : 0;
};

/**
 * Simplified progressive-slab estimate only — real withholding calculators
 * account for exemptions, deductions, and regime choices this does not
 * model. Annualizes the month's gross (x12), applies the standard
 * deduction, then walks the slabs cumulatively; the result is divided back
 * down to a monthly figure. Never treat this as a substitute for an actual
 * tax/payroll compliance tool.
 */
const computeIncomeTaxEstimate = (grossSalary: number, policy: IncomeTaxPolicy): number => {
  if (!policy.enabled || policy.annualSlabs.length === 0) return 0;

  const annualGross = Math.max(0, grossSalary) * 12;
  const taxableAnnual = Math.max(0, annualGross - Math.max(0, policy.standardDeductionAnnual));

  const sortedSlabs = [...policy.annualSlabs].sort((a, b) => {
    if (a.upToAnnual === null) return 1;
    if (b.upToAnnual === null) return -1;
    return a.upToAnnual - b.upToAnnual;
  });

  let annualTax = 0;
  let lowerBound = 0;
  for (const slab of sortedSlabs) {
    const upperBound = slab.upToAnnual === null ? Infinity : slab.upToAnnual;
    const taxableInSlab = Math.max(0, Math.min(taxableAnnual, upperBound) - lowerBound);
    annualTax += taxableInSlab * (slab.ratePercent / 100);
    lowerBound = upperBound;
    if (taxableAnnual <= lowerBound) break;
  }

  return round2(annualTax / 12);
};

/** Computes the full statutory deduction breakdown for one employee for one month. Pure/DB-free — see hr.controller.ts for the org-settings-fetching wrapper. */
export const computeStatutoryDeductions = (input: StatutoryDeductionInput): StatutoryDeductionBreakdown => {
  const { basicSalary, grossSalary, policy } = input;

  const providentFundEmployee = computeProvidentFund(basicSalary, policy.providentFund);
  const professionalTax = computeProfessionalTax(grossSalary, policy.professionalTax);
  const incomeTaxEstimateMonthly = computeIncomeTaxEstimate(grossSalary, policy.incomeTax);

  return {
    providentFundEmployee,
    professionalTax,
    incomeTaxEstimateMonthly,
    totalStatutoryDeductions: round2(providentFundEmployee + professionalTax + incomeTaxEstimateMonthly),
    appliedRules: {
      providentFund: policy.providentFund.enabled,
      professionalTax: policy.professionalTax.enabled,
      incomeTax: policy.incomeTax.enabled,
    },
  };
};

// ==========================================
// POLICY VALIDATION
// ==========================================
// Used by organization.controller.ts's updateOrganizationSettings before
// ever writing to the OrganizationSettings.payrollStatutoryPolicy JSON
// column — an admin settings form is still client-supplied input, so it
// gets the same "never trust it blindly" treatment as any other write.
// Deliberately permissive about *shape* (extra/missing optional numeric
// fields default sensibly) but strict about *type* — a slab with a
// non-numeric amount is rejected outright rather than silently coerced,
// since a coerced-to-0 tax slab could quietly stop deducting from a
// paycheck.

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const validateProvidentFund = (v: any): { error?: string; value?: ProvidentFundPolicy } => {
  if (typeof v !== 'object' || v === null) return { error: 'providentFund must be an object.' };
  if (typeof v.enabled !== 'boolean') return { error: 'providentFund.enabled must be a boolean.' };
  if (!isFiniteNumber(v.employeeRatePercent) || v.employeeRatePercent < 0 || v.employeeRatePercent > 100) {
    return { error: 'providentFund.employeeRatePercent must be a number between 0 and 100.' };
  }
  if (v.wageCeiling !== null && (!isFiniteNumber(v.wageCeiling) || v.wageCeiling < 0)) {
    return { error: 'providentFund.wageCeiling must be a non-negative number or null.' };
  }
  return { value: { enabled: v.enabled, employeeRatePercent: v.employeeRatePercent, wageCeiling: v.wageCeiling } };
};

const validateProfessionalTax = (v: any): { error?: string; value?: ProfessionalTaxPolicy } => {
  if (typeof v !== 'object' || v === null) return { error: 'professionalTax must be an object.' };
  if (typeof v.enabled !== 'boolean') return { error: 'professionalTax.enabled must be a boolean.' };
  if (!Array.isArray(v.slabs)) return { error: 'professionalTax.slabs must be an array.' };
  const slabs: ProfessionalTaxSlab[] = [];
  for (const slab of v.slabs) {
    if (typeof slab !== 'object' || slab === null || !isFiniteNumber(slab.minGross) || slab.minGross < 0) {
      return { error: 'Each professionalTax slab needs a non-negative numeric minGross.' };
    }
    if (slab.maxGross !== null && (!isFiniteNumber(slab.maxGross) || slab.maxGross < slab.minGross)) {
      return { error: 'Each professionalTax slab\'s maxGross must be null or a number >= its minGross.' };
    }
    if (!isFiniteNumber(slab.amount) || slab.amount < 0) {
      return { error: 'Each professionalTax slab needs a non-negative numeric amount.' };
    }
    slabs.push({ minGross: slab.minGross, maxGross: slab.maxGross, amount: slab.amount });
  }
  return { value: { enabled: v.enabled, slabs } };
};

const validateIncomeTax = (v: any): { error?: string; value?: IncomeTaxPolicy } => {
  if (typeof v !== 'object' || v === null) return { error: 'incomeTax must be an object.' };
  if (typeof v.enabled !== 'boolean') return { error: 'incomeTax.enabled must be a boolean.' };
  if (!isFiniteNumber(v.standardDeductionAnnual) || v.standardDeductionAnnual < 0) {
    return { error: 'incomeTax.standardDeductionAnnual must be a non-negative number.' };
  }
  if (!Array.isArray(v.annualSlabs)) return { error: 'incomeTax.annualSlabs must be an array.' };
  const annualSlabs: IncomeTaxSlab[] = [];
  for (const slab of v.annualSlabs) {
    if (typeof slab !== 'object' || slab === null) return { error: 'Each incomeTax slab must be an object.' };
    if (slab.upToAnnual !== null && (!isFiniteNumber(slab.upToAnnual) || slab.upToAnnual < 0)) {
      return { error: 'Each incomeTax slab\'s upToAnnual must be null or a non-negative number.' };
    }
    if (!isFiniteNumber(slab.ratePercent) || slab.ratePercent < 0 || slab.ratePercent > 100) {
      return { error: 'Each incomeTax slab\'s ratePercent must be a number between 0 and 100.' };
    }
    annualSlabs.push({ upToAnnual: slab.upToAnnual, ratePercent: slab.ratePercent });
  }
  return { value: { enabled: v.enabled, standardDeductionAnnual: v.standardDeductionAnnual, annualSlabs } };
};

/**
 * Validates a full StatutoryDeductionPolicy object (as submitted from the
 * organization settings form). Returns the sanitized policy on success —
 * always use the returned `policy`, not the raw input, since it strips any
 * unexpected extra keys the client might have sent.
 */
export const validateStatutoryDeductionPolicy = (
  input: any
): { valid: true; policy: StatutoryDeductionPolicy } | { valid: false; error: string } => {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, error: 'payrollStatutoryPolicy must be an object.' };
  }

  const pf = validateProvidentFund(input.providentFund);
  if (pf.error) return { valid: false, error: pf.error };
  const pt = validateProfessionalTax(input.professionalTax);
  if (pt.error) return { valid: false, error: pt.error };
  const it = validateIncomeTax(input.incomeTax);
  if (it.error) return { valid: false, error: it.error };

  return { valid: true, policy: { providentFund: pf.value!, professionalTax: pt.value!, incomeTax: it.value! } };
};
