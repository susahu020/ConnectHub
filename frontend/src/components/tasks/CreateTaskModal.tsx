import React from 'react';
import { X } from 'lucide-react';

export function CreateTaskModal({
  open,
  onClose,
  projectName,
  onSubmit,
  colleagues,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  assigneeId,
  onAssigneeIdChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  estimatedHours,
  onEstimatedHoursChange,
  labelsInput,
  onLabelsInputChange,
  sprintName,
  onSprintNameChange,
  milestoneName,
  onMilestoneNameChange,
  isRecurring,
  onIsRecurringChange,
  recurrenceInterval,
  onRecurrenceIntervalChange,
  watcherIds,
  onWatcherIdsChange,
}: {
  open: boolean;
  onClose: () => void;
  projectName?: string;
  onSubmit: (e: React.FormEvent) => void;
  colleagues: any;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  assigneeId: string;
  onAssigneeIdChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  estimatedHours: string;
  onEstimatedHoursChange: (v: string) => void;
  labelsInput: string;
  onLabelsInputChange: (v: string) => void;
  sprintName: string;
  onSprintNameChange: (v: string) => void;
  milestoneName: string;
  onMilestoneNameChange: (v: string) => void;
  isRecurring: boolean;
  onIsRecurringChange: (v: boolean) => void;
  recurrenceInterval: string;
  onRecurrenceIntervalChange: (v: string) => void;
  watcherIds: string[];
  onWatcherIdsChange: (v: string[]) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl relative scrollbar-thin text-left">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-850 dark:text-slate-200">Assign New Task</h3>
          <p className="text-xs text-slate-400">
            Initialize task for: <span className="font-bold text-primary">{projectName}</span>
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Draft UI Wireframes"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Description</label>
            <textarea
              placeholder="Specify core scopes and requirements of task..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Assigned Employee</label>
              <select
                required
                value={assigneeId}
                onChange={(e) => onAssigneeIdChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              >
                <option value="">-- Choose Employee --</option>
                {colleagues?.users?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Task Priority</label>
              <select
                value={priority}
                onChange={(e) => onPriorityChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 uppercase text-[10px]">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Sprint Name</label>
              <input
                type="text"
                placeholder="e.g. Sprint 1"
                value={sprintName}
                onChange={(e) => onSprintNameChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Milestone</label>
              <input
                type="text"
                placeholder="e.g. Beta release"
                value={milestoneName}
                onChange={(e) => onMilestoneNameChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 12"
                value={estimatedHours}
                onChange={(e) => onEstimatedHoursChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-slate-400 uppercase text-[10px]">Labels (Comma separated)</label>
              <input
                type="text"
                placeholder="e.g. bug, high-priority"
                value={labelsInput}
                onChange={(e) => onLabelsInputChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => onIsRecurringChange(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Is Recurring</span>
            </label>
            {isRecurring && (
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Interval</label>
                <select
                  value={recurrenceInterval}
                  onChange={(e) => onRecurrenceIntervalChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            <label className="text-slate-400 uppercase text-[10px] block">Select Watchers</label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border scrollbar-thin">
              {colleagues?.users?.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic col-span-2">No watchers found.</p>
              ) : (
                colleagues?.users?.map((u: any) => (
                  <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1.5 rounded-lg transition-all">
                    <input
                      type="checkbox"
                      checked={watcherIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onWatcherIdsChange([...watcherIds, u.id]);
                        } else {
                          onWatcherIdsChange(watcherIds.filter((id) => id !== u.id));
                        }
                      }}
                      className="rounded border-slate-350 text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="text-[10px] font-semibold truncate text-slate-700 dark:text-slate-350">
                      {u.firstName} {u.lastName}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/95 transition-all">
            Allocate Task
          </button>
        </form>
      </div>
    </div>
  );
}
