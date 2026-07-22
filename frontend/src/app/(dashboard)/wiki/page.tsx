'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
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
  Info,
  Bold,
  Italic,
  Quote,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  Table,
  XCircle,
  ChevronDown,
  FileText,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';

// ----------------------------------------------------
// DOCUMENT TEMPLATES
// ----------------------------------------------------

const SOP_TEMPLATE = `# Standard Operating Procedure: [Procedure Title]

## 1. Document Control
* **SOP ID:** SOP-KB-${Math.floor(100 + Math.random() * 900)}
* **Department:** [e.g., Engineering, Operations]
* **Effective Date:** ${new Date().toLocaleDateString()}
* **Version:** 1.0
* **Author:** [Author Name]

## 2. Objective & Purpose
This procedure defines the step-by-step process for [Objective of the procedure]. It ensures consistency, safety, and compliance with company standards.

## 3. Scope
This SOP applies to all employees, contractors, and departments involved in [Process Scope].

## 4. Responsibilities
| Role | Responsibility |
| --- | --- |
| **Operator / Engineer** | Execute the steps as defined, log outcomes |
| **Supervisor / Manager** | Review execution, audit logs periodically |
| **Administrator** | Approve revisions, maintain master copy |

## 5. Procedure Steps
1. **Preparation:** Gather all required access, resources, and pre-requisites.
2. **Execution:**
   - Execute step A carefully.
   - Verify reading/output meets parameters.
3. **Verification:** Confirm execution results with the standard checklist.
4. **Logging:** File the completion log in the system.

## 6. Checklist & Verification
- [ ] Pre-execution safety and access checks completed.
- [ ] Process executed as per steps.
- [ ] Output verified against criteria.
- [ ] Supervisor signed off.

## 7. Reference Documents
* [Files & Documents](/files)
* Related SOPs: None
`;

const HR_TEMPLATE = `# HR Document: [Document Title]

## 1. Document Overview
* **Document Ref:** HR-DOC-${Math.floor(100 + Math.random() * 900)}
* **Effective Date:** ${new Date().toLocaleDateString()}
* **Applicability:** All Employees / Full-time staff
* **Published By:** Human Resources

## 2. Objective
This document outlines the guidelines, criteria, and administrative processes regarding [Topic Title, e.g., Employee Benefits, Remote Work Guidelines].

## 3. Core Guidelines
* **Onboarding & Eligibility:** [Describe who qualifies and when]
* **Guidelines:**
  1. Guideline Item A
  2. Guideline Item B
  3. Guideline Item C

## 4. Administrative Procedures
Follow these steps to submit claims or requests related to this document:
1. Complete the request form on the HR Portal.
2. Attach supporting receipts or documentation.
3. Await review and approval (typically within 3 business days).

## 5. Contact & Support
For questions or support regarding this policy, please reach out:
* **Department:** People Operations
* **Primary Contact:** [HR Contact Email/Slack]
`;

const POLICY_TEMPLATE = `# Company Policy: [Policy Title]

## 1. Overview & Scope
This policy outlines the standards of conduct and compliance regarding [Policy Subject]. It governs all employees, contractors, and partners at ConnectHub.

## 2. Standards of Conduct
* **Rule A:** Employees must maintain high standards of [Topic].
* **Rule B:** Any violation of these standards will lead to investigation.

## 3. Compliance & Audits
ConnectHub conducts periodic audits to ensure compliance with this policy.
| Compliance Area | Audit Frequency | Lead Auditor |
| --- | --- | --- |
| Policy Training | Annually | HR Director |
| System Audits | Quarterly | InfoSec Officer |

## 4. Enforcement
Violations of this policy may result in disciplinary action up to and including termination of employment.

## 5. Document Revision History
| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0 | ${new Date().toLocaleDateString()} | Compliance Officer | Initial Release |
`;

const WIKI_TEMPLATE = `# Wiki Page: [Title]

## Overview
Brief introduction to the topic. Explain what this page is for and who it is aimed at.

## Background Context
Add any background context, links, or history here.

## Detailed Information
Add the main body of knowledge here. You can use tables, checklists, and code blocks:
- Item 1
- Item 2

## Resources & Links
* [Dashboard Home](/dashboard)
* [External Reference](https://google.com)
`;

// ----------------------------------------------------
// CUSTOM MARKDOWN PARSER
// ----------------------------------------------------
const parseMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-slate-850 dark:text-slate-100 mt-5 mb-2 border-b pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3">$1</h1>');

  // Horizontal Rule
  html = html.replace(/^---$/gim, '<hr class="border-t border-slate-200 dark:border-slate-800 my-4" />');

  // Bold & Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Checklist Items (Unchecked and Checked)
  html = html.replace(/^\- \[ \] (.*$)/gim, '<li class="list-none flex items-center space-x-2 text-slate-700 dark:text-slate-350 my-1"><input type="checkbox" disabled class="mr-2 rounded border-slate-300 dark:border-slate-700 h-3.5 w-3.5 text-primary" /> $1</li>');
  html = html.replace(/^\- \[x\] (.*$)/gim, '<li class="list-none flex items-center space-x-2 text-slate-400 dark:text-slate-500 line-through my-1"><input type="checkbox" checked disabled class="mr-2 rounded border-slate-300 dark:border-slate-700 h-3.5 w-3.5 text-primary bg-primary" /> $1</li>');

  // Bullet Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="list-disc ml-5 mb-1 text-slate-700 dark:text-slate-355">$1</li>');

  // Numbered Lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="list-decimal ml-5 mb-1 text-slate-700 dark:text-slate-355">$1</li>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary bg-slate-50 dark:bg-slate-800/40 px-4 py-2 rounded-r-xl my-4 text-slate-650 dark:text-slate-400 italic">$1</blockquote>');

  // Code blocks & Inline Code
  html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre class="bg-slate-55 dark:bg-slate-800 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border dark:border-slate-700 my-4 text-slate-700 dark:text-slate-300">$1</pre>');
  html = html.replace(/\`(.*?)\`/g, '<code class="bg-slate-55 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700 text-[11px] font-mono text-primary">$1</code>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer">$1</a>');

  // Table Parsing
  const lines = html.split('\n');
  let inTable = false;
  let tableHeader = true;
  let tableHTML = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        tableHTML = '<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 border dark:border-slate-850 rounded-xl overflow-hidden">';
      }
      
      // Check for separator row (e.g. |---|---|)
      if (cells.every(c => c.match(/^:?-+:?$/))) {
        tableHeader = false;
        continue;
      }
      
      if (tableHeader) {
        tableHTML += '<thead class="bg-slate-50 dark:bg-slate-800/50"><tr>';
        cells.forEach(cell => {
          tableHTML += `<th class="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cell}</th>`;
        });
        tableHTML += '</tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">';
        tableHeader = false;
      } else {
        tableHTML += '<tr class="hover:bg-slate-55/50 dark:hover:bg-slate-800/20">';
        cells.forEach(cell => {
          tableHTML += `<td class="px-4 py-2 text-xs text-slate-700 dark:text-slate-350">${cell}</td>`;
        });
        tableHTML += '</tr>';
      }
    } else {
      if (inTable) {
        tableHTML += '</tbody></table></div>';
        lines[i - 1] = tableHTML;
        inTable = false;
      }
    }
  }
  if (inTable) {
    tableHTML += '</tbody></table></div>';
    lines[lines.length - 1] = tableHTML;
  }
  
  html = lines.join('\n');
  return html;
};

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

  const canManageSelectedPage = !!pageDetails && (pageDetails.authorId === user?.id || user?.role === 'ADMIN');

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
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.updateWikiPage(selectedPageId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page-details', selectedPageId] });
      setIsEditing(false);
      toast.success('Document saved successfully!');
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

    createMutation.mutate({
      title,
      content,
      category,
      isPublished: true,
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

  const getCategoryBadgeColor = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'SOP':
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50';
      case 'POLICY':
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50';
      case 'HR':
        return 'bg-info/10 text-info-dark border border-info/20 dark:bg-info/15 dark:text-info dark:border-info/25';
      case 'ENGINEERING':
        return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700/50';
    }
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
    <div className="flex h-[calc(100vh-100px)] border rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-left relative">
      
      {/* SIDEBAR: DOCUMENTS DIRECTORY */}
      <div className="w-80 border-r dark:border-slate-800 flex flex-col shrink-0">
        
        {/* Creation Header */}
        <div className="p-4 border-b dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between relative">
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Knowledge Base</h2>
            
            <div ref={createDropdownRef} className="relative">
              <button 
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-xl shadow transition-all flex items-center space-x-1 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>Create</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </button>

              {/* Document Creation Options Menu */}
              {createMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-1.5 animate-slide-up text-xs font-semibold">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 px-3 py-1 bg-slate-50/50 dark:bg-slate-800/40 mb-1 leading-tight">Document Type</p>
                  <button 
                    onClick={() => handleCreateDocument('blank')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                  >
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span>Blank Wiki Page</span>
                  </button>
                  <button 
                    onClick={() => handleCreateDocument('sop')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                  >
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Standard SOP Document</span>
                  </button>
                  <button 
                    onClick={() => handleCreateDocument('hr')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                  >
                    <CheckSquare className="h-4 w-4 text-info shrink-0" />
                    <span>HR Document / Guide</span>
                  </button>
                  <button 
                    onClick={() => handleCreateDocument('policy')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                  >
                    <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Company Policy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Knowledge Base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>

          {/* Core Module Tabs */}
          <div className="flex border-b pb-0.5 gap-1 select-none overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'wiki', label: 'Wikis' },
              { id: 'sop', label: 'SOPs' },
              { id: 'hr', label: 'HR Docs' },
              { id: 'policy', label: 'Policies' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== 'wiki') {
                    setSelectedCategory('');
                  }
                }}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all border border-transparent whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-category selection (only for Wikis tab) */}
          {activeTab === 'wiki' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none font-bold"
            >
              <option value="">All Wiki Categories</option>
              {categories.filter(c => c !== 'SOP' && c !== 'Policy' && c !== 'HR').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Directory Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredPages.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <BookOpen className="h-5 w-5 text-slate-350 dark:text-slate-500 mx-auto" />
              <p className="text-[10px] text-slate-450 italic">No articles found.</p>
            </div>
          ) : (
            filteredPages.map((p: any) => {
              const isActive = selectedPageId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPage(p.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-primary/5 text-primary border-l-4 border-l-primary' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <BookOpen className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate leading-snug">{p.title}</p>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${getCategoryBadgeColor(p.category)}`}>
                        {p.category}
                      </span>
                      <span className="text-[8px] text-slate-400">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT WORKSPACE */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-50/20 dark:bg-slate-900/5">
        {!selectedPageId ? (
          <div className="flex-grow flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/10">
            <div className="text-center space-y-4 max-w-md p-8">
              <div className="h-14 w-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
                <BookOpen className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-base">{orgSettings.orgName} Knowledge Base</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Access company handbooks, Wikis, Standard Operating Procedures (SOPs), HR Portal documents, and corporate policies. Includes version logs and collaborative markdown editing.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-2">
                <button
                  onClick={() => handleCreateDocument('sop')}
                  className="p-3 border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:border-amber-400 transition-all text-center space-y-1.5 shadow-sm"
                >
                  <FileText className="h-5 w-5 text-amber-500 mx-auto" />
                  <p className="text-[10px] font-black text-slate-750 dark:text-slate-200">Create SOP</p>
                </button>
                <button
                  onClick={() => handleCreateDocument('policy')}
                  className="p-3 border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:border-rose-400 transition-all text-center space-y-1.5 shadow-sm"
                >
                  <ShieldAlert className="h-5 w-5 text-rose-500 mx-auto" />
                  <p className="text-[10px] font-black text-slate-750 dark:text-slate-200">Create Policy</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Header controls bar */}
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center space-x-2.5">
                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${getCategoryBadgeColor(pageDetails?.category || editCategory)}`}>
                  {pageDetails?.category || editCategory}
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
                  title="Version History logs"
                >
                  <History className="h-4 w-4" />
                </button>

                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 hover:bg-primary/95"
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
                      className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 hover:bg-primary/95"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Article</span>
                    </button>
                    {canManageSelectedPage && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this Knowledge Base page permanently?')) {
                            deleteMutation.mutate();
                          }
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Main Area: Editor or Viewer */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900">
                {isEditing ? (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    
                    {/* Editing Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Category Tag</label>
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

                      <div className="space-y-1.5 flex flex-col justify-end pb-2">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editIsPublished}
                            onChange={(e) => setEditIsPublished(e.target.checked)}
                            className="rounded border-slate-350 text-primary h-4 w-4 focus:ring-primary"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Publish Document</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Document Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-sm font-black"
                        placeholder="e.g. Employee Travel Allowance Policy"
                      />
                    </div>

                    {/* Editor Toolbar & Tabs */}
                    <div className="border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 flex flex-col">
                      
                      {/* Editor Sub-Header (Tabs and Formatting toolbar) */}
                      <div className="flex flex-wrap items-center justify-between border-b dark:border-slate-800 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 gap-2 shrink-0">
                        {/* Editor mode tabs */}
                        <div className="flex border-b pb-0 gap-1">
                          {[
                            { id: 'write', label: 'Write' },
                            { id: 'preview', label: 'Preview' },
                            { id: 'split', label: 'Split View' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setPreviewTab(tab.id as any)}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                previewTab === tab.id 
                                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border dark:border-slate-700' 
                                  : 'text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Formatting Toolbar Buttons (only show when editable view is active) */}
                        {previewTab !== 'preview' && (
                          <div className="flex items-center space-x-0.5 bg-white dark:bg-slate-900 p-0.5 rounded-lg border dark:border-slate-800 overflow-x-auto max-w-full">
                            {[
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
                            ].map((btn, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => applyFormat(btn.id)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-505 hover:text-slate-850 dark:hover:text-slate-100 text-[10px] font-black w-6 h-6 flex items-center justify-center"
                                title={btn.title}
                              >
                                {btn.icon || btn.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Content Panels */}
                      <div className="flex-1 min-h-[420px] flex flex-col">
                        {previewTab === 'write' && (
                          <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
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
                              onChange={(e) => setEditContent(e.target.value)}
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
                      <span>Use standard markdown style rules. Switch to <strong>Split View</strong> or <strong>Preview</strong> tabs to review tables, checklists, and code formatting in real-time.</span>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-6 text-left leading-relaxed max-w-3xl mx-auto">
                    {/* Render View Mode */}
                    <div className="space-y-2 border-b dark:border-slate-800 pb-4">
                      <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {pageDetails?.title}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                        <span className={`px-2 py-0.5 rounded font-black uppercase text-[8px] ${getCategoryBadgeColor(pageDetails?.category)}`}>
                          {pageDetails?.category}
                        </span>
                        <span>•</span>
                        <span>Version {pageDetails?.versions?.[0]?.version || 1}</span>
                        <span>•</span>
                        <span>Updated: {new Date(pageDetails?.updatedAt || '').toLocaleString()}</span>
                        {!pageDetails?.isPublished && (
                          <>
                            <span>•</span>
                            <span className="text-amber-500 font-black uppercase text-[8px]">Draft</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div 
                      className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(pageDetails?.content || '') }}
                    />
                  </div>
                )}
              </div>

              {/* VERSION HISTORY SIDE DRAWER */}
              {showHistory && (
                <div className="w-72 border-l dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 animate-slide-right min-h-0 z-10">
                  <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                      <History className="h-4 w-4 text-primary" />
                      <span>Version History</span>
                    </h3>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-450"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-3.5 space-y-3">
                    {pageDetails?.versions?.map((ver: any, index: number) => (
                      <div 
                        key={ver.id}
                        className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border dark:border-slate-800 shadow-sm space-y-2.5 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-black uppercase">
                            v{ver.version}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-505 leading-tight">
                          Changed by: <span className="font-bold text-slate-750 dark:text-slate-200">{ver.changedBy?.firstName} {ver.changedBy?.lastName}</span>
                        </div>
                        
                        <div className="flex space-x-1.5 pt-1">
                          <button
                            onClick={() => setPreviewVersionId(ver.id)}
                            className="flex-1 py-1 text-[9px] font-bold text-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            Preview
                          </button>
                          {index > 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`Rollback document to version ${ver.version}?`)) {
                                  rollbackMutation.mutate(ver.id);
                                }
                              }}
                              className="flex-1 py-1 text-[9px] font-bold text-center border border-dashed border-primary/45 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-all"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* VERSION PREVIEW MODAL */}
      {previewVersionId && (() => {
        const versionObj = pageDetails?.versions?.find((v: any) => v.id === previewVersionId);
        if (!versionObj) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up text-left">
              
              <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                    Version {versionObj.version} Preview
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Saved on {new Date(versionObj.createdAt).toLocaleString()} by {versionObj.changedBy?.firstName} {versionObj.changedBy?.lastName}
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewVersionId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="border-b dark:border-slate-800 pb-3">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {versionObj.title}
                  </h1>
                </div>
                <div 
                  className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(versionObj.content) }}
                />
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 flex justify-end space-x-2">
                <button
                  onClick={() => setPreviewVersionId(null)}
                  className="px-4 py-2 border text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Rollback document to version ${versionObj.version}?`)) {
                      rollbackMutation.mutate(versionObj.id);
                      setPreviewVersionId(null);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 flex items-center space-x-1.5"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Restore Version {versionObj.version}</span>
                </button>
              </div>

            </div>
          </div>
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
    <Suspense fallback={
      <div className="flex h-[calc(100vh-100px)] items-center justify-center bg-white dark:bg-slate-900 border rounded-3xl shadow-sm">
        <div className="text-center space-y-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Loading Knowledge Base...</p>
        </div>
      </div>
    }>
      <WikiContent />
    </Suspense>
  );
}
