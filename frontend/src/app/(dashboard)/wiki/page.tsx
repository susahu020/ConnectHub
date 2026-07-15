'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Trash2, 
  History, 
  Edit3, 
  Eye, 
  Save, 
  Layers, 
  Check, 
  ChevronRight, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { api } from '../../../services/api';
import { toast } from 'react-hot-toast';

export default function WikiPage() {
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write');
  const [showHistory, setShowHistory] = useState(false);

  const categories = ['General', 'Engineering', 'HR', 'Marketing', 'Sales', 'Support'];

  // Queries
  const { data: pages = [], refetch: refetchList } = useQuery({
    queryKey: ['wiki-pages', searchQuery, selectedCategory],
    queryFn: () => api.getWikiPages(searchQuery, selectedCategory),
  });

  const { data: pageDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['wiki-page-details', selectedPageId],
    queryFn: () => api.getWikiPage(selectedPageId!),
    enabled: !!selectedPageId,
  });

  // Sync editor values on page detail load
  useEffect(() => {
    if (pageDetails) {
      setEditTitle(pageDetails.title);
      setEditContent(pageDetails.content);
      setEditCategory(pageDetails.category);
      setEditIsPublished(pageDetails.isPublished);
    }
  }, [pageDetails]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => api.createWikiPage(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      setSelectedPageId(data.id);
      setIsEditing(true);
      toast.success('Wiki page created!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateWikiPage(selectedPageId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page-details', selectedPageId] });
      setIsEditing(false);
      toast.success('Wiki page saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteWikiPage(selectedPageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      setSelectedPageId(null);
      toast.success('Wiki page deleted.');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (versionId: string) => api.rollbackWikiPage(selectedPageId!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page-details', selectedPageId] });
      setShowHistory(false);
      toast.success('Version restored!');
    },
  });

  const handleCreateNew = () => {
    createMutation.mutate({
      title: 'Untitled Document',
      content: '# Untitled Document\n\nStart writing in markdown here...',
      category: 'General',
      isPublished: true,
    });
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    updateMutation.mutate({
      title: editTitle,
      content: editContent,
      category: editCategory,
      isPublished: editIsPublished,
    });
  };

  // Basic Markdown Parser helper
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-black text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-black text-slate-850 dark:text-slate-100 mt-5 mb-2 border-b pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3">$1</h1>');

    // Bold & Italics
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary bg-slate-50 dark:bg-slate-800/40 p-3 rounded-r-xl my-4 text-slate-650 dark:text-slate-300 italic">$1</blockquote>');

    // Code blocks & Inline Code
    html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/gim, '<pre class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono border dark:border-slate-700 my-4 text-slate-700 dark:text-slate-300">$1</pre>');
    html = html.replace(/\`(.*?)\`/gim, '<code class="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border text-[11px] font-mono text-primary">$1</code>');

    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li class="list-disc ml-5 mb-1">$1</li>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n$/gim, '<br />');

    return html;
  };

  return (
    <div className="flex h-[calc(100vh-100px)] border rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-left">
      {/* SIDEBAR: WIKI PAGES LIST DIRECTORY */}
      <div className="w-80 border-r dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Workspace Wiki</h2>
            <button 
              onClick={handleCreateNew}
              className="p-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg shadow transition-all flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Directory Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {pages.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <BookOpen className="h-5 w-5 text-slate-350 dark:text-slate-500 mx-auto" />
              <p className="text-[10px] text-slate-450 italic">No wiki pages found.</p>
            </div>
          ) : (
            pages.map((p: any) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPageId(p.id);
                  setIsEditing(false);
                  setShowHistory(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selectedPageId === p.id 
                    ? 'bg-primary/5 text-primary border-l-4 border-l-primary' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 ${selectedPageId === p.id ? 'text-primary' : 'text-slate-405'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-snug">{p.title}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                    {p.category} • {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT WORKSPACE */}
      <div className="flex-grow flex flex-col min-w-0">
        {!selectedPageId ? (
          <div className="flex-grow flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/10">
            <div className="text-center space-y-3 max-w-sm p-6">
              <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-850 dark:text-slate-200">ConnectHub Knowledge Base</h3>
              <p className="text-xs text-slate-450 leading-relaxed">
                Create company handbooks, engineering docs, guidelines, onboarding pages, and wiki categories with Notion-style version tracking.
              </p>
              <button 
                onClick={handleCreateNew}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Wiki Article</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Header controls bar */}
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase">
                  {editCategory}
                </span>
                <span className="text-[9px] text-slate-400 italic">
                  Last updated by: {pageDetails?.author?.firstName || 'User'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-xl border transition-all ${
                    showHistory ? 'bg-primary/5 text-primary border-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Version History Logs"
                >
                  <History className="h-4 w-4" />
                </button>

                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 border text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Article</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this wiki page permanently?')) {
                          deleteMutation.mutate();
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Area: Editor or Viewer */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Editing Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-wider text-slate-400">Category Tag</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end pb-1.5">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editIsPublished}
                            onChange={(e) => setEditIsPublished(e.target.checked)}
                            className="rounded border-slate-350 text-primary h-4 w-4"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Publish Page</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-slate-400">Document Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-sm font-black"
                        placeholder="Page Title"
                      />
                    </div>

                    {/* Edit Tabs (Write vs Preview) */}
                    <div className="flex border-b pb-1 gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewTab('write')}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                          previewTab === 'write' ? 'bg-primary/5 text-primary' : 'text-slate-400'
                        }`}
                      >
                        Write Markdown
                      </button>
                      <button
                        onClick={() => setPreviewTab('preview')}
                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                          previewTab === 'preview' ? 'bg-primary/5 text-primary' : 'text-slate-400'
                        }`}
                      >
                        Live Preview
                      </button>
                    </div>

                    {previewTab === 'write' ? (
                      <div className="space-y-1">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-mono h-96 resize-none leading-relaxed"
                          placeholder="# Write article scope..."
                        />
                        <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed">
                          <Info className="h-3.5 w-3.5 text-slate-455" />
                          <span>Standard Markdown is supported: # Header, **bold**, *italics*, &gt; quote, `code` blocks.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/10 min-h-96 text-left leading-relaxed text-xs">
                        <div 
                          className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(editContent) }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 text-left leading-relaxed">
                    {/* Render Mode */}
                    <div className="space-y-1 border-b dark:border-slate-800 pb-4">
                      <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {pageDetails?.title}
                      </h1>
                      <div className="flex items-center space-x-2.5 text-[10px] text-slate-400 font-semibold pt-1">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-black uppercase text-[8px]">
                          {pageDetails?.category}
                        </span>
                        <span>•</span>
                        <span>Version {pageDetails?.versions?.[0]?.version || 1}</span>
                        <span>•</span>
                        <span>Updated: {new Date(pageDetails?.updatedAt || '').toLocaleString()}</span>
                      </div>
                    </div>

                    <div 
                      className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(pageDetails?.content || '') }}
                    />
                  </div>
                )}
              </div>

              {/* VERSION HISTORY SIDE DRAWER */}
              {showHistory && (
                <div className="w-72 border-l dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 animate-slide-right min-h-0">
                  <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                      <History className="h-4 w-4 text-primary" />
                      <span>Version History</span>
                    </h3>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-3.5 space-y-3">
                    {pageDetails?.versions?.map((ver: any, index: number) => (
                      <div 
                        key={ver.id}
                        className="bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 shadow-sm space-y-2 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-105 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-black uppercase">
                            v{ver.version}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold">
                            {new Date(ver.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          Changed by: <span className="font-bold text-slate-750 dark:text-slate-200">{ver.changedBy?.firstName} {ver.changedBy?.lastName}</span>
                        </div>
                        {index > 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Rollback document to version ${ver.version}?`)) {
                                rollbackMutation.mutate(ver.id);
                              }
                            }}
                            className="w-full py-1 text-[9px] font-bold text-center border border-dashed border-primary/45 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            Restore Version
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
