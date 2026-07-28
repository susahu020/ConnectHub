import React from 'react';
import { parseMarkdown } from './markdownParser';
import { getCategoryBadgeColor } from './categoryBadgeColor';

export function WikiViewer({ pageDetails }: { pageDetails: any }) {
  return (
    <div className="space-y-6 text-left leading-relaxed max-w-3xl mx-auto">
      <div className="space-y-2 border-b dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{pageDetails?.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
          <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${getCategoryBadgeColor(pageDetails?.category)}`}>
            {pageDetails?.category}
          </span>
          <span>•</span>
          <span>Version {pageDetails?.versions?.[0]?.version || 1}</span>
          <span>•</span>
          <span>Updated: {new Date(pageDetails?.updatedAt || '').toLocaleString()}</span>
          {!pageDetails?.isPublished && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-black uppercase text-[10px]">Draft</span>
            </>
          )}
        </div>
      </div>

      <div
        className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs leading-relaxed"
        dangerouslySetInnerHTML={{ __html: parseMarkdown(pageDetails?.content || '') }}
      />
    </div>
  );
}
