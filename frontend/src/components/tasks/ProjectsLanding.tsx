import React from 'react';
import { Layers, Plus, Briefcase, ArrowUpRight } from 'lucide-react';

export function ProjectsLanding({
  projects,
  loadingProjects,
  isWritePermitted,
  onSelectProject,
  onCreateProject,
}: {
  projects: any[] | undefined;
  loadingProjects: boolean;
  isWritePermitted: boolean;
  onSelectProject: (proj: any) => void;
  onCreateProject: () => void;
}) {
  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <Layers className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black tracking-tight text-slate-850 dark:text-slate-100">
              Projects Directory
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-normal">
            Select a workspace from the list below to access its Kanban tasks, month calendar agendas, and Gantt charts.
          </p>
        </div>
        {isWritePermitted && (
          <button
            onClick={onCreateProject}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {loadingProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/10 space-y-4 animate-pulse-slow">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border rounded-3xl bg-slate-50/10 dark:bg-slate-900/5 border-dashed">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <Briefcase className="h-10 w-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No projects created yet</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-normal">
              Get started by creating your first project workspace directory.
            </p>
          </div>
          <button onClick={onCreateProject} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md">
            Initialize Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((proj: any) => {
            const totalTasks = proj.tasks?.length || 0;
            const completedTasks = proj.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="group border rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 text-left relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-100 dark:bg-slate-800 group-hover:bg-primary transition-all" />

                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 group-hover:text-primary transition-all">
                      {proj.name}
                    </h4>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-450 uppercase tracking-wide">
                      {proj.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                    <span>
                      Tasks: {completedTasks}/{totalTasks} ({progressPercentage}%)
                    </span>
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center space-x-0.5">
                      <span>Open Workspace</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
