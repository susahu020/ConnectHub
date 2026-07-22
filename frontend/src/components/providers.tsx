'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { SocketProvider, useSocket } from '../hooks/useSocket';
import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from '../context/ConfirmContext';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';

export { useSocket };

// Keeps the browser tab title/favicon in sync with the admin-configured
// organization name/branding. Lives inside the QueryClientProvider tree so
// it shares the same cached ['organization-settings'] query as every other
// component that reads org branding.
function OrgBrandingSync() {
  const { settings } = useOrganizationSettings();

  useEffect(() => {
    document.title = `${settings.orgName} - Enterprise Communication & Collaboration Platform`;

    if (settings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.orgName, settings.faviconUrl]);

  return null;
}

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
            <OrgBrandingSync />
            {children}
            <Toaster position="top-right" reverseOrder={false} />
          </SocketProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
