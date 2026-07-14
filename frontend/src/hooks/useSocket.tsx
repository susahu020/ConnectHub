'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated, user, updateUser } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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
