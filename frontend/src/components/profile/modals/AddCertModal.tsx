import React from 'react';
import { X } from 'lucide-react';

export function AddCertModal({
  open,
  onClose,
  form,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  form: any;
  onFormChange: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs font-semibold">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-black text-foreground">Add Professional Certificate</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Certificate Name</label>
            <input
              type="text"
              required
              placeholder="e.g. AWS Certified Solutions Architect"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Issued By</label>
            <input
              type="text"
              required
              placeholder="e.g. Amazon Web Services, Google"
              value={form.issuedBy}
              onChange={(e) => onFormChange({ ...form, issuedBy: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">Issue Date</label>
              <input
                type="date"
                required
                value={form.issueDate}
                onChange={(e) => onFormChange({ ...form, issueDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground uppercase text-[10px]">Expiry Date (Optional)</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => onFormChange({ ...form, expiryDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground uppercase text-[10px]">Credential URL</label>
            <input
              type="url"
              placeholder="e.g. https://badges.aws.amazon.com/..."
              value={form.credentialUrl}
              onChange={(e) => onFormChange({ ...form, credentialUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl">
              Add Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
