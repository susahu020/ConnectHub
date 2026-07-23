import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarMonthGrid({
  year,
  month,
  matrix,
  getEventsForDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectEvent,
}: {
  year: number;
  month: number;
  matrix: (number | null)[];
  getEventsForDay: (day: number) => any[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectEvent: (event: any) => void;
}) {
  return (
    <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center space-x-1.5">
          <button onClick={onPrevMonth} aria-label="Previous month" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onToday} className="px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all">
            Today
          </button>
          <button onClick={onNextMonth} aria-label="Next month" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 border-t dark:border-slate-800 pt-3">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 py-1.5">
            {d}
          </div>
        ))}

        {matrix.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="h-28 bg-slate-50/20 dark:bg-slate-800/10 rounded-2xl border border-transparent" />;
          }

          const dayEvents = getEventsForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              className={`h-28 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-all hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md ${
                isToday ? 'bg-primary/5 border-primary/20 dark:border-primary/30' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-extrabold flex items-center justify-center h-5 w-5 rounded-full ${
                    isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-350'
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black text-slate-500">
                    {dayEvents.length} items
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 scrollbar-none text-[9px] leading-tight text-left">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={`w-full text-left truncate px-1 py-0.5 rounded font-semibold transition-all hover:opacity-90 ${ev.color}`}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-slate-400 italic text-center font-semibold">+ {dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
