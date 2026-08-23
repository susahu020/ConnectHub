import React from 'react';
import { Bold, Italic, Quote, Code, List, ListOrdered, CheckSquare, Link as LinkIcon, Table, Info } from 'lucide-react';
import { parseMarkdown } from './markdownParser';

const TOOLBAR_BUTTONS = [
  { id: 'bold', icon: <Bold className="h-3.5 w-3.5" />, title: 'Bold' },
  { id: 'italic', icon: <Italic className="h-3.5 w-3.5" />, title: 'Italic' },
  { id: 'h1', label: 'H1', title: 'Header 1' },
  { id: 'h2', label: 'H2', title: 'Header 2' },
  { id: 'h3', label: 'H3', title: 'Header 3' },
  { id: 'blockquote', icon: <Quote className="h-3.5 w-3.5" />, title: 'Blockquote' },
  { id: 'code', icon: <Code className="h-3.5 w-3.5" />, title: 'Code Block' },
  { id: 'list-bullet', icon: <List className="h-3.5 w-3.5" />, title: 'Bullet List' },
  { id: 'list-number', icon: <ListOrdered className="h-3.5 w-3.5" />, title: 'Numbered List' },
  { id: 'list-check', icon: <CheckSquare className="h-3.5 w-3.5" />, title: 'Task List' },
  { id: 'link', icon: <LinkIcon className="h-3.5 w-3.5" />, title: 'Hyperlink' },
  { id: 'table', icon: <Table className="h-3.5 w-3.5" />, title: 'Table Grid' },
];

export function WikiEditor({
  categories,
  editCategory,
  onEditCategoryChange,
  editIsPublished,
  onEditIsPublishedChange,
  editTitle,
  onEditTitleChange,
  previewTab,
  onPreviewTabChange,
  editContent,
  onEditContentChange,
  onApplyFormat,
  textareaRef,
}: {
  categories: string[];
  editCategory: string;
  onEditCategoryChange: (v: string) => void;
  editIsPublished: boolean;
  onEditIsPublishedChange: (v: boolean) => void;
  editTitle: string;
  onEditTitleChange: (v: string) => void;
  previewTab: 'write' | 'preview' | 'split';
  onPreviewTabChange: (v: 'write' | 'preview' | 'split') => void;
  editContent: string;
  onEditContentChange: (v: string) => void;
  onApplyFormat: (formatType: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Category Tag</label>
          <select
            value={editCategory}
            onChange={(e) => onEditCategoryChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 flex flex-col justify-end pb-2">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editIsPublished}
              onChange={(e) => onEditIsPublishedChange(e.target.checked)}
              className="rounded border-slate-350 text-primary h-4 w-4 focus:ring-primary"
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Publish Document</span>
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Document Title</label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-sm font-black"
          placeholder="e.g. Employee Travel Allowance Policy"
        />
      </div>

      <div className="border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="flex flex-wrap items-center justify-between border-b dark:border-slate-800 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 gap-2 shrink-0">
          <div className="flex border-b pb-0 gap-1">
            {(['write', 'preview', 'split'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onPreviewTabChange(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                  previewTab === tab
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border dark:border-slate-700'
                    : 'text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                {tab === 'split' ? 'Split View' : tab}
              </button>
            ))}
          </div>

          {previewTab !== 'preview' && (
            <div className="flex items-center space-x-0.5 bg-white dark:bg-slate-900 p-0.5 rounded-lg border dark:border-slate-800 overflow-x-auto max-w-full">
              {TOOLBAR_BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onApplyFormat(btn.id)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-505 hover:text-slate-850 dark:hover:text-slate-100 text-[10px] font-black w-6 h-6 flex items-center justify-center"
                  title={btn.title}
                >
                  {btn.icon || btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[420px] flex flex-col">
          {previewTab === 'write' && (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full flex-grow px-4 py-3 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs font-mono h-[420px] resize-none leading-relaxed"
              placeholder="# Write markdown document details..."
            />
          )}

          {previewTab === 'preview' && (
            <div className="flex-grow p-6 bg-transparent overflow-y-auto text-left leading-relaxed text-xs max-h-[420px]">
              <div
                className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(editContent) }}
              />
            </div>
          )}

          {previewTab === 'split' && (
            <div className="grid grid-cols-2 divide-x dark:divide-slate-800 h-[420px]">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full h-full px-4 py-3 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs font-mono resize-none leading-relaxed"
                placeholder="# Write markdown document details..."
              />
              <div className="h-full p-6 overflow-y-auto text-left leading-relaxed text-xs bg-slate-50/30 dark:bg-slate-900/30">
                <div
                  className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(editContent) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>
          Use standard markdown style rules. Switch to <strong>Split View</strong> or <strong>Preview</strong> tabs to review tables,
          checklists, and code formatting in real-time.
        </span>
      </div>
    </div>
  );
}
