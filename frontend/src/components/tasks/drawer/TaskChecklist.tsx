import React from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';

export function TaskChecklist({
  subtasks,
  onToggleSubtask,
  onDeleteSubtask,
  newSubtaskTitle,
  onNewSubtaskTitleChange,
  onAddSubtask,
}: {
  subtasks: any[] | undefined;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  newSubtaskTitle: string;
  onNewSubtaskTitleChange: (v: string) => void;
  onAddSubtask: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t">
      <h4 className="font-bold text-xs uppercase text-slate-450 flex items-center space-x-1.5">
        <CheckSquare className="h-4 w-4 text-emerald-500" />
        <span>Checklist Items</span>
      </h4>

      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
        {!subtasks || subtasks.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic">No checklist items created.</p>
        ) : (
          subtasks.map((sub: any) => (
            <div key={sub.id} className="flex items-center justify-between p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <input
                  type="checkbox"
                  checked={sub.isCompleted}
                  onChange={() => onToggleSubtask(sub.id)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className={`truncate font-semibold ${sub.isCompleted ? 'line-through text-slate-400' : ''}`}>{sub.title}</span>
              </div>
              <button onClick={() => onDeleteSubtask(sub.id)} aria-label="Delete checklist item" className="p-1 hover:bg-red-50 text-red-500 rounded">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onAddSubtask} className="flex space-x-2">
        <input
          type="text"
          required
          placeholder="Add checklist item..."
          value={newSubtaskTitle}
          onChange={(e) => onNewSubtaskTitleChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
        />
        <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow">
          Add
        </button>
      </form>
    </div>
  );
}
