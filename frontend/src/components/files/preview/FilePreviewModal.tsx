import React from 'react';
import { X } from 'lucide-react';
import { DocumentPreviewTab } from './DocumentPreviewTab';
import { VersionCompareTab } from './VersionCompareTab';
import { VirusScanTab } from './VirusScanTab';
import { OcrExtractTab } from './OcrExtractTab';
import { WatermarkTab } from './WatermarkTab';

export function FilePreviewModal({
  file,
  onClose,
  compareMode,
  onOpenDocumentTab,
  onSetCompareMode,
  compareVersion1,
  compareVersion2,
  onSelectVersion1,
  onSelectVersion2,
  scanReport,
  scanning,
  onRunScan,
  ocrText,
  ocring,
  onRunOcr,
  watermarkResult,
  onOpenWatermarkTab,
  watermarkText,
  onWatermarkTextChange,
  watermarking,
  onApplyWatermark,
  defaultWatermarkText,
}: {
  file: any;
  onClose: () => void;
  compareMode: boolean;
  onOpenDocumentTab: () => void;
  onSetCompareMode: () => void;
  compareVersion1: any;
  compareVersion2: any;
  onSelectVersion1: (v: any) => void;
  onSelectVersion2: (v: any) => void;
  scanReport: any;
  scanning: boolean;
  onRunScan: () => void;
  ocrText: string | null;
  ocring: boolean;
  onRunOcr: () => void;
  watermarkResult: any;
  onOpenWatermarkTab: () => void;
  watermarkText: string;
  onWatermarkTextChange: (v: string) => void;
  watermarking: boolean;
  onApplyWatermark: () => void;
  defaultWatermarkText: string;
}) {
  const isDefaultTab = !compareMode && !scanReport && !ocrText && !watermarkResult;

  const tabs = [
    { key: 'preview', label: 'Document Preview', active: isDefaultTab, onClick: onOpenDocumentTab },
    { key: 'compare', label: 'Version Compare', active: compareMode, onClick: onSetCompareMode },
    { key: 'scan', label: 'Virus Scan', active: !!scanReport, onClick: onRunScan },
    { key: 'ocr', label: 'OCR Text Extract', active: !!ocrText, onClick: onRunOcr },
    { key: 'watermark', label: 'Add Watermark', active: !!watermarkResult, onClick: onOpenWatermarkTab },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:bg-muted dark:hover:bg-card p-1.5 rounded-lg transition-all">
          <X className="h-5 w-5" />
        </button>

        <div className="border-b pb-3 space-y-1">
          <h3 className="font-extrabold text-base leading-none text-foreground dark:text-foreground">{file.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Format: {file.fileType} • Active Version: v{file.version}
          </p>
        </div>

        <div className="flex flex-wrap border-b pb-1 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={tab.onClick}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${tab.active ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-muted dark:bg-card/60 rounded-3xl border p-5 flex flex-col justify-center min-h-[350px] relative overflow-hidden">
          {isDefaultTab && <DocumentPreviewTab file={file} />}
          {compareMode && (
            <VersionCompareTab
              versions={file.versions}
              compareVersion1={compareVersion1}
              compareVersion2={compareVersion2}
              onSelectVersion1={onSelectVersion1}
              onSelectVersion2={onSelectVersion2}
            />
          )}
          {!compareMode && (scanReport || scanning) && <VirusScanTab scanReport={scanReport} scanning={scanning} />}
          {!compareMode && (ocrText || ocring) && <OcrExtractTab ocrText={ocrText} ocring={ocring} />}
          {!compareMode && watermarkResult && (
            <WatermarkTab
              watermarkResult={watermarkResult}
              watermarkText={watermarkText}
              onWatermarkTextChange={onWatermarkTextChange}
              watermarking={watermarking}
              onApplyWatermark={onApplyWatermark}
              defaultWatermarkText={defaultWatermarkText}
            />
          )}
        </div>
      </div>
    </div>
  );
}
