import React from 'react';

export function ChatTab({ stats }: { stats: any }) {
  const { chatAnalytics } = stats;
  const counts = chatAnalytics.chatHistory.map((d: any) => d.count);
  const maxCount = Math.max(...counts, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center justify-between">
          Message History (Last 7 Days)
          <span className="text-xs text-slate-400 font-bold">Average Reply Speed: {chatAnalytics.avgChatResponseMinutes} mins</span>
        </h4>

        {chatAnalytics.chatHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-12 text-center">No chat logs recorded.</p>
        ) : (
          <div className="w-full h-48 border-b border-l flex items-end justify-between px-4 pb-1 relative">
            {chatAnalytics.chatHistory.map((day: any, idx: number) => {
              const heightPct = (day.count / maxCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end px-2">
                  <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                    {day.count} messages
                  </div>
                  <div className="w-8 bg-primary rounded-t-lg transition-all group-hover:bg-primary-dark" style={{ height: `${Math.max(4, heightPct)}%` }} />
                  <span className="text-[10px] font-bold text-slate-400 mt-2 truncate w-full text-center">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
