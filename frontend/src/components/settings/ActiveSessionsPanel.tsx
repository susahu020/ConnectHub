import React from 'react';
import { Smartphone, Laptop, Trash2 } from 'lucide-react';

export function ActiveSessionsPanel({
  sessions,
  onRevokeSession,
  onLogoutOtherDevices,
  onLogoutAllDevices,
}: {
  sessions: any[] | undefined;
  onRevokeSession: (id: string) => void;
  onLogoutOtherDevices: () => void;
  onLogoutAllDevices: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-5">
      <div className="border-b pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-sm">Active Sessions</h3>
        </div>
      </div>

      {sessions && sessions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pb-2">
          <button
            onClick={onLogoutOtherDevices}
            className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-[10px] font-bold transition-all shadow-xs"
          >
            Logout Others
          </button>
          <button
            onClick={onLogoutAllDevices}
            className="py-2 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-bold transition-all"
          >
            Logout All Devices
          </button>
        </div>
      )}

      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
        {sessions?.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No active sessions tracked.</p>
        ) : (
          sessions?.map((sess: any) => (
            <div
              key={sess.id}
              className={`p-3.5 border rounded-xl transition-all flex flex-col space-y-2 text-[10px] relative overflow-hidden ${
                sess.isCurrent ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {sess.isCurrent && (
                <span className="absolute right-3 top-3 bg-emerald-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                  Current
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{sess.deviceName || 'Web Browser'}</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 leading-normal space-y-0.5">
                    <p>
                      <strong>System:</strong> {sess.operatingSystem || 'Unknown OS'} • {sess.browser || 'Unknown'}
                    </p>
                    <p>
                      <strong>IP:</strong> {sess.ipAddress || 'Unknown'}
                    </p>
                    <p>
                      <strong>Location:</strong> {sess.location || 'Local Network'}
                    </p>
                  </div>
                </div>
                {!sess.isCurrent && (
                  <button
                    onClick={() => onRevokeSession(sess.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0 self-start"
                    title="Revoke session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-dashed">
                <span>Logged: {new Date(sess.loginTime || sess.createdAt).toLocaleDateString()}</span>
                <span>Active: {new Date(sess.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
