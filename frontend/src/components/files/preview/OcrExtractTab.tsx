import React from 'react';
import { toast } from 'react-hot-toast';

export function OcrExtractTab({ ocrText, ocring }: { ocrText: string | null; ocring: boolean }) {
  if (ocrText) {
    return (
      <div className="w-full text-left space-y-4">
        <div className="p-4 bg-card dark:bg-card border rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-foreground dark:text-foreground">Extracted Document Text</h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(ocrText);
                toast.success('Extracted text copied to clipboard!');
              }}
              className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-black rounded-lg transition-all"
            >
              Copy Text
            </button>
          </div>
          <textarea
            readOnly
            value={ocrText}
            className="w-full h-44 p-3 bg-muted dark:bg-card rounded-xl text-[10px] font-mono border leading-relaxed focus:outline-none resize-none"
          />
        </div>
      </div>
    );
  }

  if (ocring) {
    return (
      <div className="text-center space-y-2">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
        <p className="text-xs text-muted-foreground">Executing Optical Character Recognition text mapping...</p>
      </div>
    );
  }

  return null;
}
