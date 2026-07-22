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
