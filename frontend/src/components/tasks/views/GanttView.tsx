import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GANTT_GROUPS = [
  { title: 'To Do', status: 'TODO', color: 'border-l-slate-400 bg-slate-100/20 text-slate-550' },
  { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-l-primary bg-primary/5 text-primary' },
  { title: 'In Review', status: 'REVIEW', color: 'border-l-orange-400 bg-orange-50/5 text-orange-500' },
  { title: 'Completed', status: 'COMPLETED', color: 'border-l-green-400 bg-green-50/5 text-green-500' },
];

function getGanttBarColors(priority: string) {
  switch (priority) {
    case 'LOW':
      return 'bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400';
    case 'HIGH':
      return 'bg-orange-500/15 border-orange-500/30 text-orange-650 dark:text-orange-400';
    case 'URGENT':
      return 'bg-red-500/15 border-red-500/30 text-red-650 dark:text-red-400';
    default:
      return 'bg-primary/15 border-primary/30 text-primary dark:text-primary';
  }
}

export function GanttView({
  currentDate,
  ganttDaysCount,
  ganttDaysArray,
  loadingTasks,
  filteredTasks,
  collapsedSections,
  onToggleSection,
  onPrevMonth,
  onNextMonth,
  onOpenTaskDetail,
}: {
  currentDate: Date;
  ganttDaysCount: number;
  ganttDaysArray: number[];
  loadingTasks: boolean;
  filteredTasks: any[];
  collapsedSections: Record<string, boolean>;
  onToggleSection: (status: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenTaskDetail: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-x-auto p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-4 shrink-0 min-w-[900px]">
        <div className="space-y-1 text-left">
          <h3 className="font-black text-sm uppercase tracking-wide text-slate-850 dark:text-slate-200">
            Gantt Project Timeline Schedule
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Active Month: {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button onClick={onPrevMonth} aria-label="Previous month" className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNextMonth} aria-label="Next month" className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-w-[950px] space-y-4">
        <div className="flex items-center border-b pb-2 shrink-0">
          <div className="w-60 text-[10px] font-extrabold uppercase text-slate-400 shrink-0">Task Name & Assignee</div>
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${ganttDaysCount}, minmax(40px, 1fr))` }}>
            {ganttDaysArray.map((dayNum) => (
              <span key={dayNum} className="text-[10px] text-center text-slate-400 font-black">
                {dayNum}
              </span>
            ))}
          </div>
        </div>

        {loadingTasks ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center space-x-4 animate-pulse-slow">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 shrink-0" />
                <div className="flex-grow h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          GANTT_GROUPS.map((grp) => {
            const groupTasks = filteredTasks.filter((t: any) => t.status === grp.status);
            const isCollapsed = collapsedSections[grp.status] || false;

            return (
              <div key={grp.status} className="space-y-1.5 border rounded-xl overflow-hidden shadow-xs">
                <div
                  onClick={() => onToggleSection(grp.status)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-b select-none transition-all ${grp.color}`}
                >
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider">
                    <ChevronRight className={`h-4 w-4 transform transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                    <span>{grp.title}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-extrabold">{groupTasks.length}</span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {groupTasks.length === 0 ? (
                      <div className="p-4 text-center text-[10px] text-slate-400 italic">No tasks in this stage</div>
                    ) : (
                      groupTasks.map((t: any) => {
                        const created = new Date(t.createdAt);
                        const due = t.dueDate ? new Date(t.dueDate) : created;
                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();

                        let startDay = 1;
                        if (created.getFullYear() === year && created.getMonth() === month) {
                          startDay = created.getDate();
                        }

                        let endDay = ganttDaysCount;
                        if (due.getFullYear() === year && due.getMonth() === month) {
                          endDay = due.getDate();
                        }

                        const span = Math.max(1, endDay - startDay + 1);

                        return (
                          <div key={t.id} className="flex items-center hover:bg-slate-50/30 dark:hover:bg-slate-800/5 shrink-0 transition-colors">
                            <div className="w-60 px-4 py-3 flex items-center space-x-3 shrink-0 text-left border-r dark:border-slate-800/50 h-full min-h-[50px]">
                              <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] uppercase text-slate-500 border overflow-hidden shrink-0">
                                {t.assignee?.firstName[0]}
                                {t.assignee?.lastName[0]}
                              </div>
                              <div className="min-w-0">
                                <p
                                  onClick={() => onOpenTaskDetail(t.id)}
                                  className="text-xs font-bold truncate text-slate-700 dark:text-slate-350 cursor-pointer hover:text-primary hover:underline leading-tight"
                                  title={t.title}
                                >
                                  {t.title}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-none mt-1">
                                  Assignee: {t.assignee?.firstName} {t.assignee?.lastName}
                                </p>
                              </div>
                            </div>

                            <div className="flex-1 grid relative h-full min-h-[50px]" style={{ gridTemplateColumns: `repeat(${ganttDaysCount}, minmax(40px, 1fr))` }}>
                              {ganttDaysArray.map((dayNum) => {
                                const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                  <div
                                    key={dayNum}
                                    className={`border-r border-slate-100 dark:border-slate-800/40 h-full min-h-[50px] ${isWeekend ? 'bg-slate-50/40 dark:bg-slate-950/20' : ''}`}
                                  />
                                );
                              })}

                              {currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-20 pointer-events-none"
                                  style={{
                                    gridColumnStart: new Date().getDate(),
                                    gridColumnEnd: new Date().getDate() + 1,
                                    left: '50%',
                                  }}
                                  title="Today"
                                />
                              )}

                              <div
                                onClick={() => onOpenTaskDetail(t.id)}
                                className={`absolute top-2.5 bottom-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-all border font-bold z-10 text-[10px] shadow-2xs hover:scale-[1.01] ${getGanttBarColors(t.priority)}`}
                                style={{
                                  gridColumnStart: startDay,
                                  gridColumnEnd: startDay + span,
                                  left: '2px',
                                  right: '2px',
                                }}
                                title={`${t.title} (${t.progress}%)`}
                              >
                                <span className="truncate px-2">{t.progress}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
