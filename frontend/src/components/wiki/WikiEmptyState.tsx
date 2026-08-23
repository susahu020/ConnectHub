import React from 'react';
import { BookOpen, FileText, ShieldAlert } from 'lucide-react';

export function WikiEmptyState({
  orgName,
  onCreateDocument,
}: {
  orgName: string;
  onCreateDocument: (type: 'sop' | 'policy') => void;
}) {
  return (
    <div className="flex-grow flex items-center justify-center bg-muted/50 dark:bg-card/10">
      <div className="text-center space-y-4 max-w-md p-8">
        <div className="h-14 w-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
          <BookOpen className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-foreground dark:text-foreground text-base">{orgName} Knowledge Base</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Access company handbooks, Wikis, Standard Operating Procedures (SOPs), HR Portal documents, and corporate policies. Includes
            version logs and collaborative markdown editing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-2">
          <button
            onClick={() => onCreateDocument('sop')}
            className="p-3 border dark:border-border bg-card dark:bg-card rounded-xl hover:border-amber-400 transition-all text-center space-y-1.5 shadow-sm"
          >
            <FileText className="h-5 w-5 text-amber-500 mx-auto" />
            <p className="text-[10px] font-black text-foreground dark:text-foreground">Create SOP</p>
          </button>
          <button
            onClick={() => onCreateDocument('policy')}
            className="p-3 border dark:border-border bg-card dark:bg-card rounded-xl hover:border-rose-400 transition-all text-center space-y-1.5 shadow-sm"
          >
            <ShieldAlert className="h-5 w-5 text-rose-500 mx-auto" />
            <p className="text-[10px] font-black text-foreground dark:text-foreground">Create Policy</p>
          </button>
        </div>
      </div>
    </div>
  );
}
