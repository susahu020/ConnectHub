'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UploadCloud, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { resolveFileUrl } from '../../../lib/utils';
import { useConfirm } from '../../../context/ConfirmContext';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { FilesMetricsBar } from '../../../components/files/FilesMetricsBar';
import { FileBreadcrumbs } from '../../../components/files/FileBreadcrumbs';
import { FileFilterBar } from '../../../components/files/FileFilterBar';
import { FileExplorerGrid } from '../../../components/files/FileExplorerGrid';
import { RecycleBinView } from '../../../components/files/RecycleBinView';
import { BulkActionBar } from '../../../components/files/BulkActionBar';
import { CreateFolderModal } from '../../../components/files/CreateFolderModal';
import { MoveItemModal } from '../../../components/files/MoveItemModal';
import { ShareLinkModal } from '../../../components/files/ShareLinkModal';
import { FilePreviewModal } from '../../../components/files/preview/FilePreviewModal';

export default function FilesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { settings: orgSettings } = useOrganizationSettings();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'ALL' | 'IMAGES' | 'VIDEOS' | 'DOCUMENTS'>('ALL');

  // Modals & Panels state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Advanced File Upgrades state variables
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<any>(null);
  const [compareVersion2, setCompareVersion2] = useState<any>(null);
  const [scanReport, setScanReport] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocring, setOcring] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkResult, setWatermarkResult] = useState<any>(null);
  const [watermarking, setWatermarking] = useState(false);

  useEffect(() => {
    if (!watermarkText) {
      setWatermarkText(orgSettings.defaultWatermarkText);
    }
  }, [orgSettings.defaultWatermarkText]);

  const handleBulkDownload = async () => {
    if (selectedFileIds.length === 0) return;
    try {
      const res = await api.bulkDownload(selectedFileIds);
      if (res && res.files) {
        res.files.forEach((f: any) => {
          const link = document.createElement('a');
          link.href = resolveFileUrl(f.url);
          link.download = f.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
        toast.success(`Bulk download started for ${res.files.length} files!`);
        setSelectedFileIds([]);
      }
    } catch (err) {
      toast.error('Failed to run bulk download');
    }
  };

  const handleScanFile = async (id: string) => {
    setScanning(true);
    setScanReport(null);
    try {
      const report = await api.scanFile(id);
      setScanReport(report);
      toast.success('Virus scan completed. File is secure.');
    } catch (err) {
      toast.error('Virus scan request failed');
    } finally {
      setScanning(false);
    }
  };

  const handleOCRFile = async (id: string) => {
    setOcring(true);
    setOcrText(null);
    try {
      const result = await api.ocrFile(id);
      setOcrText(result.text);
      toast.success('OCR Text extraction completed.');
    } catch (err) {
      toast.error('OCR processing failed');
    } finally {
      setOcring(false);
    }
  };

  const handleApplyWatermark = async (id: string) => {
    setWatermarking(true);
    setWatermarkResult(null);
    try {
      const result = await api.watermarkFile(id, watermarkText);
      setWatermarkResult(result);
      toast.success('Watermark generated successfully!');
    } catch (err) {
      toast.error('Watermark request failed');
    } finally {
      setWatermarking(false);
    }
  };

  // Recycle Bin state
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // Move Modal state
  const [movingItem, setMovingItem] = useState<any>(null); // { id, name, type: 'FILE' | 'FOLDER' }
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  // Share Modal state
  const [sharingFile, setSharingFile] = useState<any>(null);
  const [expireHours, setExpireHours] = useState<number>(24);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Drag and Drop Upload state
  const [dragOverZone, setDragOverZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch folders and files in current folder
  const { data: explorer, isLoading } = useQuery({
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
  const filteredFiles =
    explorer?.files?.filter((file: any) => {
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
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) => api.createFolder(name, parentId),
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

  // Load users when sharingFile is selected
  useEffect(() => {
    if (sharingFile) {
      const loadUsers = async () => {
        try {
          const data = await api.getDirectory('limit=100');
          if (data && data.users) {
            setDirectoryUsers(data.users);
          }
        } catch (err) {
          console.error('Failed to load users for sharing:', err);
        }
      };
      loadUsers();
      setSelectedUserIds([]);
    }
  }, [sharingFile]);

  // Expiring links share
  const handleGenerateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingFile) return;

    try {
      const response = await api.createShareLink(sharingFile.id, expireHours, selectedUserIds);
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
    if (
      !(await confirm({
        title: 'Move File to Recycle Bin',
        message: 'Are you sure you want to move this file to the Recycle Bin?',
        confirmText: 'Move to Bin',
        type: 'warning',
      }))
    )
      return;
    try {
      await api.deleteFile(id);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File moved to Recycle Bin.');
    } catch (err) {
      toast.error('Failed to delete file.');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (
      !(await confirm({
        title: 'Move Folder to Recycle Bin',
        message: 'Are you sure you want to move this folder and all of its contents to the Recycle Bin?',
        confirmText: 'Move to Bin',
        type: 'warning',
      }))
    )
      return;
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
    if (
      !(await confirm({
        title: 'Permanently Delete Item',
        message: 'Permanently delete this item? This action is IRREVERSIBLE.',
        confirmText: 'Delete Permanently',
        type: 'danger',
      }))
    )
      return;
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
  const moveOptions = driveFolders.filter((f: any) => (movingItem?.type === 'FOLDER' ? f.id !== movingItem.id : true));

  const closePreview = () => {
    setPreviewFile(null);
    setCompareMode(false);
    setScanReport(null);
    setOcrText(null);
    setWatermarkResult(null);
  };

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
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
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

      {showRecycleBin ? (
        <RecycleBinView loading={loadingRecycle} recycleBin={recycleBin} onRestore={handleRestore} onPermanentDelete={handlePermanentDelete} />
      ) : (
        <div className="space-y-6">
          <FilesMetricsBar explorer={explorer} fileTypeFilter={fileTypeFilter} />

          <FileBreadcrumbs
            breadcrumbs={explorer?.breadcrumbs}
            onNavigateRoot={() => {
              setCurrentFolderId(null);
              setSearchQuery('');
            }}
            onNavigateCrumb={(id) => {
              setCurrentFolderId(id);
              setSearchQuery('');
            }}
          />

          <FileFilterBar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            fileTypeFilter={fileTypeFilter}
            onFileTypeFilterChange={(v) => setFileTypeFilter(v as any)}
          />

          <FileExplorerGrid
            dragOverZone={dragOverZone}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isLoading={isLoading}
            folders={explorer?.folders}
            files={filteredFiles}
            currentUserId={user?.id}
            currentUserRole={user?.role}
            selectedFileIds={selectedFileIds}
            onToggleFileSelected={(id, checked) => {
              if (checked) {
                setSelectedFileIds([...selectedFileIds, id]);
              } else {
                setSelectedFileIds(selectedFileIds.filter((fid) => fid !== id));
              }
            }}
            onOpenFolder={setCurrentFolderId}
            onMoveItem={setMovingItem}
            onDeleteFolder={handleDeleteFolder}
            onDeleteFile={handleDeleteFile}
            onPreviewFile={setPreviewFile}
            onShareFile={setSharingFile}
          />
        </div>
      )}

      <CreateFolderModal
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        folderName={folderName}
        onFolderNameChange={setFolderName}
        onSubmit={handleCreateFolderSubmit}
      />

      {movingItem && (
        <MoveItemModal
          item={movingItem}
          targetFolderId={targetFolderId}
          onTargetFolderIdChange={setTargetFolderId}
          moveOptions={moveOptions}
          onClose={() => setMovingItem(null)}
          onSubmit={handleMoveSubmit}
        />
      )}

      {sharingFile && (
        <ShareLinkModal
          fileName={sharingFile.name}
          generatedLink={generatedLink}
          onClose={() => {
            setSharingFile(null);
            setGeneratedLink('');
          }}
          expireHours={expireHours}
          onExpireHoursChange={setExpireHours}
          directoryUsers={directoryUsers}
          currentUserId={user?.id}
          selectedUserIds={selectedUserIds}
          onSelectedUserIdsChange={setSelectedUserIds}
          onSubmit={handleGenerateShareLink}
          onCopyLink={copyToClipboard}
        />
      )}

      {selectedFileIds.length > 0 && (
        <BulkActionBar count={selectedFileIds.length} onDownload={handleBulkDownload} onDeselectAll={() => setSelectedFileIds([])} />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={closePreview}
          compareMode={compareMode}
          onOpenDocumentTab={() => {
            setCompareMode(false);
            setScanReport(null);
            setOcrText(null);
            setWatermarkResult(null);
          }}
          onSetCompareMode={() => {
            setCompareMode(true);
            setScanReport(null);
            setOcrText(null);
            setWatermarkResult(null);
          }}
          compareVersion1={compareVersion1}
          compareVersion2={compareVersion2}
          onSelectVersion1={setCompareVersion1}
          onSelectVersion2={setCompareVersion2}
          scanReport={scanReport}
          scanning={scanning}
          onRunScan={() => {
            handleScanFile(previewFile.id);
            setCompareMode(false);
            setOcrText(null);
            setWatermarkResult(null);
          }}
          ocrText={ocrText}
          ocring={ocring}
          onRunOcr={() => {
            handleOCRFile(previewFile.id);
            setCompareMode(false);
            setScanReport(null);
            setWatermarkResult(null);
          }}
          watermarkResult={watermarkResult}
          onOpenWatermarkTab={() => {
            setWatermarkResult({});
            setCompareMode(false);
            setScanReport(null);
            setOcrText(null);
          }}
          watermarkText={watermarkText}
          onWatermarkTextChange={setWatermarkText}
          watermarking={watermarking}
          onApplyWatermark={() => handleApplyWatermark(previewFile.id)}
          defaultWatermarkText={orgSettings.defaultWatermarkText}
        />
      )}
    </div>
  );
}
