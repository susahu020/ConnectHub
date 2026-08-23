import React from 'react';
import { Folder, FolderOpen, UploadCloud, Move, Trash2, Eye, Download, Share2 } from 'lucide-react';
import { resolveFileUrl } from '../../lib/utils';

export function FileExplorerGrid({
  dragOverZone,
  onDragOver,
  onDragLeave,
  onDrop,
  isLoading,
  folders,
  files,
  currentUserId,
  currentUserRole,
  selectedFileIds,
  onToggleFileSelected,
  onOpenFolder,
  onMoveItem,
  onDeleteFolder,
  onDeleteFile,
  onPreviewFile,
  onShareFile,
}: {
  dragOverZone: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  isLoading: boolean;
  folders: any[] | undefined;
  files: any[];
  currentUserId?: string;
  currentUserRole?: string;
  selectedFileIds: string[];
  onToggleFileSelected: (id: string, checked: boolean) => void;
  onOpenFolder: (id: string) => void;
  onMoveItem: (item: { id: string; name: string; type: 'FILE' | 'FOLDER' }) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onPreviewFile: (file: any) => void;
  onShareFile: (file: any) => void;
}) {
  const isEmpty = (!folders || folders.length === 0) && files.length === 0;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`min-h-[400px] border-2 rounded-2xl transition-all relative ${
        dragOverZone ? 'border-dashed border-primary bg-primary/5' : 'border-transparent'
      }`}
    >
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
            <div key={n} className="border rounded-2xl p-4 bg-card dark:bg-card space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-secondary dark:bg-card rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-secondary dark:bg-card rounded w-2/3" />
                  <div className="h-2 bg-secondary dark:bg-card rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 border rounded-2xl bg-card dark:bg-card shadow-sm animate-fade-in">
          <FolderOpen className="h-12 w-12 text-foreground dark:text-foreground stroke-1" />
          <p className="text-xs font-bold text-foreground dark:text-foreground">This folder is empty</p>
          <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
            Drag-and-drop your files directly here or click the &quot;Upload File&quot; button at the top to populate this folder.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {folders?.map((fold: any) => (
            <div
              key={fold.id}
              className="bg-card dark:bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="flex items-center justify-between">
                <div onClick={() => onOpenFolder(fold.id)} className="flex items-center space-x-3 min-w-0 cursor-pointer flex-1">
                  <Folder className="h-10 w-10 text-primary shrink-0 fill-primary/10" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate text-foreground leading-snug">{fold.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Folder</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button
                    onClick={() => onMoveItem({ id: fold.id, name: fold.name, type: 'FOLDER' })}
                    className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded"
                    title="Move Folder"
                  >
                    <Move className="h-3.5 w-3.5" />
                  </button>
                  {(fold.createdById === currentUserId || currentUserRole === 'ADMIN') && (
                    <button
                      onClick={() => onDeleteFolder(fold.id)}
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

          {files.map((file: any) => (
            <div
              key={file.id}
              className="bg-card dark:bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.includes(file.id)}
                      onChange={(e) => onToggleFileSelected(file.id, e.target.checked)}
                      className="rounded border-border text-primary h-4 w-4 shrink-0"
                    />
                    <div className="h-9 w-9 bg-muted dark:bg-card border rounded-lg flex items-center justify-center text-[10px] font-extrabold text-primary uppercase shrink-0">
                      {file.fileType.substring(0, 4)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button
                      onClick={() => onMoveItem({ id: file.id, name: file.name, type: 'FILE' })}
                      className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded"
                      title="Move File"
                    >
                      <Move className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onShareFile(file)}
                      className="p-1 text-muted-foreground hover:bg-muted dark:hover:bg-card rounded"
                      title="Share Expiring Link"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    {(file.uploaderId === currentUserId || currentUserRole === 'ADMIN') && (
                      <button onClick={() => onDeleteFile(file.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded" title="Delete File">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-xs truncate leading-snug">{file.name}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Uploader: {file.uploader?.firstName || 'System'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[10px] font-bold">
                <button
                  onClick={() => onPreviewFile(file)}
                  className="flex items-center justify-center space-x-1 py-1.5 border rounded-lg hover:bg-muted dark:hover:bg-card transition-all text-muted-foreground hover:text-foreground"
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
  );
}
