import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { WidgetHeader, WidgetEmptyState } from '../WidgetHeader';

export function FilesWidget({ files }: { files: any[] | undefined }) {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader
        icon={<FileText />}
        iconClassName="text-indigo-500"
        title="Recent Uploads"
        action={{ label: 'Storage', href: '/files' }}
      />
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
        {!files || files.length === 0 ? (
          <WidgetEmptyState label="No files." />
        ) : (
          files.map((file: any) => (
            <div
              key={file.id}
              className="p-2.5 border border-border/60 rounded-xl hover:bg-muted/40 hover:border-indigo-500/20 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black uppercase">
                  {file.fileType.substring(0, 3)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate leading-tight">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${file.name}`}
                className="p-1.5 hover:bg-muted rounded-lg shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
