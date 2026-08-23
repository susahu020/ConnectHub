import React from 'react';
import { FileIcon } from 'lucide-react';
import { resolveFileUrl } from '../../../lib/utils';

export function DocumentPreviewTab({ file }: { file: any }) {
  if (file.fileType === 'PDF') {
    return <iframe src={resolveFileUrl(file.url)} className="w-full h-[450px] rounded-2xl border bg-card shadow-sm" title="PDF Preview" />;
  }

  if (['PNG', 'JPEG', 'JPG', 'WEBP', 'GIF'].includes(file.fileType)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resolveFileUrl(file.url)} alt={file.name} className="max-h-[400px] object-contain rounded-2xl mx-auto shadow-sm" />;
  }

  if (['MP4', 'WEBM', 'OGG'].includes(file.fileType)) {
    return <video src={resolveFileUrl(file.url)} controls className="max-h-[400px] w-full rounded-2xl shadow-sm" />;
  }

  if (['DOCX', 'XLSX', 'PPTX', 'DOC', 'XLS', 'PPT', 'CSV'].includes(file.fileType)) {
    return (
      <div className="w-full text-left space-y-4">
        <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl mx-auto relative overflow-hidden font-sans">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-info/15 text-info-dark text-[10px] font-black rounded uppercase">{file.fileType} READER</span>
              <span className="text-[10px] text-muted-foreground font-semibold">{file.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Pages: 3 (Auto-generated Office Layout)</span>
          </div>

          <div className="space-y-3.5 text-foreground dark:text-foreground">
            <h2 className="text-sm font-black border-b pb-1">CONNECTHUB OFFICE DOCUMENT PREVIEWER</h2>
            <p className="text-xs leading-relaxed">
              This is an inline preview of your office document. To edit or view full formatting, you can download the document.
            </p>
            <div className="p-3 bg-muted dark:bg-card rounded-xl space-y-2 border border-dashed">
              <h3 className="text-xs font-bold">Document Summary:</h3>
              <ul className="list-disc ml-4 text-[11px] text-muted-foreground space-y-1">
                <li>File path: {file.url}</li>
                <li>Size: {(file.size / 1024).toFixed(2)} KB</li>
                <li>Last Modified: {new Date(file.updatedAt).toLocaleDateString()}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <FileIcon className="h-16 w-16 text-primary mx-auto stroke-1" />
      <p className="text-xs text-muted-foreground">No inline preview template for format &quot;{file.fileType}&quot;.</p>
      <a
        href={resolveFileUrl(file.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md transition-all hover:bg-primary/95"
      >
        Download Original
      </a>
    </div>
  );
}
