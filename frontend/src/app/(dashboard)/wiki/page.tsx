'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { SOP_TEMPLATE, HR_TEMPLATE, POLICY_TEMPLATE, WIKI_TEMPLATE } from '../../../components/wiki/wikiTemplates';
import { WikiSidebar } from '../../../components/wiki/WikiSidebar';
import { WikiEmptyState } from '../../../components/wiki/WikiEmptyState';
import { WikiViewer } from '../../../components/wiki/WikiViewer';
import { WikiEditor } from '../../../components/wiki/WikiEditor';
import { DocumentHeaderBar } from '../../../components/wiki/DocumentHeaderBar';
import { VersionHistoryDrawer } from '../../../components/wiki/VersionHistoryDrawer';
import { VersionPreviewModal } from '../../../components/wiki/VersionPreviewModal';

// ----------------------------------------------------
// MAIN WIKI CONTENT COMPONENT
// ----------------------------------------------------
function WikiContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { settings: orgSettings } = useOrganizationSettings();
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryId = searchParams.get('id');

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Navigation Tabs: All, Wikis, SOPs, HR Docs, Policies
  const [activeTab, setActiveTab] = useState<'all' | 'wiki' | 'sop' | 'hr' | 'policy'>('all');

  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [previewTab, setPreviewTab] = useState<'write' | 'preview' | 'split'>('write');
  const [showHistory, setShowHistory] = useState(false);

  // Modal / Dropdown states
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  const categories = ['General', 'Engineering', 'HR', 'Marketing', 'Sales', 'Support', 'SOP', 'Policy'];

  // Handle outside click to close creation dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Queries
  const { data: pages = [], refetch: refetchList } = useQuery({
    queryKey: ['wiki-pages', searchQuery, selectedCategory],
    queryFn: () => api.getWikiPages(searchQuery, selectedCategory),
  });

  const { data: pageDetails, refetch: refetchDetails, isError: pageDetailsError } = useQuery({
    queryKey: ['wiki-page-details', selectedPageId],
    queryFn: () => api.getWikiPage(selectedPageId!),
    enabled: !!selectedPageId,
    retry: false,
  });

  // URL query parameter synchronization
  useEffect(() => {
    if (queryId) {
      setSelectedPageId(queryId);
      setIsEditing(false);
      setShowHistory(false);
    }
  }, [queryId]);

  useEffect(() => {
    if (pageDetailsError) {
      toast.error("That page is a draft you don't have access to.");
      setSelectedPageId(null);
      router.push('/wiki');
    }
  }, [pageDetailsError, router]);

  const canManageSelectedPage = !!pageDetails && (pageDetails.authorId === user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER');

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
      router.push(`/wiki?id=${data.id}`);
      toast.success('Document created!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not create document.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateWikiPage(selectedPageId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page-details', selectedPageId] });
      setIsEditing(false);
      toast.success('Document saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not save document.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteWikiPage(selectedPageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      setSelectedPageId(null);
      router.push('/wiki');
      toast.success('Document deleted.');
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

  const handleCreateDocument = (type: 'blank' | 'sop' | 'hr' | 'policy') => {
    let title = 'Untitled Document';
    let content = WIKI_TEMPLATE;
    let category = 'General';

    if (type === 'sop') {
      title = 'Untitled SOP Document';
      content = SOP_TEMPLATE;
      category = 'SOP';
    } else if (type === 'hr') {
      title = 'Untitled HR Document';
      content = HR_TEMPLATE;
      category = 'HR';
    } else if (type === 'policy') {
      title = 'Untitled Policy';
      content = POLICY_TEMPLATE;
      category = 'Policy';
    }

    // Mirrors wiki.controller.ts's canCreateOrPublishWikiPage: when the
    // workspace restricts publishing to Managers/Admins, a non-moderator
    // creating a new page here would otherwise hit a 403 immediately on
    // the very first save. Defaulting to a draft instead means they land
    // straight in the editor and can keep working — a moderator can
    // publish it later, or they can un-toggle it if they turn out to have
    // publish rights after all (e.g. their role changed).
    const isModerator = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const canPublish = !orgSettings.wikiRestrictedPublishing || isModerator;

    createMutation.mutate({
      title,
      content,
      category,
      isPublished: canPublish,
    });
    setCreateMenuOpen(false);
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

  const selectPage = (id: string) => {
    setSelectedPageId(id);
    setIsEditing(false);
    setShowHistory(false);
    router.push(`/wiki?id=${id}`);
  };

  // Cursor insertion formatting helper
  const applyFormat = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editContent;

    let selectedText = text.substring(start, end);
    let replacement = '';

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || 'Heading 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Heading 2'}\n`;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || 'Heading 3'}\n`;
        break;
      case 'blockquote':
        replacement = `\n> ${selectedText || 'Blockquote'}\n`;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${selectedText || '// code here'}\n\`\`\`\n`;
        break;
      case 'list-bullet':
        replacement = `\n- ${selectedText || 'list item'}\n`;
        break;
      case 'list-number':
        replacement = `\n1. ${selectedText || 'list item'}\n`;
        break;
      case 'list-check':
        replacement = `\n- [ ] ${selectedText || 'task item'}\n`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](https://example.com)`;
        break;
      case 'table':
        replacement = `\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n`;
        break;
      default:
        return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setEditContent(newContent);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      const offset = replacement.length;
      textarea.setSelectionRange(start + offset, start + offset);
    }, 50);
  };

  // Tab Filtering
  const filteredPages = pages.filter((p: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'sop') return p.category === 'SOP';
    if (activeTab === 'hr') return p.category === 'HR';
    if (activeTab === 'policy') return p.category === 'Policy';
    if (activeTab === 'wiki') {
      return p.category !== 'SOP' && p.category !== 'HR' && p.category !== 'Policy';
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-100px)] border rounded-3xl overflow-hidden bg-card dark:bg-card shadow-sm text-left relative">
      <WikiSidebar
        createMenuOpen={createMenuOpen}
        onToggleCreateMenu={() => setCreateMenuOpen(!createMenuOpen)}
        createDropdownRef={createDropdownRef}
        onCreateDocument={handleCreateDocument}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
        pages={filteredPages}
        selectedPageId={selectedPageId}
        onSelectPage={selectPage}
      />

      {/* MAIN VIEWPORT WORKSPACE */}
      <div className="flex-grow flex flex-col min-w-0 bg-muted/20 dark:bg-card/5">
        {!selectedPageId ? (
          <WikiEmptyState orgName={orgSettings.orgName} onCreateDocument={handleCreateDocument} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <DocumentHeaderBar
              category={pageDetails?.category || editCategory}
              authorFirstName={pageDetails?.author?.firstName}
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(!showHistory)}
              isEditing={isEditing}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              onStartEdit={() => setIsEditing(true)}
              canManage={canManageSelectedPage}
              onDelete={() => {
                if (confirm('Delete this Knowledge Base page permanently?')) {
                  deleteMutation.mutate();
                }
              }}
            />

            {/* Main Area: Editor or Viewer */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-card dark:bg-card">
                {isEditing ? (
                  <WikiEditor
                    categories={categories}
                    editCategory={editCategory}
                    onEditCategoryChange={setEditCategory}
                    editIsPublished={editIsPublished}
                    onEditIsPublishedChange={setEditIsPublished}
                    editTitle={editTitle}
                    onEditTitleChange={setEditTitle}
                    previewTab={previewTab}
                    onPreviewTabChange={setPreviewTab}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onApplyFormat={applyFormat}
                    textareaRef={textareaRef}
                  />
                ) : (
                  <WikiViewer pageDetails={pageDetails} />
                )}
              </div>

              {showHistory && (
                <VersionHistoryDrawer
                  versions={pageDetails?.versions}
                  onClose={() => setShowHistory(false)}
                  onPreviewVersion={setPreviewVersionId}
                  onRollback={(ver) => {
                    if (confirm(`Rollback document to version ${ver.version}?`)) {
                      rollbackMutation.mutate(ver.id);
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {previewVersionId &&
        (() => {
          const versionObj = pageDetails?.versions?.find((v: any) => v.id === previewVersionId);
          if (!versionObj) return null;
          return (
            <VersionPreviewModal
              versionObj={versionObj}
              onClose={() => setPreviewVersionId(null)}
              onRollback={() => {
                if (confirm(`Rollback document to version ${versionObj.version}?`)) {
                  rollbackMutation.mutate(versionObj.id);
                  setPreviewVersionId(null);
                }
              }}
            />
          );
        })()}
    </div>
  );
}

// ----------------------------------------------------
// SUSPENSE BOUNDARY WRAPPER
// ----------------------------------------------------
export default function WikiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-100px)] items-center justify-center bg-card dark:bg-card border rounded-3xl shadow-sm">
          <div className="text-center space-y-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-bold">Loading Knowledge Base...</p>
          </div>
        </div>
      }
    >
      <WikiContent />
    </Suspense>
  );
}
