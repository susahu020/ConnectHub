import React from 'react';
import { X } from 'lucide-react';
import { getPriorityBadge, isBlocked } from '../taskHelpers';
import { TaskChecklist } from './TaskChecklist';
import { TaskDiscussion } from './TaskDiscussion';
import { TaskTimeLog } from './TaskTimeLog';
import { TaskDependencies } from './TaskDependencies';
import { TaskMetadataPanel } from './TaskMetadataPanel';

export function TaskDetailDrawer({
  task,
  onClose,
  allTasks,
  colleagues,
  onInlineUpdate,
  commentValue,
  onCommentValueChange,
  onAddComment,
  newSubtaskTitle,
  onNewSubtaskTitleChange,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  logTimeMinutes,
  onLogTimeMinutesChange,
  onLogTime,
  blockerTaskId,
  onBlockerTaskIdChange,
  onAddDependency,
  onRemoveDependency,
}: {
  task: any;
  onClose: () => void;
  allTasks: any[] | undefined;
  colleagues: any;
  onInlineUpdate: (body: any) => void;
  commentValue: string;
  onCommentValueChange: (v: string) => void;
  onAddComment: (e: React.FormEvent) => void;
  newSubtaskTitle: string;
  onNewSubtaskTitleChange: (v: string) => void;
  onAddSubtask: (e: React.FormEvent) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  logTimeMinutes: string;
  onLogTimeMinutesChange: (v: string) => void;
  onLogTime: (e: React.FormEvent) => void;
  blockerTaskId: string;
  onBlockerTaskIdChange: (v: string) => void;
  onAddDependency: (e: React.FormEvent) => void;
  onRemoveDependency: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
              {task.priority}
            </span>
            {isBlocked(task) && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider text-red-500 bg-red-50">Blocked</span>
            )}
          </div>
          <h3 className="font-extrabold text-xl leading-snug">{task.title}</h3>
          <p className="text-xs text-muted-foreground">
            Task assigned to{' '}
            <span className="font-bold text-foreground">
              {task.assignee.firstName} {task.assignee.lastName}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase text-slate-400">Task Scope</h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border">
                {task.description || 'No description provided.'}
              </p>
            </div>

            <TaskChecklist
              subtasks={task.subtasks}
              onToggleSubtask={onToggleSubtask}
              onDeleteSubtask={onDeleteSubtask}
              newSubtaskTitle={newSubtaskTitle}
              onNewSubtaskTitleChange={onNewSubtaskTitleChange}
              onAddSubtask={onAddSubtask}
            />

            <TaskDiscussion
              comments={task.comments}
              commentValue={commentValue}
              onCommentValueChange={onCommentValueChange}
              onAddComment={onAddComment}
            />
          </div>

          <div className="space-y-6 border-l pl-6">
            <TaskTimeLog
              timeLogs={task.timeLogs}
              logTimeMinutes={logTimeMinutes}
              onLogTimeMinutesChange={onLogTimeMinutesChange}
              onLogTime={onLogTime}
            />

            <TaskDependencies
              dependencies={task.dependencies}
              otherTasks={allTasks}
              currentTaskId={task.id}
              blockerTaskId={blockerTaskId}
              onBlockerTaskIdChange={onBlockerTaskIdChange}
              onAddDependency={onAddDependency}
              onRemoveDependency={onRemoveDependency}
            />

            <TaskMetadataPanel task={task} colleagues={colleagues} onInlineUpdate={onInlineUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}
