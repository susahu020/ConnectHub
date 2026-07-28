import React from 'react';
import { X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';

export function DeleteAccountModal({
  password,
  onPasswordChange,
  deleting,
  onClose,
  onConfirm,
}: {
  password: string;
  onPasswordChange: (v: string) => void;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative animate-in fade-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-550 hover:bg-slate-100 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-bold text-sm">Delete Your Account</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          This permanently deletes your account and cannot be undone. Enter your password to confirm.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Current password"
          className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
          autoFocus
        />
        <button
          onClick={onConfirm}
          disabled={deleting || !password}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Permanently Delete My Account
        </button>
      </div>
    </div>
  );
}
