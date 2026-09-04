'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';

export interface ConditionRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

const OPERATOR_LABELS: Record<ConditionRule['operator'], string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  greater_than: 'is greater than',
  less_than: 'is less than',
};

// Previously a workflow's conditions were either empty (matches
// everything) or, for exactly one trigger, a single department picker —
// there was no way to combine multiple conditions, or to use anything but
// exact equality. This builds the {logic: 'ALL'|'ANY', rules: [...]}
// shape that automation.service.ts's conditionsMatch() now understands,
// alongside the older flat format it still reads for backward
// compatibility.
export function ConditionRuleBuilder({
  availableFields,
  logic,
  onLogicChange,
  rules,
  onRulesChange,
}: {
  /** Field names available for the currently-selected trigger — see
   *  TRIGGER_FIELDS in workflows/page.tsx. */
  availableFields: { value: string; label: string }[];
  logic: 'ALL' | 'ANY';
  onLogicChange: (logic: 'ALL' | 'ANY') => void;
  rules: ConditionRule[];
  onRulesChange: (rules: ConditionRule[]) => void;
}) {
  const addRule = () => {
    onRulesChange([...rules, { field: availableFields[0]?.value || '', operator: 'equals', value: '' }]);
  };

  const updateRule = (index: number, patch: Partial<ConditionRule>) => {
    onRulesChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground uppercase text-[9px] tracking-wider">
          Conditions (optional)
        </label>
        {rules.length >= 2 && (
          <div className="flex items-center gap-1 bg-muted dark:bg-card border rounded-lg p-0.5">
            {(['ALL', 'ANY'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onLogicChange(opt)}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                  logic === opt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Match {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {rules.length === 0 && (
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          No conditions — this automation runs every time the trigger fires.
        </p>
      )}

      {rules.map((rule, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <select
            value={rule.field}
            onChange={(e) => updateRule(i, { field: e.target.value })}
            className="flex-1 min-w-0 px-2 py-2 rounded-lg border bg-muted dark:bg-card focus:outline-none text-[10px] font-bold"
          >
            {availableFields.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={rule.operator}
            onChange={(e) => updateRule(i, { operator: e.target.value as ConditionRule['operator'] })}
            className="w-28 shrink-0 px-2 py-2 rounded-lg border bg-muted dark:bg-card focus:outline-none text-[10px] font-bold"
          >
            {Object.entries(OPERATOR_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            value={rule.value}
            onChange={(e) => updateRule(i, { value: e.target.value })}
            placeholder="Value"
            className="flex-1 min-w-0 px-2 py-2 rounded-lg border bg-muted dark:bg-card focus:outline-none text-[10px] font-bold"
          />
          <button
            type="button"
            onClick={() => removeRule(i)}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
      >
        <Plus className="h-3 w-3" />
        Add condition
      </button>
    </div>
  );
}
