import React from 'react';

export function VirusScanTab({ scanReport, scanning }: { scanReport: any; scanning: boolean }) {
  if (scanReport) {
    return (
      <div className="w-full text-left space-y-4">
        <div className="p-5 bg-card dark:bg-card border rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase">SAFE SYSTEM</span>
              <h4 className="font-extrabold text-xs text-foreground dark:text-foreground">Anti-Malware Security Report</h4>
            </div>
            <span className="text-[10px] text-emerald-500 font-black">{scanReport.status}</span>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Scanner Engine</span>
              <span>{scanReport.engine}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Scanned On</span>
              <span>{new Date(scanReport.scannedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Threats Match</span>
              <span className="text-emerald-500 font-bold">{scanReport.threatsFound} Threats</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">SHA256 checksum</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">{scanReport.hashSignature}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 italic">{scanReport.details}</p>
          </div>
        </div>
      </div>
    );
  }

  if (scanning) {
    return (
      <div className="text-center space-y-2">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
        <p className="text-xs text-muted-foreground">Scanning document blocks with ClamAV database signatures...</p>
      </div>
    );
  }

  return null;
}
