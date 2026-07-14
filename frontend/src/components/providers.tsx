'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { SocketProvider, useSocket } from '../hooks/useSocket';
import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from '../context/ConfirmContext';

export { useSocket };

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ConfirmProvider>
          <SocketProvider>
            {children}
            <Toaster position="top-right" reverseOrder={false} />
          </SocketProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
