/**
 * Generic real-time cache-invalidation broadcast.
 *
 * Rather than hand-rolling a bespoke socket event + frontend listener for every
 * module (which is how `hr_update` and chat's per-message events came to exist,
 * and which is exactly why most of the app — org chart, tasks, wiki, admin,
 * announcements, groups — never got real-time updates at all), this emits one
 * lightweight `data_update` event carrying just a `module` name. The frontend
 * (see hooks/useSocket.tsx) listens for it once, in the SocketProvider, and
 * invalidates the relevant React Query keys for that module — so every page
 * showing that data refetches automatically, without a manual page reload.
 *
 * Usage: call this after any mutation (create/update/delete) that other users
 * could currently be looking at.
 */
export const emitDataUpdate = (req: any, module: string) => {
  const io = req.app?.get?.('io');
  if (io) {
    io.emit('data_update', { module, at: Date.now() });
  }
};
