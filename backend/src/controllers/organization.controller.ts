import { Response, NextFunction } from 'express';
import { Request } from 'express';
import fs from 'fs';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateOrganizationSettingsCache } from '../services/organization.service';
import { isConfigured as isCloudinaryConfigured, cloudinary } from '../config/cloudinary';

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
  'website',
  'address',
  'defaultWatermarkText',
  'defaultTimezone',
] as const;

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

    res.status(200).json(settings);
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

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE_ORGANIZATION_SETTINGS', details: 'Uploaded new organization logo' },
    });

    res.status(200).json(settings);
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

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE_ORGANIZATION_SETTINGS', details: 'Uploaded new organization favicon' },
    });

    res.status(200).json(settings);
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
    const updates: Record<string, string | null> = {};
    for (const key of ORG_SETTINGS_KEYS) {
      if (typeof req.body[key] === 'string' || req.body[key] === null) {
        updates[key] = req.body[key];
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

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ORGANIZATION_SETTINGS',
        details: `Updated organization settings: ${JSON.stringify(updates)}`,
      },
    });

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};
