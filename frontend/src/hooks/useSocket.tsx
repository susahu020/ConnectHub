'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../lib/store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

// Maps a broadcast `module` name (see backend/src/utils/realtime.ts) to every
// React Query key that shows data from that module somewhere in the app. When
// a `data_update` event comes in, every listed query is invalidated, so any
// screen currently showing that data refetches automatically — no manual page
// reload needed. Query keys with extra params (e.g. ['tasks', projectId]) are
// still matched: React Query's default invalidation matches by prefix, so
// listing just the base key (['tasks']) is enough to catch all its variants.
const MODULE_QUERY_KEYS: Record<string, string[]> = {
  // Org structure / user records changing (name, avatar, role, manager, department, verification)
  users: ['org-chart-data', 'admin-users', 'directory', 'hr-directory', 'directory-users-tasks', 'directory-colleagues', 'directory-users-select', 'calendar-directory', 'dashboard-stats'],
  // Departments created/removed, or a user's manager/department reassigned
  org: ['org-chart-data', 'admin-depts', 'directory'],
  // Tasks and projects (Kanban board and its other views)
  tasks: ['tasks', 'projects', 'calendar-tasks', 'profile-tasks', 'dashboard-stats'],
  // Knowledge Base pages
  wiki: ['wiki-pages', 'wiki-page-details'],
  // Company announcements
  announcements: ['announcements', 'calendar-announcements'],
  // Chat groups/channels
  groups: ['groups'],
  // Org-chart teams (distinct from chat groups)
  teams: ['admin-teams'],
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated, user, updateUser } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Keep track of the user's preferred manually set presence status
  const preferredStatusRef = useRef('ONLINE');

  useEffect(() => {
    if (user?.status && user.status !== 'AWAY') {
      preferredStatusRef.current = user.status;
    }
  }, [user?.status]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'], // force websocket for performance
      autoConnect: true,
    });

    let idleTimeout: NodeJS.Timeout;
    let isIdle = false;

    const resetIdleTimer = () => {
      if (isIdle) {
        isIdle = false;
        console.log('User active, restoring preferred status:', preferredStatusRef.current);
        socketInstance.emit('update_presence', { status: preferredStatusRef.current });
      }
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        isIdle = true;
        console.log('User idle for 5 mins, setting status to AWAY...');
        socketInstance.emit('update_presence', { status: 'AWAY' });
      }, 300000); // 5 minutes inactivity
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'mousedown'];

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket client connected to server.');
      updateUser({ status: 'ONLINE' });
      // Attach activity listeners once connected
      events.forEach((event) => window.addEventListener(event, resetIdleTimer));
      resetIdleTimer();
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket client disconnected.');
      // Clean up listeners
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      clearTimeout(idleTimeout);
    });

    // Generic real-time cache invalidation — see MODULE_QUERY_KEYS above and
    // backend/src/utils/realtime.ts for the emitting side.
    socketInstance.on('data_update', ({ module }: { module: string }) => {
      const keys = MODULE_QUERY_KEYS[module];
      if (!keys) return;
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    });

    // Sent directly to this user's own room when an admin assigns them a
    // different custom role (see assignRole in rbac.controller.ts). Applies
    // the new role/permissions to local state immediately — no page refresh,
    // no waiting for the next login — and lets them know it happened.
    socketInstance.on(
      'role_assignment_updated',
      ({
        customRoleId,
        roleName,
        permissions,
      }: {
        customRoleId: string;
        roleName: string;
        permissions: Record<string, Record<string, boolean>>;
      }) => {
        updateUser({ customRoleId, customRoleName: roleName, permissions });
        toast.success(`Your role was updated to "${roleName}". New permissions are now active.`);
        // Any screen showing this user's role (e.g. an admin viewing the
        // directory) should also pick up the change right away.
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['directory'] });
      }
    );

    setSocket(socketInstance);

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      clearTimeout(idleTimeout);
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
