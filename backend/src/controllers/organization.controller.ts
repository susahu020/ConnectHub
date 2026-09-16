import { Response, NextFunction } from 'express';
import { Request } from 'express';
import fs from 'fs';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateOrganizationSettingsCache } from '../services/organization.service';
import { isConfigured as isCloudinaryConfigured, cloudinary } from '../config/cloudinary';
import { isGoogleSsoConfigured, isUsingTemplateDemoGoogleCredentials } from '../services/sso.service';
import { emitDataUpdate } from '../utils/realtime';
import { validateStatutoryDeductionPolicy } from '../services/statutoryDeductions.service';
import { validateAttendanceAnomalyPolicy } from '../services/attendanceAnomaly.service';
import { validateAttendanceGeofencePolicy } from '../services/geofence.service';
import { validateLeaveAccrualPolicy } from '../services/leaveAccrual.service';
import { validateOvertimePolicy } from '../services/overtime.service';

// The set of columns an admin is allowed to update. An explicit whitelist
// means an unexpected key in the request body (e.g. `id`, `updatedAt`) can
// never be written to the row.
const ORG_SETTINGS_KEYS = [
  'orgName',
  'tagline',
  'logoUrl',
  'faviconUrl',
  'primaryColor',
  'supportEmail',
  'supportPhone',
  'website',
  'address',
  'defaultWatermarkText',
  'defaultTimezone',
  'registrationMode',
  'alertWebhookUrl',
  'duplicateLoginPolicy',
] as const;

const VALID_REGISTRATION_MODES = ['INVITE_ONLY', 'DOMAIN_RESTRICTED', 'OPEN'];
const VALID_DUPLICATE_LOGIN_POLICIES = ['SINGLE_SESSION', 'LIMIT_3', 'UNLIMITED'];

// Shared response shaping: computes the same derived flags
// (ssoGoogleAvailable, ssoGoogleUsingDemoCredentials, needsInitialSetup) that
// getPublicOrganizationSettings sends, so every endpoint that returns an
// OrganizationSettings row — the read endpoint and all three write endpoints
// below — returns an identically-shaped object. Without this, a save/upload
// response was missing these computed fields (they're not real DB columns),
// and the frontend was writing that incomplete response straight into the
// shared ['organization-settings'] query cache via queryClient.setQueryData —
// so right after saving settings or uploading a logo/favicon, the SSO status
// badge would flash to a wrong "Not Configured" state until the next full
// page load silently corrected it.
const buildOrgSettingsResponse = async (settings: any, isPublic: boolean = false) => {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const ssoGoogleAvailable = isGoogleSsoConfigured() && settings.ssoGoogleEnabled !== false;
  const result: any = {
    ...settings,
    needsInitialSetup: adminCount === 0,
    ssoGoogleAvailable,
    ssoGoogleUsingDemoCredentials: ssoGoogleAvailable && isUsingTemplateDemoGoogleCredentials(),
  };
  // getPublicOrganizationSettings has no auth middleware at all — it's
  // called from the login/register screen before a session exists — so
  // whatever this function returns for isPublic=true is served to literally
  // anyone on the internet. alertWebhookUrl is a Slack-style incoming
  // webhook: the URL itself functions as the credential, so leaking it lets
  // anyone post arbitrary content into the org's alert channel. It stays in
  // the response for the three admin-only endpoints below (they need to
  // echo it back so the settings page can show/edit the currently-
  // configured value), just not this one.
  if (isPublic) {
    delete result.alertWebhookUrl;
  }
  return result;
};

/**
 * Public: fetch org-wide branding/config (name, logo, colors, etc.).
 * No auth required — the login/register screens and public landing page
 * need this before a user is authenticated. Creates the (ConnectHub-branded)
 * singleton row on first access.
 */
export const getPublicOrganizationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await prisma.organizationSettings.findFirst();
    if (!settings) {
      settings = await prisma.organizationSettings.create({ data: {} });
    }

    res.status(200).json(await buildOrgSettingsResponse(settings, true));
  } catch (error) {
    next(error);
  }
};

// Shared helper: upload a single image file to Cloudinary (if configured)
// or fall back to serving it from this server's local /uploads directory —
// identical strategy to the user avatar upload, just targeting a different
// Cloudinary folder so org branding assets don't mix with user avatars.
const uploadImageAndGetUrl = async (req: AuthenticatedRequest, folder: string): Promise<string> => {
  const file = req.file;
  if (!file) {
    throw new Error('No file uploaded.');
  }

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'image',
        folder,
      });
      fs.unlinkSync(file.path);
      return result.secure_url;
    } catch (err) {
      // Cloudinary upload failed — fall through to local serving below so
      // the admin doesn't lose the upload entirely.
    }
  }

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  return `${serverUrl}/uploads/${file.filename}`;
};

/**
 * Admin: upload a new organization logo image (multipart, field "logo").
 * Replaces the previous logoUrl with the newly uploaded image's URL.
 */
export const uploadOrganizationLogo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No logo file uploaded.' });
      return;
    }

    const logoUrl = await uploadImageAndGetUrl(req, 'connecthub_organization');

    let existing = await prisma.organizationSettings.findFirst();
    if (!existing) {
      existing = await prisma.organizationSettings.create({ data: {} });
    }

    const settings = await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { logoUrl, updatedById: req.user?.id },
    });

    invalidateOrganizationSettingsCache();
    emitDataUpdate(req, 'organization');

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE_ORGANIZATION_SETTINGS', details: 'Uploaded new organization logo' },
    });

    res.status(200).json(await buildOrgSettingsResponse(settings));
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: upload a new organization favicon image (multipart, field "favicon").
 * Replaces the previous faviconUrl with the newly uploaded image's URL.
 */
export const uploadOrganizationFavicon = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No favicon file uploaded.' });
      return;
    }

    const faviconUrl = await uploadImageAndGetUrl(req, 'connecthub_organization');

    let existing = await prisma.organizationSettings.findFirst();
    if (!existing) {
      existing = await prisma.organizationSettings.create({ data: {} });
    }

    const settings = await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { faviconUrl, updatedById: req.user?.id },
    });

    invalidateOrganizationSettingsCache();
    emitDataUpdate(req, 'organization');

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE_ORGANIZATION_SETTINGS', details: 'Uploaded new organization favicon' },
    });

    res.status(200).json(await buildOrgSettingsResponse(settings));
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: update one or more org-wide branding/config fields. Accepts a
 * partial object; only whitelisted keys are applied.
 */
export const updateOrganizationSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: Record<string, any> = {};
    for (const key of ORG_SETTINGS_KEYS) {
      if (typeof req.body[key] === 'string' || req.body[key] === null) {
        updates[key] = req.body[key];
      }
    }

    if (updates.registrationMode !== undefined && !VALID_REGISTRATION_MODES.includes(updates.registrationMode)) {
      res.status(400).json({ message: `registrationMode must be one of: ${VALID_REGISTRATION_MODES.join(', ')}.` });
      return;
    }

    if (updates.duplicateLoginPolicy !== undefined && !VALID_DUPLICATE_LOGIN_POLICIES.includes(updates.duplicateLoginPolicy)) {
      res.status(400).json({ message: `duplicateLoginPolicy must be one of: ${VALID_DUPLICATE_LOGIN_POLICIES.join(', ')}.` });
      return;
    }

    if (updates.alertWebhookUrl) {
      try {
        const parsed = new URL(updates.alertWebhookUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol');
      } catch {
        res.status(400).json({ message: 'alertWebhookUrl must be a valid http(s) URL.' });
        return;
      }
    }

    // allowedDomains is an array, so it's handled separately from the
    // string|null whitelist loop above. Normalize each entry: strip any
    // leading "@" or "https://" a well-meaning admin might type, lowercase,
    // trim, and drop empties/duplicates.
    if (Array.isArray(req.body.allowedDomains)) {
      const normalized = Array.from(
        new Set(
          req.body.allowedDomains
            .map((d: any) => String(d).trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/$/, ''))
            .filter((d: string) => d.length > 0)
        )
      );
      updates.allowedDomains = normalized;
    }

    // Boolean fields aren't covered by the string|null whitelist loop above.
    if (typeof req.body.ssoGoogleEnabled === 'boolean') {
      updates.ssoGoogleEnabled = req.body.ssoGoogleEnabled;
    }
    if (typeof req.body.mfaRequired === 'boolean') {
      updates.mfaRequired = req.body.mfaRequired;
    }
    // Bug fix: this toggle has a working UI control (organization/settings
    // page.tsx) and is actively read by wiki.controller.ts's
    // canCreateOrPublishWikiPage, but was never actually persisted here —
    // no whitelist entry and no special-cased block, so every save of this
    // setting was silently a no-op.
    if (typeof req.body.wikiRestrictedPublishing === 'boolean') {
      updates.wikiRestrictedPublishing = req.body.wikiRestrictedPublishing;
    }
    // Nullable integer — null/undefined means "keep forever" (no auto-purge).
    if (req.body.recycleBinRetentionDays !== undefined) {
      if (req.body.recycleBinRetentionDays === null || req.body.recycleBinRetentionDays === '') {
        updates.recycleBinRetentionDays = null;
      } else {
        const days = Number(req.body.recycleBinRetentionDays);
        if (!Number.isInteger(days) || days < 1 || days > 3650) {
          res.status(400).json({ message: 'recycleBinRetentionDays must be a whole number of days between 1 and 3650, or empty to keep items forever.' });
          return;
        }
        updates.recycleBinRetentionDays = days;
      }
    }
    // Nullable float — null/undefined/empty means the two-tier expense
    // approval feature is off (every claim stays single-approval).
    if (req.body.expenseSecondApprovalThreshold !== undefined) {
      if (req.body.expenseSecondApprovalThreshold === null || req.body.expenseSecondApprovalThreshold === '') {
        updates.expenseSecondApprovalThreshold = null;
      } else {
        const threshold = Number(req.body.expenseSecondApprovalThreshold);
        if (!Number.isFinite(threshold) || threshold < 0) {
          res.status(400).json({ message: 'expenseSecondApprovalThreshold must be a non-negative number, or empty to disable two-tier approval.' });
          return;
        }
        updates.expenseSecondApprovalThreshold = threshold;
      }
    }

    // JSON policy objects — validated by their owning service module (see
    // statutoryDeductions.service.ts / attendanceAnomaly.service.ts) rather
    // than inline here, so the validation logic lives next to the
    // computation logic it protects and stays covered by the same module's
    // tests.
    if (req.body.payrollStatutoryPolicy !== undefined) {
      const result = validateStatutoryDeductionPolicy(req.body.payrollStatutoryPolicy);
      if (!result.valid) {
        res.status(400).json({ message: result.error });
        return;
      }
      updates.payrollStatutoryPolicy = result.policy;
    }

    if (req.body.attendanceAnomalyPolicy !== undefined) {
      const result = validateAttendanceAnomalyPolicy(req.body.attendanceAnomalyPolicy);
      if (!result.valid) {
        res.status(400).json({ message: result.error });
        return;
      }
      updates.attendanceAnomalyPolicy = result.policy;
    }

    if (req.body.attendanceGeofencePolicy !== undefined) {
      const result = validateAttendanceGeofencePolicy(req.body.attendanceGeofencePolicy);
      if (!result.valid) {
        res.status(400).json({ message: result.error });
        return;
      }
      updates.attendanceGeofencePolicy = result.policy;
    }

    if (req.body.leaveAccrualPolicy !== undefined) {
      const result = validateLeaveAccrualPolicy(req.body.leaveAccrualPolicy);
      if (!result.valid) {
        res.status(400).json({ message: result.error });
        return;
      }
      updates.leaveAccrualPolicy = result.policy;
    }

    if (req.body.overtimePolicy !== undefined) {
      const result = validateOvertimePolicy(req.body.overtimePolicy);
      if (!result.valid) {
        res.status(400).json({ message: result.error });
        return;
      }
      updates.overtimePolicy = result.policy;
    }

    // Simple scalar attendance/leave settings — these had schema fields
    // and were already read by clockIn/leave accrual, but had no write
    // path here at all until now, so they were effectively DB-edit-only.
    if (req.body.lateGraceMinutes !== undefined) {
      const minutes = Number(req.body.lateGraceMinutes);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
        res.status(400).json({ message: 'lateGraceMinutes must be a whole number of minutes between 0 and 240.' });
        return;
      }
      updates.lateGraceMinutes = minutes;
    }
    if (req.body.halfDayThresholdHours !== undefined) {
      const hours = Number(req.body.halfDayThresholdHours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        res.status(400).json({ message: 'halfDayThresholdHours must be a number between 0 and 24.' });
        return;
      }
      updates.halfDayThresholdHours = hours;
    }
    if (req.body.weeklyOffDays !== undefined) {
      if (
        !Array.isArray(req.body.weeklyOffDays) ||
        req.body.weeklyOffDays.some((d: any) => !Number.isInteger(d) || d < 0 || d > 6)
      ) {
        res.status(400).json({ message: 'weeklyOffDays must be an array of whole numbers 0 (Sunday) through 6 (Saturday).' });
        return;
      }
      // Dedup + sort — matches JS Date.getDay() convention (0=Sunday),
      // same as computePayrollBreakdown's own weeklyOffDays check.
      updates.weeklyOffDays = [...new Set(req.body.weeklyOffDays as number[])].sort((a, b) => a - b);
    }

    if (updates.registrationMode === 'DOMAIN_RESTRICTED') {
      const existingDomains = (await prisma.organizationSettings.findFirst())?.allowedDomains || [];
      const effectiveDomains = updates.allowedDomains ?? existingDomains;
      if (!effectiveDomains || effectiveDomains.length === 0) {
        res.status(400).json({ message: 'Add at least one allowed email domain before switching to domain-restricted registration.' });
        return;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid organization settings were provided.' });
      return;
    }

    let existing = await prisma.organizationSettings.findFirst();
    if (!existing) {
      existing = await prisma.organizationSettings.create({ data: {} });
    }

    const settings = await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { ...updates, updatedById: req.user?.id },
    });

    // Make sure every subsequent request (emails, public settings endpoint)
    // picks up the change immediately instead of serving a stale cached copy.
    invalidateOrganizationSettingsCache();
    // And every already-open browser tab/session — other admins on this
    // settings page, and every user's login screen or sidebar that reads
    // org branding/registration/SSO/session-policy — picks it up live too,
    // instead of only on their next manual refresh.
    emitDataUpdate(req, 'organization');

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ORGANIZATION_SETTINGS',
        details: `Updated organization settings: ${JSON.stringify(updates)}`,
      },
    });

    res.status(200).json(await buildOrgSettingsResponse(settings));
  } catch (error) {
    next(error);
  }
};
