'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordStrength } from '../../lib/passwordPolicy';

// Live visual strength meter + rule checklist shown under a "new password"
// field. Reuses the same rule set the server enforces (see
// backend/src/utils/passwordPolicy.ts and the mirrored client copy in
// lib/passwordPolicy.ts) so a user finds out a password is too weak/common
// while typing, not only after submitting and getting a 400 back.
//
// Renders nothing for an empty password so it doesn't clutter an untouched
// form — it only appears once the person starts typing.
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, rules } = getPasswordStrength(password);

  const barColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];
  const labelColors = [
    'text-red-500', 'text-red-500', 'text-amber-500', 'text-lime-600', 'text-emerald-600',
  ];

  return (
    <div className="space-y-2 pt-1" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? barColors[score] : 'bg-muted dark:bg-card'
            }`}
          />
        ))}
        <span className={`text-[10px] font-bold uppercase tracking-wider w-16 text-right ${labelColors[score]}`}>
          {label}
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 text-[10px] font-medium ${
              rule.met ? 'text-emerald-600 dark:text-emerald-500' : 'text-muted-foreground'
            }`}
          >
            {rule.met ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <X className="h-3 w-3 shrink-0 opacity-40" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
