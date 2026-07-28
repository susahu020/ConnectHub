import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  currentDate,
  calendarDays,
  filteredTasks,
  onPrevMonth,
  onNextMonth,
  onOpenTaskDetail,
}: {
  currentDate: Date;
  calendarDays: (Date | null)[];
  filteredTasks: any[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenTaskDetail: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="font-black text-sm uppercase tracking-wide">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-1">
          <button onClick={onPrevMonth} aria-label="Previous month" className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNextMonth} aria-label="Next month" className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold uppercase text-slate-400 pb-2">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(90px,auto)]">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-slate-50/20 dark:bg-slate-950/20 rounded-xl" />;

          const dayStr = day.toDateString();
          const dayTasks = filteredTasks.filter((t: any) => t.dueDate && new Date(t.dueDate).toDateString() === dayStr);
          const isToday = dayStr === new Date().toDateString();

          return (
            <div
              key={idx}
              className={`border p-2 rounded-xl bg-slate-50/30 dark:bg-slate-800/10 flex flex-col space-y-1.5 ${
                isToday ? 'ring-1 ring-primary/40 border-primary/30' : ''
              }`}
            >
              <span className={`font-bold text-[10px] ${isToday ? 'text-primary' : 'text-slate-400'}`}>{day.getDate()}</span>
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px]">
                {dayTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t.id)}
                    className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold truncate cursor-pointer hover:bg-primary/20 transition-all"
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
