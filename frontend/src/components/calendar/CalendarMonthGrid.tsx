import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface HoverInfo {
  events: any[];
  x: number;
  y: number;
}

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
  onQuickCreate,
}: {
  year: number;
  month: number;
  matrix: (number | null)[];
  getEventsForDay: (day: number) => any[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectEvent: (event: any) => void;
  /** Called with the clicked day cell's date — see calendar/page.tsx's
   *  QuickCreateEventModal for what happens next. Previously there was no
   *  way to create anything from the calendar itself; you had to go to
   *  Tasks or Meetings and come back. */
  onQuickCreate: (date: Date) => void;
}) {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const showHover = (e: React.MouseEvent<HTMLElement>, events: any[]) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverInfo({ events, x: rect.left + rect.width / 2, y: rect.top });
  };
  const hideHover = () => setHoverInfo(null);

  return (
    <div className="lg:col-span-3 bg-card dark:bg-card border border-border dark:border-border rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-extrabold text-foreground dark:text-foreground">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center space-x-1.5">
          <button onClick={onPrevMonth} aria-label="Previous month" className="p-2 hover:bg-muted dark:hover:bg-card rounded-xl border transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onToday} className="px-3.5 py-2 text-xs font-bold hover:bg-muted dark:hover:bg-card rounded-xl border transition-all">
            Today
          </button>
          <button onClick={onNextMonth} aria-label="Next month" className="p-2 hover:bg-muted dark:hover:bg-card rounded-xl border transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 border-t dark:border-border pt-3">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase text-muted-foreground py-1.5">
            {d}
          </div>
        ))}

        {matrix.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="h-28 bg-muted/20 dark:bg-card/10 rounded-2xl border border-transparent" />;
          }

          const dayEvents = getEventsForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              className={`h-28 p-2 rounded-2xl border border-border dark:border-border flex flex-col justify-between transition-all hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md group relative ${
                isToday ? 'bg-primary/5 border-primary/20 dark:border-primary/30' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-extrabold flex items-center justify-center h-5 w-5 rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground dark:text-foreground'
                  }`}
                >
                  {day}
                </span>
                <div className="flex items-center gap-1">
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] bg-muted dark:bg-card px-1.5 py-0.5 rounded font-black text-muted-foreground">
                      {dayEvents.length} items
                    </span>
                  )}
                  <button
                    onClick={() => onQuickCreate(new Date(year, month, day))}
                    aria-label={`Create a task or meeting on ${MONTH_NAMES[month]} ${day}`}
                    title="New task or meeting"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-4 w-4 rounded flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 scrollbar-none text-[9px] leading-tight text-left">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    onMouseEnter={(e) => showHover(e, [ev])}
                    onMouseLeave={hideHover}
                    className={`w-full text-left truncate px-1 py-0.5 rounded font-semibold transition-all hover:opacity-90 ${ev.color}`}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p
                    onMouseEnter={(e) => showHover(e, dayEvents.slice(3))}
                    onMouseLeave={hideHover}
                    className="text-[9px] text-muted-foreground italic text-center font-semibold cursor-default"
                  >
                    + {dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover preview: fixed-position so it escapes each day cell's
          overflow-y-auto instead of being clipped by it. */}
      {hoverInfo && (
        <div
          className="fixed z-50 pointer-events-none w-64 -translate-x-1/2 -translate-y-[calc(100%+10px)]"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-2xl p-3 divide-y divide-border dark:divide-border max-h-72 overflow-y-auto">
            {hoverInfo.events.map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.id} className="space-y-1 py-2 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <span className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${ev.dotColor}`}>
                      {Icon && <Icon className="h-3 w-3 text-foreground" />}
                    </span>
                    <p className="text-xs font-extrabold text-foreground dark:text-foreground leading-tight">{ev.title}</p>
                  </div>
                  {ev.description && (
                    <p className="text-[10px] text-muted-foreground dark:text-muted-foreground leading-snug pl-7">{ev.description}</p>
                  )}
                  {ev.meta && (
                    <p className="text-[9px] text-muted-foreground dark:text-muted-foreground font-semibold pl-7">{ev.meta}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-2.5 h-2.5 bg-card dark:bg-card border-b border-r border-border dark:border-border rotate-45 mx-auto -mt-[7px]" />
        </div>
      )}
    </div>
  );
}
