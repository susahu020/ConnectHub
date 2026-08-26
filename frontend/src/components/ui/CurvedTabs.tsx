'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

export interface CurvedTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface CurveMetrics {
  left: number;
  right: number;
  width: number;
  buttonHeight: number;
}

const CORNER_RADIUS = 12;
const PILL_HEADROOM = 6; // extra space between the button's own top and the drawn pill's top edge

/**
 * Builds the single baseline path: flat under every tab, rising into a
 * flat-topped rounded pill around the active one. Each corner is a
 * quadratic bezier whose control point is the sharp corner itself — that
 * guarantees the curve is tangent to both the straight segment before it
 * and the one after it (the same principle browsers use internally to
 * render `border-radius`), so there's no ambiguity about which way the
 * curve bulges, unlike an SVG arc command's sweep-flag or a plain
 * `border-radius` trick (which only ever bulges outward/convex — not the
 * concave-to-convex "flared tab" transition this needs).
 */
function buildBaselinePath({ left, right, width, buttonHeight }: CurveMetrics): string {
  const base = buttonHeight + PILL_HEADROOM - 1;
  const top = PILL_HEADROOM;
  const r = Math.min(CORNER_RADIUS, (right - left) / 2);

  return [
    `M 0 ${base}`,
    `L ${left - r} ${base}`,
    `Q ${left} ${base} ${left} ${base - r}`,
    `L ${left} ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top}`,
    `L ${right - r} ${top}`,
    `Q ${right} ${top} ${right} ${top + r}`,
    `L ${right} ${base - r}`,
    `Q ${right} ${base} ${right + r} ${base}`,
    `L ${width} ${base}`,
  ].join(' ');
}

/**
 * Horizontal tab bar with the reference design's "curved notch" active
 * state: a flat baseline under every tab, curving smoothly up into a
 * flat-topped pill around whichever tab is active, instead of just
 * underlining it. The path is computed from the actual measured position
 * of the active button (via `offsetLeft`/`offsetWidth`, which — unlike
 * `getBoundingClientRect` — stay correct if the row is horizontally
 * scrolled), so it tracks real layout rather than a guessed pixel offset.
 */
export function CurvedTabs({
  tabs,
  activeId,
  onChange,
  className = '',
}: {
  tabs: CurvedTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [metrics, setMetrics] = useState<CurveMetrics | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const activeButton = buttonRefs.current[activeId];
      if (!container || !activeButton) {
        setMetrics(null);
        return;
      }
      setMetrics({
        left: activeButton.offsetLeft,
        right: activeButton.offsetLeft + activeButton.offsetWidth,
        width: container.scrollWidth,
        buttonHeight: activeButton.offsetHeight,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // Re-measure whenever the active tab or the tab set itself changes —
    // label/icon changes can change every button's width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, tabs.map((t) => t.id).join(',')]);

  const svgHeight = metrics ? metrics.buttonHeight + PILL_HEADROOM : 0;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-end overflow-x-auto scrollbar-none pt-1.5 ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[tab.id] = el;
            }}
            onClick={() => onChange(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide leading-none transition-colors duration-200 ${
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
      <div className="min-w-[8px] flex-1" />

      {metrics && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-0 bottom-0"
          width={metrics.width}
          height={svgHeight}
          style={{ overflow: 'visible' }}
        >
          <path
            d={buildBaselinePath(metrics)}
            fill="none"
            strokeWidth={2}
            className="stroke-border dark:stroke-border"
          />
        </svg>
      )}
    </div>
  );
}
