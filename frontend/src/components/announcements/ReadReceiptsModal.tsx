import React from 'react';
import { X, Users, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export function ReadReceiptsModal({
  announcementTitle,
  loading,
  data,
  onClose,
}: {
  announcementTitle: string;
  loading: boolean;
  data: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1">
          <h3 className="font-bold text-base flex items-center space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Read Receipts</span>
          </h3>
          <p className="text-[10px] text-slate-400 truncate">{announcementTitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-450">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : data ? (
          <div className="overflow-y-auto space-y-5 pr-1">
            <div>
              <h4 className="font-bold text-[10px] uppercase text-emerald-500 flex items-center space-x-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Viewed ({data.viewed?.length || 0} of {data.totalAudience})
                </span>
              </h4>
              <div className="space-y-2">
                {data.viewed?.length === 0 && <p className="text-[10px] text-slate-400 italic">No one has viewed this yet.</p>}
                {data.viewed?.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {v.firstName} {v.lastName}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(v.viewedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[10px] uppercase text-amber-500 flex items-center space-x-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Not Yet Viewed ({data.notViewed?.length || 0})</span>
              </h4>
              <div className="space-y-2">
                {data.notViewed?.length === 0 && <p className="text-[10px] text-slate-400 italic">Everyone in the audience has viewed this.</p>}
                {data.notViewed?.map((u: any) => (
                  <div key={u.id} className="text-xs font-semibold text-slate-500">
                    {u.firstName} {u.lastName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
