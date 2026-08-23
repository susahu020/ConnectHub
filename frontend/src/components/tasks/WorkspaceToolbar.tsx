import React from 'react';
import { ArrowLeft, Briefcase, Plus, Settings, Kanban, List, CalendarDays, Activity, History } from 'lucide-react';

const VIEW_TABS = [
  { key: 'KANBAN', label: 'Kanban', icon: Kanban },
  { key: 'LIST', label: 'Flat List', icon: List },
  { key: 'CALENDAR', label: 'Calendar', icon: CalendarDays },
  { key: 'GANTT', label: 'Gantt Schedule', icon: Activity },
  { key: 'TIMELINE', label: 'Timeline', icon: History },
] as const;

export function WorkspaceToolbar({
  projects,
  loadingProjects,
  selectedProject,
  onSelectProject,
  onBackToProjects,
  isWritePermitted,
  onCreateProject,
  onOpenProjectSettings,
  viewMode,
  onChangeViewMode,
  onAddTask,
}: {
  projects: any[] | undefined;
  loadingProjects: boolean;
  selectedProject: any;
  onSelectProject: (proj: any) => void;
  onBackToProjects: () => void;
  isWritePermitted: boolean;
  onCreateProject: () => void;
  onOpenProjectSettings: () => void;
  viewMode: string;
  onChangeViewMode: (mode: any) => void;
  onAddTask: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center space-x-3 text-left">
        <button
          onClick={onBackToProjects}
          title="Back to Projects Directory"
          className="p-1.5 border rounded-lg hover:bg-muted dark:hover:bg-card text-muted-foreground dark:text-foreground flex items-center space-x-1 transition-all mr-1.5 shrink-0 font-bold text-[10px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider pr-0.5">Projects</span>
        </button>
        <Briefcase className="h-6 w-6 text-primary shrink-0" />
        <div className="relative group">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const proj = projects?.find((p: any) => p.id === e.target.value);
              if (proj) onSelectProject(proj);
            }}
            className="bg-transparent text-lg font-black focus:outline-none pr-6 cursor-pointer border-b border-dashed border-border"
          >
            {loadingProjects ? (
              <option>Loading workspaces...</option>
            ) : projects?.length === 0 ? (
              <option>No projects initialized</option>
            ) : (
              projects?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
        {isWritePermitted && (
          <>
            <button
              onClick={onCreateProject}
              title="Create Project Workspace"
              aria-label="Create project workspace"
              className="p-1 border border-primary/20 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-all ml-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenProjectSettings}
              title="Project Workspace Settings"
              aria-label="Project workspace settings"
              className="p-1 border border-border dark:border-border bg-muted dark:bg-card text-muted-foreground rounded-lg hover:bg-muted transition-all ml-1.5 shrink-0"
            >
              <Settings className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border rounded-xl overflow-hidden bg-card dark:bg-card text-xs font-bold shadow-xs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onChangeViewMode(tab.key)}
              className={`px-3 py-2 flex items-center space-x-1.5 transition-all ${
                viewMode === tab.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted dark:hover:bg-card'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {selectedProject && (
          <button
            onClick={onAddTask}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
}
