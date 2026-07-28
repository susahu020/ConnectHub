import React from 'react';
import { statusDotColor, statusBadgeClass, formatStatus } from './statusColors';

export function DirectoryTable({
  users,
  currentUserId,
  onSelectUser,
  onStartChat,
}: {
  users: any[];
  currentUserId?: string;
  onSelectUser: (u: any) => void;
  onStartChat: (u: any) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-x-auto shadow-sm text-left">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b bg-slate-50/50 dark:bg-slate-800/40 text-slate-450 uppercase font-extrabold text-[10px] tracking-wider">
            <th className="p-4">Teammate</th>
            <th className="p-4">Designation</th>
            <th className="p-4">Department</th>
            <th className="p-4">Office Location</th>
            <th className="p-4">Time Zone</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((colleague: any) => (
            <tr
              key={colleague.id}
              onClick={() => onSelectUser(colleague)}
              className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
            >
              <td className="p-4 flex items-center space-x-3">
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold uppercase text-slate-500 overflow-hidden shrink-0 border">
                  {colleague.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={colleague.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${colleague.firstName[0]}${colleague.lastName[0]}`
                  )}
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {colleague.firstName} {colleague.lastName}
                </span>
              </td>
              <td className="p-4 font-semibold text-slate-650 dark:text-slate-350">{colleague.designation || 'Teammate'}</td>
              <td className="p-4 text-slate-550 font-medium">{colleague.department?.name || 'General Org'}</td>
              <td className="p-4 text-slate-550 font-medium">{colleague.officeLocation || colleague.location || 'Remote'}</td>
              <td className="p-4 text-slate-555 font-medium">{colleague.timezone || 'UTC'}</td>
              <td className="p-4">
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadgeClass(
                    colleague.status
                  )}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(colleague.status)}`} />
                  <span>{formatStatus(colleague.status)}</span>
                </span>
              </td>
              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end space-x-2">
                  {colleague.id !== currentUserId && (
                    <button
                      onClick={() => onStartChat(colleague)}
                      className="px-3 py-1.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold rounded-lg transition-all"
                    >
                      Send message
                    </button>
                  )}
                  <button
                    onClick={() => onSelectUser(colleague)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-505 hover:text-foreground font-semibold"
                  >
                    View Profile
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
