import React from 'react';
import { resolveFileUrl } from '../../../lib/utils';

export function WatermarkTab({
  watermarkResult,
  watermarkText,
  onWatermarkTextChange,
  watermarking,
  onApplyWatermark,
  defaultWatermarkText,
}: {
  watermarkResult: any;
  watermarkText: string;
  onWatermarkTextChange: (v: string) => void;
  watermarking: boolean;
  onApplyWatermark: () => void;
  defaultWatermarkText: string;
}) {
  if (!watermarkResult) return null;

  return (
    <div className="w-full text-left space-y-4">
      <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl space-y-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Custom Watermark Overlay Text</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => onWatermarkTextChange(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
              placeholder={defaultWatermarkText}
            />
            <button onClick={onApplyWatermark} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl transition-all" disabled={watermarking}>
              {watermarking ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </div>

        {watermarkResult.watermarkedUrl && (
          <div className="border border-dashed p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-3">
            <p className="text-[10px] text-slate-500">
              Watermark label applied successfully: <span className="font-bold text-slate-800 dark:text-slate-100">&quot;{watermarkText}&quot;</span>
            </p>
            <a
              href={resolveFileUrl(watermarkResult.watermarkedUrl)}
              download={watermarkResult.fileName}
              className="inline-block px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-600 transition-all"
            >
              Download Watermarked File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
