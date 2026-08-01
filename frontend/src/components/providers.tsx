'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useRouter } from 'next/navigation';
import { SocketProvider, useSocket } from '../hooks/useSocket';
import { Toaster, toast } from 'react-hot-toast';
import { ConfirmProvider } from '../context/ConfirmContext';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';
import { AUTH_SESSION_EXPIRED_EVENT, AUTH_MFA_REQUIRED_EVENT } from '../services/api';

export { useSocket };

// Human-readable explanations for the Session.revokedReason codes set in
// backend/src/services/session.service.ts. Codes not listed here (e.g. a
// plain expired token with no revocation involved) get no toast — that's
// the ordinary, expected way sessions end and doesn't need explaining.
const FORCED_LOGOUT_MESSAGES: Record<string, string> = {
  FORCE_OUT: 'You were signed out because your account was signed in from another browser or device.',
  ADMIN_SUSPEND: 'Your account was suspended by an administrator.',
  ADMIN_DEACTIVATE: 'Your account was deactivated by an administrator.',
  ADMIN_LOGOUT: 'An administrator signed you out remotely.',
  ADMIN_LOGOUT_ALL: 'An administrator signed everyone out.',
  PASSWORD_CHANGE: 'You were signed out because your password was changed.',
  REPLAY_ATTACK_DETECTED: 'You were signed out for your security — we detected unusual activity on this session.',
};

// Listens for the session-expired signal dispatched from services/api.ts
// (a plain module that has no access to the Next.js router) and performs a
// client-side navigation to /login instead of a hard window.location reload.
function SessionExpiryListener() {
  const router = useRouter();

  useEffect(() => {
    const handleExpired = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      const message = reason && FORCED_LOGOUT_MESSAGES[reason];
      if (message) {
        toast(message, { icon: '🔒', duration: 6000 });
      }
      router.push('/login');
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
  }, [router]);

  return null;
}

// Same pattern as SessionExpiryListener above, for the org-wide "2FA is
// mandatory and this user hasn't set it up" case (see
// middleware/auth.middleware.ts's MFA_SETUP_REQUIRED). Sends them straight
// to the Security tab with a banner explaining why, rather than leaving
// them looking at a page full of failed requests.
function MfaRequiredListener() {
  const router = useRouter();

  useEffect(() => {
    const handleMfaRequired = () => {
      if (!window.location.pathname.startsWith('/profile')) {
        router.push('/profile?tab=security&mfaRequired=true');
      }
    };
    window.addEventListener(AUTH_MFA_REQUIRED_EVENT, handleMfaRequired);
    return () => window.removeEventListener(AUTH_MFA_REQUIRED_EVENT, handleMfaRequired);
  }, [router]);

  return null;
}

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
            <SessionExpiryListener />
            <MfaRequiredListener />
            <OrgBrandingSync />
            {children}
            <Toaster position="top-right" reverseOrder={false} />
          </SocketProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
