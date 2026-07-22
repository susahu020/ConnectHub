import prisma from '../config/db';

// Org-wide branding/config, single source of truth ------------------------
//
// Any backend code that needs the company name, logo, support email, etc.
// (email templates, watermarks, etc.) should call getOrganizationSettings()
// instead of hardcoding a literal string, so an admin's change propagates
// everywhere without a code change or redeploy.

let cachedSettings: any | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

// Fetches the singleton OrganizationSettings row, creating it with the
// (ConnectHub-branded) defaults on first use. Cached briefly since this is
// read on essentially every request that composes an email or serves the
// public settings endpoint; the cache is force-invalidated as soon as the
// admin saves a change (see invalidateOrganizationSettingsCache below).
export const getOrganizationSettings = async () => {
  if (cachedSettings && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  let settings = await prisma.organizationSettings.findFirst();
  if (!settings) {
    settings = await prisma.organizationSettings.create({ data: {} });
  }

  cachedSettings = settings;
  cachedAt = Date.now();
  return settings;
};

export const invalidateOrganizationSettingsCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};

// Convenience helper for the (very common) case of just needing the org
// name inside an email subject/body/footer.
export const getOrgName = async (): Promise<string> => {
  const settings = await getOrganizationSettings();
  return settings.orgName || 'ConnectHub';
};
