import React from 'react';

export function CelebrationWishesBanner({ wishes }: { wishes: any[] }) {
  if (wishes.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/5 border border-primary/20 rounded-3xl p-6 space-y-4 shadow-sm relative overflow-hidden text-left">
      <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl">🎂🎖️</div>
      <div className="space-y-1">
        <h2 className="text-base font-black text-foreground flex items-center gap-2">
          🎉 Teammate Celebration Wishes
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Wishes sent to you today by your colleagues. These will automatically clear tomorrow!
        </p>
      </div>

      <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wishes.map((wish: any) => (
            <div
              key={wish.id}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-border/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ring-1 ring-border">
                  {wish.sender?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wish.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${wish.sender?.firstName?.[0]}${wish.sender?.lastName?.[0]}`
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-tight">
                    {wish.sender?.firstName} {wish.sender?.lastName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{wish.sender?.designation || 'Teammate'}</p>
                </div>
              </div>
              <p className="text-xs text-foreground/80 italic pl-3 border-l-2 border-primary/30 leading-relaxed whitespace-pre-line">
                &ldquo;{wish.message}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
