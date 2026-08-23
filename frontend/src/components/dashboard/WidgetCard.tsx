import React from 'react';
import { GripVertical } from 'lucide-react';

export function WidgetCard({
  widgetKey,
  w,
  h,
  isEditing,
  isDragged,
  onDragStart,
  onDrop,
  onResize,
  children,
}: {
  widgetKey: string;
  w: number;
  h: number;
  isEditing: boolean;
  isDragged: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onResize: (type: 'w' | 'h', delta: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ gridColumn: `span ${w}`, gridRow: `span ${h}` }}
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`bg-card/70 backdrop-blur-md border border-border/70 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative ${
        isEditing
          ? 'ring-2 ring-dashed ring-primary/40 cursor-grab active:cursor-grabbing hover:border-primary/50'
          : 'hover:-translate-y-0.5'
      } ${isDragged ? 'opacity-30 scale-95 border-primary' : ''}`}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 bg-foreground/95 border border-foreground/20 p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold text-background shadow-xl z-20">
          <div className="flex items-center gap-1 px-1.5 border-r border-background/25 mr-1">
            <GripVertical className="h-3.5 w-3.5 text-background/60 shrink-0" />
            <span>DRAG</span>
          </div>
          <button
            onClick={() => onResize('w', 1)}
            className="px-1.5 py-0.5 bg-background/10 hover:bg-background/20 rounded border border-background/25"
          >
            W+
          </button>
          <button
            onClick={() => onResize('w', -1)}
            className="px-1.5 py-0.5 bg-background/10 hover:bg-background/20 rounded border border-background/25"
          >
            W-
          </button>
          <button
            onClick={() => onResize('h', 1)}
            className="px-1.5 py-0.5 bg-background/10 hover:bg-background/20 rounded border border-background/25"
          >
            H+
          </button>
          <button
            onClick={() => onResize('h', -1)}
            className="px-1.5 py-0.5 bg-background/10 hover:bg-background/20 rounded border border-background/25"
          >
            H-
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col p-5 sm:p-6">{children}</div>
    </div>
  );
}
