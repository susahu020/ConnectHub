'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface OrganizationSettings {
  orgName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
  website: string | null;
  address: string | null;
  defaultWatermarkText: string;
  defaultTimezone: string;
  registrationMode: 'INVITE_ONLY' | 'DOMAIN_RESTRICTED' | 'OPEN';
  allowedDomains: string[];
  alertWebhookUrl: string | null;
  ssoGoogleEnabled: boolean;
  // Computed server-side — true only when the server has real Google OAuth
  // credentials configured AND the admin hasn't turned it off.
  ssoGoogleAvailable: boolean;
  // Computed server-side (not a stored column) — true only until the very
  // first Admin account exists. See organization.controller.ts.
  needsInitialSetup: boolean;
}

// Fallback values used while the settings are loading (or if the request
// fails) so nothing on screen flashes blank. These intentionally match
// today's hardcoded defaults.
export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  orgName: 'ConnectHub',
  tagline: 'Enterprise Communication & Collaboration Platform',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#4f46e5',
  supportEmail: null,
  website: null,
  address: null,
  defaultWatermarkText: 'ConnectHub CONFIDENTIAL',
  defaultTimezone: 'UTC',
  registrationMode: 'INVITE_ONLY',
  allowedDomains: [],
  alertWebhookUrl: null,
  ssoGoogleEnabled: true,
  ssoGoogleAvailable: false,
  // Defaults to false (not true) while loading — safer to briefly hide the
  // public signup form than to briefly show it before we actually know.
  needsInitialSetup: false,
};

// Public endpoint — no auth required, safe to call on login/register/landing
// pages. Cached for a long time since branding rarely changes; the Admin
// panel invalidates this query key on save (see admin/page.tsx).
export function useOrganizationSettings() {
  const { data, isLoading } = useQuery<OrganizationSettings>({
    queryKey: ['organization-settings'],
    queryFn: () => api.getOrganizationSettings(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  return {
    settings: data ?? DEFAULT_ORG_SETTINGS,
    isLoading,
  };
}
