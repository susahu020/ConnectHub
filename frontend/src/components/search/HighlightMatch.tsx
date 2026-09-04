import React from 'react';

// Previously no search result anywhere (the TopBar dropdown or otherwise)
// showed *why* something matched — a title or subtitle rendered as plain
// text even when the match was buried in the middle of it. Wraps every
// case-insensitive occurrence of `query` in <mark> so it's visually
// obvious what matched, same idea as browser Ctrl+F highlighting.
export function HighlightMatch({ text, query, className }: { text: string; query: string; className?: string }) {
  if (!query.trim()) return <span className={className}>{text}</span>;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
