import React from 'react';
import { Plus, ChevronDown, BookOpen, FileText, CheckSquare, ShieldAlert, Search } from 'lucide-react';
import { getCategoryBadgeColor } from './categoryBadgeColor';

const CORE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'wiki', label: 'Wikis' },
  { id: 'sop', label: 'SOPs' },
  { id: 'hr', label: 'HR Docs' },
  { id: 'policy', label: 'Policies' },
] as const;

export function WikiSidebar({
  createMenuOpen,
  onToggleCreateMenu,
  createDropdownRef,
  onCreateDocument,
  searchQuery,
  onSearchQueryChange,
  activeTab,
  onChangeTab,
  categories,
  selectedCategory,
  onSelectedCategoryChange,
  pages,
  selectedPageId,
  onSelectPage,
}: {
  createMenuOpen: boolean;
  onToggleCreateMenu: () => void;
  createDropdownRef: React.RefObject<HTMLDivElement | null>;
  onCreateDocument: (type: 'blank' | 'sop' | 'hr' | 'policy') => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  activeTab: 'all' | 'wiki' | 'sop' | 'hr' | 'policy';
  onChangeTab: (tab: 'all' | 'wiki' | 'sop' | 'hr' | 'policy') => void;
  categories: string[];
  selectedCategory: string;
  onSelectedCategoryChange: (v: string) => void;
  pages: any[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
}) {
  return (
    <div className="w-80 border-r dark:border-border flex flex-col shrink-0">
      <div className="p-4 border-b dark:border-border space-y-3 shrink-0">
        <div className="flex items-center justify-between relative">
          <h2 className="font-extrabold text-sm text-foreground dark:text-foreground">Knowledge Base</h2>

          <div ref={createDropdownRef} className="relative">
            <button
              onClick={onToggleCreateMenu}
              className="px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow transition-all flex items-center space-x-1 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Create</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-xl z-50 py-1.5 animate-slide-up text-xs font-semibold">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 bg-muted/50 dark:bg-card/40 mb-1 leading-tight">
                  Document Type
                </p>
                <button
                  onClick={() => onCreateDocument('blank')}
                  className="w-full text-left px-3 py-2 hover:bg-muted dark:hover:bg-card flex items-center space-x-2 text-foreground dark:text-foreground"
                >
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span>Blank Wiki Page</span>
                </button>
                <button
                  onClick={() => onCreateDocument('sop')}
                  className="w-full text-left px-3 py-2 hover:bg-muted dark:hover:bg-card flex items-center space-x-2 text-foreground dark:text-foreground"
                >
                  <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Standard SOP Document</span>
                </button>
                <button
                  onClick={() => onCreateDocument('hr')}
                  className="w-full text-left px-3 py-2 hover:bg-muted dark:hover:bg-card flex items-center space-x-2 text-foreground dark:text-foreground"
                >
                  <CheckSquare className="h-4 w-4 text-info shrink-0" />
                  <span>HR Document / Guide</span>
                </button>
                <button
                  onClick={() => onCreateDocument('policy')}
                  className="w-full text-left px-3 py-2 hover:bg-muted dark:hover:bg-card flex items-center space-x-2 text-foreground dark:text-foreground"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Company Policy</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Knowledge Base..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-muted dark:bg-card focus:outline-none"
          />
        </div>

        <div className="flex border-b pb-0.5 gap-1 select-none overflow-x-auto scrollbar-none">
          {CORE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onChangeTab(tab.id);
                if (tab.id !== 'wiki') {
                  onSelectedCategoryChange('');
                }
              }}
              className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all border border-transparent whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground hover:bg-muted dark:hover:bg-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'wiki' && (
          <select
            value={selectedCategory}
            onChange={(e) => onSelectedCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl bg-muted dark:bg-card focus:outline-none font-bold"
          >
            <option value="">All Wiki Categories</option>
            {categories
              .filter((c) => c !== 'SOP' && c !== 'Policy' && c !== 'HR')
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {pages.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <BookOpen className="h-5 w-5 text-foreground dark:text-muted-foreground mx-auto" />
            <p className="text-[10px] text-muted-foreground italic">No articles found.</p>
          </div>
        ) : (
          pages.map((p: any) => {
            const isActive = selectedPageId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPage(p.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-primary/5 text-primary border-l-4 border-l-primary'
                    : 'hover:bg-muted dark:hover:bg-card/40 text-foreground dark:text-foreground'
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-snug">{p.title}</p>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black uppercase ${getCategoryBadgeColor(p.category)}`}>{p.category}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
