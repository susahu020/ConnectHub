import React from 'react';
import { History, Save, Edit3, Trash2 } from 'lucide-react';
import { getCategoryBadgeColor } from './categoryBadgeColor';

export function DocumentHeaderBar({
  category,
  authorFirstName,
  showHistory,
  onToggleHistory,
  isEditing,
  onSave,
  onCancel,
  onStartEdit,
  canManage,
  onDelete,
}: {
  category?: string;
  authorFirstName?: string;
  showHistory: boolean;
  onToggleHistory: () => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  canManage: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 border-b dark:border-border flex items-center justify-between gap-4 shrink-0 bg-card dark:bg-card z-10">
      <div className="flex items-center space-x-2.5">
        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getCategoryBadgeColor(category)}`}>{category}</span>
        <span className="text-[10px] text-muted-foreground italic">Last updated by: {authorFirstName || 'User'}</span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-xl border transition-all ${
            showHistory ? 'bg-primary/5 text-primary border-primary/20' : 'hover:bg-muted dark:hover:bg-card'
          }`}
          title="Version History logs"
        >
          <History className="h-4 w-4" />
        </button>

        {isEditing ? (
          <>
            <button onClick={onSave} className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 hover:bg-primary/95">
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
            <button onClick={onCancel} className="px-3.5 py-2 border text-xs font-bold rounded-xl hover:bg-muted dark:hover:bg-card">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEdit}
              className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 hover:bg-primary/95"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Article</span>
            </button>
            {canManage && (
              <button
                onClick={onDelete}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 rounded-xl transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
