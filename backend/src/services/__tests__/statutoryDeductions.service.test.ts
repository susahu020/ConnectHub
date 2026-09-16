import {
  computeStatutoryDeductions,
  DEFAULT_STATUTORY_DEDUCTION_POLICY,
  StatutoryDeductionPolicy,
} from '../statutoryDeductions.service';

const disabledPolicy: StatutoryDeductionPolicy = DEFAULT_STATUTORY_DEDUCTION_POLICY;

describe('computeStatutoryDeductions', () => {
  it('deducts nothing when every rule is disabled (the shipped default)', () => {
    const result = computeStatutoryDeductions({ basicSalary: 50000, grossSalary: 60000, policy: disabledPolicy });
    expect(result.providentFundEmployee).toBe(0);
    expect(result.professionalTax).toBe(0);
    expect(result.incomeTaxEstimateMonthly).toBe(0);
    expect(result.totalStatutoryDeductions).toBe(0);
    expect(result.appliedRules).toEqual({ providentFund: false, professionalTax: false, incomeTax: false });
  });

  describe('provident fund', () => {
    it('applies the employee rate to basicSalary when there is no wage ceiling', () => {
      const policy: StatutoryDeductionPolicy = {
        ...disabledPolicy,
        providentFund: { enabled: true, employeeRatePercent: 12, wageCeiling: null },
      };
      const result = computeStatutoryDeductions({ basicSalary: 20000, grossSalary: 20000, policy });
      expect(result.providentFundEmployee).toBe(2400);
    });

    it('caps the PF-eligible wage at wageCeiling when basicSalary exceeds it', () => {
      const policy: StatutoryDeductionPolicy = {
        ...disabledPolicy,
        providentFund: { enabled: true, employeeRatePercent: 12, wageCeiling: 15000 },
      };
      const result = computeStatutoryDeductions({ basicSalary: 50000, grossSalary: 50000, policy });
      // 12% of the 15000 ceiling, not the full 50000 basic.
      expect(result.providentFundEmployee).toBe(1800);
    });

    it('is a no-op when disabled even with a configured rate', () => {
      const policy: StatutoryDeductionPolicy = {
        ...disabledPolicy,
        providentFund: { enabled: false, employeeRatePercent: 12, wageCeiling: null },
      };
      const result = computeStatutoryDeductions({ basicSalary: 20000, grossSalary: 20000, policy });
      expect(result.providentFundEmployee).toBe(0);
    });
  });

  describe('professional tax', () => {
    const policy: StatutoryDeductionPolicy = {
      ...disabledPolicy,
      professionalTax: {
        enabled: true,
        slabs: [
          { minGross: 0, maxGross: 15000, amount: 0 },
          { minGross: 15001, maxGross: 25000, amount: 150 },
          { minGross: 25001, maxGross: null, amount: 200 },
        ],
      },
    };

    it('picks the matching slab for gross salary', () => {
      expect(computeStatutoryDeductions({ basicSalary: 0, grossSalary: 10000, policy }).professionalTax).toBe(0);
      expect(computeStatutoryDeductions({ basicSalary: 0, grossSalary: 20000, policy }).professionalTax).toBe(150);
      expect(computeStatutoryDeductions({ basicSalary: 0, grossSalary: 100000, policy }).professionalTax).toBe(200);
    });

    it('falls back to 0 when gross salary matches no slab (gap in configuration)', () => {
      const gappedPolicy: StatutoryDeductionPolicy = {
        ...policy,
        professionalTax: { enabled: true, slabs: [{ minGross: 0, maxGross: 10000, amount: 50 }] },
      };
      expect(computeStatutoryDeductions({ basicSalary: 0, grossSalary: 20000, policy: gappedPolicy }).professionalTax).toBe(0);
    });

    it('sorts unordered slabs defensively before matching', () => {
      const unorderedPolicy: StatutoryDeductionPolicy = {
        ...policy,
        professionalTax: {
          enabled: true,
          slabs: [
            { minGross: 25001, maxGross: null, amount: 200 },
            { minGross: 0, maxGross: 15000, amount: 0 },
            { minGross: 15001, maxGross: 25000, amount: 150 },
          ],
        },
      };
      expect(computeStatutoryDeductions({ basicSalary: 0, grossSalary: 20000, policy: unorderedPolicy }).professionalTax).toBe(150);
    });
  });

  describe('income tax estimate', () => {
    const policy: StatutoryDeductionPolicy = {
      ...disabledPolicy,
      incomeTax: {
        enabled: true,
        standardDeductionAnnual: 50000,
        annualSlabs: [
          { upToAnnual: 300000, ratePercent: 0 },
          { upToAnnual: 700000, ratePercent: 5 },
          { upToAnnual: null, ratePercent: 20 },
        ],
      },
    };

    it('is zero when annualized taxable income falls entirely in a 0% slab', () => {
      // 20000/mo x 12 = 240000 annual, minus 50000 standard deduction = 190000 — under the 300000 threshold.
      const result = computeStatutoryDeductions({ basicSalary: 0, grossSalary: 20000, policy });
      expect(result.incomeTaxEstimateMonthly).toBe(0);
    });

    it('applies progressive rates across slab boundaries, not a flat top rate', () => {
      // 60000/mo x 12 = 720000 annual, minus 50000 = 670000 taxable.
      // 0% on first 300000, 5% on next 370000 (up to 670000) = 18500/yr => 1541.67/mo.
      const result = computeStatutoryDeductions({ basicSalary: 0, grossSalary: 60000, policy });
      expect(result.incomeTaxEstimateMonthly).toBeCloseTo(1541.67, 1);
    });

    it('applies the open-ended top slab rate beyond its lower bound', () => {
      // 100000/mo x 12 = 1200000 annual, minus 50000 = 1150000 taxable.
      // 0% on 300000, 5% on next 400000 (=20000), 20% on remaining 450000 (=90000) = 110000/yr => 9166.67/mo.
      const result = computeStatutoryDeductions({ basicSalary: 0, grossSalary: 100000, policy });
      expect(result.incomeTaxEstimateMonthly).toBeCloseTo(9166.67, 1);
    });

    it('is a no-op when disabled', () => {
      const disabled: StatutoryDeductionPolicy = { ...policy, incomeTax: { ...policy.incomeTax, enabled: false } };
      const result = computeStatutoryDeductions({ basicSalary: 0, grossSalary: 100000, policy: disabled });
      expect(result.incomeTaxEstimateMonthly).toBe(0);
    });
  });

  it('sums all three components into totalStatutoryDeductions', () => {
    const policy: StatutoryDeductionPolicy = {
      providentFund: { enabled: true, employeeRatePercent: 12, wageCeiling: null },
      professionalTax: { enabled: true, slabs: [{ minGross: 0, maxGross: null, amount: 200 }] },
      incomeTax: { enabled: false, standardDeductionAnnual: 0, annualSlabs: [] },
    };
    const result = computeStatutoryDeductions({ basicSalary: 20000, grossSalary: 20000, policy });
    expect(result.providentFundEmployee).toBe(2400);
    expect(result.professionalTax).toBe(200);
    expect(result.incomeTaxEstimateMonthly).toBe(0);
    expect(result.totalStatutoryDeductions).toBe(2600);
  });
});
