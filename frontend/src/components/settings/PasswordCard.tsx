import React from 'react';
import { Lock, Loader2 } from 'lucide-react';

export function PasswordCard({
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  loading,
  onSubmit,
}: {
  currentPassword: string;
  onCurrentPasswordChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center space-x-2">
        <Lock className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-sm">Security & Password</h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
        <div className="space-y-2">
          <label className="text-slate-400 uppercase text-[10px] tracking-wider">Current Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px] tracking-wider">New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px] tracking-wider">Confirm Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Update Password</span>
        </button>
      </form>
    </div>
  );
}
