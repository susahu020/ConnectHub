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
  supportPhone: string | null;
  website: string | null;
  address: string | null;
  defaultWatermarkText: string;
  defaultTimezone: string;
  registrationMode: 'INVITE_ONLY' | 'DOMAIN_RESTRICTED' | 'OPEN';
  allowedDomains: string[];
  alertWebhookUrl: string | null;
  ssoGoogleEnabled: boolean;
  // Whether the same login credentials can be used to be signed in from more
  // than one browser/device at once. SINGLE_SESSION: a new login signs the
  // account out everywhere else. LIMIT_3: up to 3 concurrent sessions.
  // UNLIMITED: no restriction.
  duplicateLoginPolicy: 'SINGLE_SESSION' | 'LIMIT_3' | 'UNLIMITED';
  // Whether every user must have 2FA enabled to use the app.
  mfaRequired: boolean;
  // Days before a soft-deleted file/folder is auto-purged. Null = forever.
  recycleBinRetentionDays: number | null;
  // When true, only Managers/Admins may create or publish wiki pages —
  // see wiki.controller.ts's canCreateOrPublishWikiPage. Everyone can
  // still read published pages either way.
  wikiRestrictedPublishing: boolean;
  // Computed server-side — true only when the server has real Google OAuth
  // credentials configured AND the admin hasn't turned it off.
  ssoGoogleAvailable: boolean;
  // True when GOOGLE_CLIENT_ID still matches the template's placeholder
  // value — SSO looks "available" but will fail when actually tried.
  ssoGoogleUsingDemoCredentials: boolean;
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
  supportPhone: null,
  website: null,
  address: null,
  defaultWatermarkText: 'ConnectHub CONFIDENTIAL',
  defaultTimezone: 'UTC',
  registrationMode: 'INVITE_ONLY',
  allowedDomains: [],
  alertWebhookUrl: null,
  ssoGoogleEnabled: true,
  duplicateLoginPolicy: 'SINGLE_SESSION',
  mfaRequired: false,
  recycleBinRetentionDays: null,
  wikiRestrictedPublishing: false,
  ssoGoogleAvailable: false,
  ssoGoogleUsingDemoCredentials: false,
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
