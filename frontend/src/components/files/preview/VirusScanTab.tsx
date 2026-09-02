import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, FlaskConical } from 'lucide-react';

// Previously this always rendered a hardcoded green "SAFE SYSTEM" badge
// regardless of what the backend actually returned — the backend itself
// was faking a "CLEAN" result for every file, so the two matched, but
// that was the bug (see file.controller.ts / malwareScan.service.ts).
// Now the backend can genuinely return CLEAN, INFECTED, or ERROR, and can
// flag a result as `simulated` when no real scanner (ClamAV/clamd) is
// configured for this deployment — this renders all of those states
// honestly instead of always showing green.
export function VirusScanTab({ scanReport, scanning }: { scanReport: any; scanning: boolean }) {
  if (scanReport) {
    const status = scanReport.status as 'CLEAN' | 'INFECTED' | 'ERROR' | undefined;
    const isInfected = status === 'INFECTED';
    const isError = status === 'ERROR';

    const badgeClasses = isInfected
      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
      : isError
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';

    const statusTextClasses = isInfected ? 'text-red-500' : isError ? 'text-amber-500' : 'text-emerald-500';

    const Icon = isInfected ? ShieldAlert : isError ? ShieldQuestion : ShieldCheck;

    return (
      <div className="w-full text-left space-y-4">
        {scanReport.simulated && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500">
            <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold leading-snug">
              Demo mode — no malware scanner is configured for this workspace. This result is simulated and is
              <span className="font-black"> not a real security guarantee</span>.
            </p>
          </div>
        )}

        <div className="p-5 bg-card dark:bg-card border rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <Icon className={`h-4 w-4 ${statusTextClasses}`} />
              <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${badgeClasses}`}>
                {isInfected ? 'THREAT DETECTED' : isError ? 'SCAN FAILED' : 'NO THREATS FOUND'}
              </span>
              <h4 className="font-extrabold text-xs text-foreground dark:text-foreground">Anti-Malware Security Report</h4>
            </div>
            <span className={`text-[10px] font-black ${statusTextClasses}`}>{scanReport.status}</span>
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
              <span className={`font-bold ${isInfected ? 'text-red-500' : 'text-emerald-500'}`}>
                {scanReport.threatsFound} {scanReport.threatsFound === 1 ? 'Threat' : 'Threats'}
              </span>
            </div>
            {scanReport.threatName && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Threat Name</span>
                <span className="text-red-500 font-bold">{scanReport.threatName}</span>
              </div>
            )}
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
        <p className="text-xs text-muted-foreground">Scanning file for malware signatures...</p>
      </div>
    );
  }

  return null;
}
