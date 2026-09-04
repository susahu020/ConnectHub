import { conditionsMatch } from '../automation.service';

describe('conditionsMatch', () => {
  describe('no conditions / empty conditions', () => {
    it('matches when conditions is null/undefined', () => {
      expect(conditionsMatch(null, { priority: 'HIGH' })).toBe(true);
      expect(conditionsMatch(undefined, { priority: 'HIGH' })).toBe(true);
    });

    it('matches when conditions is an empty object', () => {
      expect(conditionsMatch({}, { priority: 'HIGH' })).toBe(true);
    });
  });

  describe('legacy flat format (AND-only equality)', () => {
    it('matches when every key equals the payload value', () => {
      expect(conditionsMatch({ priority: 'HIGH' }, { priority: 'HIGH' })).toBe(true);
      expect(
        conditionsMatch({ priority: 'HIGH', department: 'Sales' }, { priority: 'HIGH', department: 'Sales' })
      ).toBe(true);
    });

    it('fails when any key does not equal the payload value', () => {
      expect(conditionsMatch({ priority: 'HIGH' }, { priority: 'LOW' })).toBe(false);
      expect(
        conditionsMatch({ priority: 'HIGH', department: 'Sales' }, { priority: 'HIGH', department: 'Engineering' })
      ).toBe(false);
    });

    it('fails when the payload is missing a required key', () => {
      expect(conditionsMatch({ priority: 'HIGH' }, {})).toBe(false);
    });
  });

  describe('rule-group format — ALL (AND)', () => {
    it('matches only when every rule passes', () => {
      const conditions = {
        logic: 'ALL',
        rules: [
          { field: 'priority', operator: 'equals', value: 'HIGH' },
          { field: 'department', operator: 'not_equals', value: 'Sales' },
        ],
      };
      expect(conditionsMatch(conditions, { priority: 'HIGH', department: 'Engineering' })).toBe(true);
      expect(conditionsMatch(conditions, { priority: 'HIGH', department: 'Sales' })).toBe(false);
      expect(conditionsMatch(conditions, { priority: 'LOW', department: 'Engineering' })).toBe(false);
    });

    it('defaults to ALL when logic is omitted', () => {
      const conditions = { rules: [{ field: 'priority', operator: 'equals', value: 'HIGH' }] };
      expect(conditionsMatch(conditions, { priority: 'HIGH' })).toBe(true);
      expect(conditionsMatch(conditions, { priority: 'LOW' })).toBe(false);
    });
  });

  describe('rule-group format — ANY (OR)', () => {
    it('matches when at least one rule passes', () => {
      const conditions = {
        logic: 'ANY',
        rules: [
          { field: 'priority', operator: 'equals', value: 'URGENT' },
          { field: 'priority', operator: 'equals', value: 'HIGH' },
        ],
      };
      expect(conditionsMatch(conditions, { priority: 'HIGH' })).toBe(true);
      expect(conditionsMatch(conditions, { priority: 'URGENT' })).toBe(true);
      expect(conditionsMatch(conditions, { priority: 'LOW' })).toBe(false);
    });

    it('empty rules array always matches, regardless of logic', () => {
      expect(conditionsMatch({ logic: 'ANY', rules: [] }, { priority: 'LOW' })).toBe(true);
      expect(conditionsMatch({ logic: 'ALL', rules: [] }, { priority: 'LOW' })).toBe(true);
    });
  });

  describe('rule-group operators', () => {
    it('contains matches a substring of a string field', () => {
      const rule = { logic: 'ALL', rules: [{ field: 'title', operator: 'contains', value: 'urgent' }] };
      expect(conditionsMatch(rule, { title: 'This is urgent!' })).toBe(true);
      expect(conditionsMatch(rule, { title: 'Not important' })).toBe(false);
    });

    it('greater_than and less_than compare numeric fields', () => {
      const gt = { logic: 'ALL', rules: [{ field: 'amount', operator: 'greater_than', value: 100 }] };
      expect(conditionsMatch(gt, { amount: 150 })).toBe(true);
      expect(conditionsMatch(gt, { amount: 50 })).toBe(false);

      const lt = { logic: 'ALL', rules: [{ field: 'amount', operator: 'less_than', value: 100 }] };
      expect(conditionsMatch(lt, { amount: 50 })).toBe(true);
      expect(conditionsMatch(lt, { amount: 150 })).toBe(false);
    });

    it('numeric operators never match a non-numeric field, rather than throwing', () => {
      const gt = { logic: 'ALL', rules: [{ field: 'amount', operator: 'greater_than', value: 100 }] };
      expect(() => conditionsMatch(gt, { amount: 'not a number' })).not.toThrow();
      expect(conditionsMatch(gt, { amount: 'not a number' })).toBe(false);
    });
  });
});
