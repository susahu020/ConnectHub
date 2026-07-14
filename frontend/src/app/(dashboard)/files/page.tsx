'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Folder, 
  FolderOpen,
  FileText, 
  Plus, 
  UploadCloud, 
  Trash2, 
  ChevronRight, 
  Home, 
  Download, 
  Eye, 
  X,
  FileIcon,
  Loader2,
  Lock,
  Share2,
  Move,
  RefreshCw,
  Copy,
  Trash,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { resolveFileUrl } from '../../../lib/utils';
import { useConfirm } from '../../../context/ConfirmContext';

export default function FilesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'ALL' | 'IMAGES' | 'VIDEOS' | 'DOCUMENTS'>('ALL');
  
  // Modals & Panels state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Recycle Bin state
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // Move Modal state
  const [movingItem, setMovingItem] = useState<any>(null); // { id, name, type: 'FILE' | 'FOLDER' }
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  // Share Modal state
  const [sharingFile, setSharingFile] = useState<any>(null);
  const [expireHours, setExpireHours] = useState<number>(24);
  const [generatedLink, setGeneratedLink] = useState<string>('');

  // Drag and Drop Upload state
  const [dragOverZone, setDragOverZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch folders and files in current folder
  const { data: explorer, isLoading, refetch } = useQuery({
    queryKey: ['files', currentFolderId, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (currentFolderId) params.append('folderId', currentFolderId);
      if (searchQuery) params.append('search', searchQuery);
      return api.getFiles(params.toString());
    },
    enabled: !showRecycleBin,
  });

  // Filter files locally by type category select
  const filteredFiles = explorer?.files?.filter((file: any) => {
    const ext = file.fileType?.toUpperCase() || '';
    if (fileTypeFilter === 'IMAGES') {
      return ['PNG', 'JPEG', 'JPG', 'WEBP', 'GIF'].includes(ext);
    }
    if (fileTypeFilter === 'VIDEOS') {
      return ['MP4', 'MKV', 'MOV'].includes(ext);
    }
    if (fileTypeFilter === 'DOCUMENTS') {
      return ['PDF', 'DOCX', 'XLSX', 'TXT', 'CSV'].includes(ext);
    }
    return true;
  }) || [];

  // Fetch Recycle Bin items
  const { data: recycleBin, refetch: refetchRecycleBin, isLoading: loadingRecycle } = useQuery({
    queryKey: ['recycle-bin'],
    queryFn: () => api.getRecycleBin(),
    enabled: showRecycleBin,
  });

  // Create folder
  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      api.createFolder(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setCreateFolderOpen(false);
      setFolderName('');
      toast.success('Folder created successfully.');
    },
  });

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    createFolderMutation.mutate({
      name: folderName,
      parentId: currentFolderId,
    });
  };

  // Upload file
  const uploadFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    try {
      await api.uploadFile(formData);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`Uploaded ${file.name} successfully.`);
    } catch (err: any) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  };

  // Drag over drop zone handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(true);
  };

  const handleDragLeave = () => {
    setDragOverZone(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  // Move operations
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem) return;
    try {
      await api.moveItem(movingItem.id, targetFolderId || null, movingItem.type);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setMovingItem(null);
      setTargetFolderId('');
      toast.success('Item moved successfully.');
    } catch (err) {
      toast.error('Failed to move item.');
    }
  };

  // Expiring links share
  const handleGenerateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingFile) return;

    try {
      const response = await api.createShareLink(sharingFile.id, expireHours);
      setGeneratedLink(response.shareLink);
      toast.success('Shared link generated.');
    } catch (err) {
      toast.error('Failed to create share link.');
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success('Share link copied to clipboard!');
  };

  // Soft Deletes
  const handleDeleteFile = async (id: string) => {
    if (!await confirm({
      title: 'Move File to Recycle Bin',
      message: 'Are you sure you want to move this file to the Recycle Bin?',
      confirmText: 'Move to Bin',
      type: 'warning'
    })) return;
    try {
      await api.deleteFile(id);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File moved to Recycle Bin.');
    } catch (err) {
      toast.error('Failed to delete file.');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!await confirm({
      title: 'Move Folder to Recycle Bin',
      message: 'Are you sure you want to move this folder and all of its contents to the Recycle Bin?',
      confirmText: 'Move to Bin',
      type: 'warning'
    })) return;
    try {
      await api.deleteFolder(id);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Folder moved to Recycle Bin.');
    } catch (err) {
      toast.error('Failed to delete folder.');
    }
  };

  // Recycle Bin Operations
  const handleRestore = async (id: string, type: 'FILE' | 'FOLDER') => {
    try {
      await api.restoreItem(id, type);
      refetchRecycleBin();
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Item restored successfully.');
    } catch (err) {
      toast.error('Failed to restore item.');
    }
  };

  const handlePermanentDelete = async (id: string, type: 'FILE' | 'FOLDER') => {
    if (!await confirm({
      title: 'Permanently Delete Item',
      message: 'Permanently delete this item? This action is IRREVERSIBLE.',
      confirmText: 'Delete Permanently',
      type: 'danger'
    })) return;
    try {
      await api.deletePermanently(id, type);
      refetchRecycleBin();
      toast.success('Item permanently deleted.');
    } catch (err) {
      toast.error('Failed to purge item.');
    }
  };

  // Compile list of other folders for target selection inside Move Modal
  // Filter out the currently moving folder itself to prevent recursive loop
  const driveFolders = explorer?.folders || [];
  const moveOptions = driveFolders.filter((f: any) => movingItem?.type === 'FOLDER' ? f.id !== movingItem.id : true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cloud Document Drive</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Share company documentation, guidelines, and assets securely.</p>
        </div>

        <div className="flex items-center space-x-3">
          {showRecycleBin ? (
            <button
              onClick={() => setShowRecycleBin(false)}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Drive</span>
            </button>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span>Upload File</span>
              </button>
              <button
                onClick={() => setCreateFolderOpen(true)}
                className="px-4 py-2.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => setShowRecycleBin(true)}
                className="px-4 py-2.5 border border-red-200 dark:border-red-950 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 bg-white dark:bg-slate-900 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Recycle Bin</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* RECYCLE BIN VIEW */}
      {showRecycleBin ? (
        <div className="space-y-6">
          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Recycle Bin Directory</span>
          </div>

          {loadingRecycle ? (
            <div className="text-center text-xs text-slate-400 py-20">Loading recycle items...</div>
          ) : (recycleBin?.folders?.length === 0 && recycleBin?.files?.length === 0) ? (
            <div className="text-center text-xs text-slate-400 py-20 border rounded-2xl bg-white dark:bg-slate-900">
              The Recycle Bin is empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* Soft Deleted Folders */}
              {recycleBin?.folders?.map((fold: any) => (
                <div
                  key={fold.id}
                  className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Folder className="h-10 w-10 text-red-400 shrink-0 fill-red-50" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate text-foreground leading-snug">{fold.name}</h4>
                      <p className="text-[9px] text-slate-450">Soft-deleted folder</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                    <button
                      onClick={() => handleRestore(fold.id, 'FOLDER')}
                      className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(fold.id, 'FOLDER')}
                      className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Purge</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Soft Deleted Files */}
              {recycleBin?.files?.map((file: any) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="h-9 w-9 bg-red-50 border rounded-lg flex items-center justify-center text-[10px] font-extrabold text-red-500 uppercase shrink-0">
                      {file.fileType.substring(0, 4)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate text-foreground leading-snug">{file.name}</h4>
                      <p className="text-[9px] text-slate-450">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                    <button
                      onClick={() => handleRestore(file.id, 'FILE')}
                      className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(file.id, 'FILE')}
                      className="flex items-center justify-center space-x-1 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Purge</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* NORMAL DRIVE EXPLORER VIEW */
        <div className="space-y-6">
          {/* Drive Storage Summary Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {[
              { label: 'Total Folders', value: explorer?.folders?.length || 0, icon: '📁', color: 'bg-blue-50/50 dark:bg-blue-950/15 text-blue-600 border-blue-100 dark:border-blue-900/30' },
              { label: 'Total Files', value: explorer?.files?.length || 0, icon: '📄', color: 'bg-primary/5 text-primary border-primary/10' },
              { label: 'Storage Used', value: `${((explorer?.files?.reduce((acc: number, f: any) => acc + (f.size || 0), 0) || 0) / 1024 / 1024).toFixed(1)} MB`, icon: '💾', color: 'bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-500 border-emerald-100 dark:border-emerald-900/30' },
              { label: 'File Type Filter', value: fileTypeFilter === 'ALL' ? 'All Types' : fileTypeFilter, icon: '🔍', color: 'bg-amber-50/50 dark:bg-amber-950/15 text-amber-500 border-amber-100 dark:border-amber-900/30' }
            ].map((card, idx) => (
              <div key={idx} className="p-4 border rounded-2xl flex items-center justify-between shadow-2xs bg-white dark:bg-slate-900">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
                  <p className="text-lg font-black tracking-tight leading-none text-slate-800 dark:text-slate-205">{card.value}</p>
                </div>
                <span className="text-xl leading-none">{card.icon}</span>
              </div>
            ))}
          </div>
          {/* Path Breadcrumbs */}
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 px-4 py-3 border rounded-xl shadow-xs">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setSearchQuery('');
              }}
              className="flex items-center space-x-1 hover:text-primary transition-all"
            >
              <Home className="h-4 w-4" />
              <span>Root Drive</span>
            </button>

            {explorer?.breadcrumbs?.map((crumb: any) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setSearchQuery('');
                  }}
                  className="hover:text-primary transition-all max-w-[100px] truncate"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

           {/* Search & Category Filter Bar */}
           <div className="bg-white dark:bg-slate-900 border p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="relative flex-1 max-w-md">
               <input
                 type="text"
                 placeholder="Filter documents and folders in this directory..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
               />
               {/* Magnifier SVG */}
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
               </svg>
             </div>

             {/* Quick Category filter buttons */}
             <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] font-extrabold uppercase shrink-0">
               {[
                 { id: 'ALL', label: 'All Files' },
                 { id: 'IMAGES', label: 'Images' },
                 { id: 'VIDEOS', label: 'Videos' },
                 { id: 'DOCUMENTS', label: 'Documents' }
               ].map((type) => (
                 <button
                   key={type.id}
                   onClick={() => setFileTypeFilter(type.id as any)}
                   className={`px-3 py-1.5 rounded-lg border transition-all ${
                     fileTypeFilter === type.id
                       ? 'bg-primary text-white border-primary shadow-xs'
                       : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-foreground border-slate-200 dark:border-slate-700'
                   }`}
                 >
                   {type.label}
                 </button>
               ))}
             </div>
           </div>

          {/* Grid listing folders and files with Drag-and-Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[400px] border-2 rounded-2xl transition-all relative ${
              dragOverZone 
                ? 'border-dashed border-primary bg-primary/5' 
                : 'border-transparent'
            }`}
          >
            {/* Drag drop hint banner overlay */}
            {dragOverZone && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none rounded-2xl z-40">
                <div className="text-center space-y-2">
                  <UploadCloud className="h-12 w-12 text-primary mx-auto animate-bounce" />
                  <p className="text-sm font-black text-primary">Drop files here to upload instantly</p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-pulse-slow">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="border rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (explorer?.folders?.length === 0 && explorer?.files?.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 border rounded-2xl bg-white dark:bg-slate-900 shadow-sm animate-fade-in">
                <FolderOpen className="h-12 w-12 text-slate-350 dark:text-slate-700 stroke-1" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">This folder is empty</p>
                <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">Drag-and-drop your files directly here or click the "Upload File" button at the top to populate this folder.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* Folders List */}
                {explorer?.folders?.map((fold: any) => (
                  <div
                    key={fold.id}
                    className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => setCurrentFolderId(fold.id)}
                        className="flex items-center space-x-3 min-w-0 cursor-pointer flex-1"
                      >
                        <Folder className="h-10 w-10 text-primary shrink-0 fill-primary/10" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate text-foreground leading-snug">{fold.name}</h4>
                          <p className="text-[9px] text-slate-400">Folder</p>
                        </div>
                      </div>
                      
                      {/* Folder Deletion & Move actions */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          onClick={() => setMovingItem({ id: fold.id, name: fold.name, type: 'FOLDER' })}
                          className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          title="Move Folder"
                        >
                          <Move className="h-3.5 w-3.5" />
                        </button>
                        {(fold.createdById === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleDeleteFolder(fold.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                            title="Delete Folder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Files List */}
                {filteredFiles.map((file: any) => (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 border rounded-lg flex items-center justify-center text-[10px] font-extrabold text-indigo-500 uppercase shrink-0">
                          {file.fileType.substring(0, 4)}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button
                            onClick={() => setMovingItem({ id: file.id, name: file.name, type: 'FILE' })}
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            title="Move File"
                          >
                            <Move className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setSharingFile(file)}
                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            title="Share Expiring Link"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          {(file.uploaderId === user?.id || user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1 text-red-500 hover:bg-red-55 rounded"
                              title="Delete File"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate leading-snug">{file.name}</h4>
                        <p className="text-[9px] text-slate-400">
                          Uploader: {file.uploader?.firstName || 'System'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>
                      <a
                        href={resolveFileUrl(file.url)}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1 py-1.5 bg-primary/5 border border-primary/20 text-primary rounded-lg hover:bg-primary/10 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {createFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <button onClick={() => setCreateFolderOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Create Folder Directory</h3>
              <p className="text-xs text-slate-400">Enter a descriptive folder name to structure files.</p>
            </div>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Assets"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Create Directory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Move Directory Item Modal */}
      {movingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <button onClick={() => setMovingItem(null)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Move {movingItem.type === 'FOLDER' ? 'Folder' : 'File'}</h3>
              <p className="text-xs text-slate-400">Select a target folder in the drive to relocate "{movingItem.name}".</p>
            </div>
            <form onSubmit={handleMoveSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Select Target Directory</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="">Root Directory</option>
                  {moveOptions.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                Relocate Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Expiring Link Modal */}
      {sharingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <button
              onClick={() => {
                setSharingFile(null);
                setGeneratedLink('');
              }}
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Share expiring link</h3>
              <p className="text-xs text-slate-400">Generate a secure link to allow external or internal stakeholders to download "{sharingFile.name}".</p>
            </div>

            {generatedLink ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs select-all focus:outline-none font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-primary text-white rounded-xl shadow hover:bg-primary/95"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-emerald-500 font-bold">✓ Share Link is active. It will expire based on your selection.</p>
              </div>
            ) : (
              <form onSubmit={handleGenerateShareLink} className="space-y-4 text-xs font-semibold">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Select Expiration Duration</label>
                  <select
                    value={expireHours}
                    onChange={(e) => setExpireHours(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={8}>8 Hours</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={168}>168 Hours (1 Week)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                  Generate Share Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* File Previewer Dialog */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setPreviewFile(null)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="border-b pb-2">
              <h3 className="font-bold text-sm leading-none">{previewFile.name}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Format: {previewFile.fileType} • Version: {previewFile.version}</p>
            </div>

            {/* Preview Area Fallback */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl border p-4 flex items-center justify-center min-h-[300px]">
              {previewFile.fileType === 'PNG' || previewFile.fileType === 'JPEG' || previewFile.fileType === 'JPG' ? (
                <img src={resolveFileUrl(previewFile.url)} alt={previewFile.name} className="max-h-[400px] object-contain rounded-lg" />
              ) : previewFile.fileType === 'MP4' ? (
                <video src={resolveFileUrl(previewFile.url)} controls className="max-h-[400px] w-full rounded-lg" />
              ) : (
                <div className="text-center space-y-4">
                  <FileIcon className="h-16 w-16 text-indigo-500 mx-auto stroke-1" />
                  <p className="text-xs text-muted-foreground">
                    Inline previewing is not supported for {previewFile.fileType} files. Please download to view.
                  </p>
                  <a
                    href={resolveFileUrl(previewFile.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow"
                  >
                    Download Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
