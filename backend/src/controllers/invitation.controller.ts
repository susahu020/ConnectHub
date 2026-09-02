import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendEmail } from '../config/mailer';
import { getOrgName, getOrganizationSettings } from '../services/organization.service';
import { generateEmployeeId } from '../utils/employeeId';
import { checkPasswordStrength, checkPasswordAgainstIdentity } from '../utils/passwordPolicy';
import { emitDataUpdate } from '../utils/realtime';

const buildInvitationEmail = (orgName: string, role: string, inviteLink: string) => {
  const subject = `You have been invited to join ${orgName}!`;
  const text = `Hello,\n\nYou have been invited to join ${orgName} as a ${role.toLowerCase()}.\n\nClick the link below to complete your workspace onboarding and set up your password:\n\n${inviteLink}\n\nThis invitation link will expire in 7 days.\n\nBest regards,\n${orgName} Workspace Team`;
  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
          <h2 style="color: #4f46e5; margin: 0;">${orgName} Portal</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Hello,</p>
          <p>You have been invited to join the ${orgName} collaboration workspace as a <strong>${role.toLowerCase()}</strong>.</p>
          <p>To finalize your profile requirements (names, designation, and password) and start collaborating with your team, please click the button below:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Complete Onboarding
            </a>
          </div>
          <p style="color: #64748b; font-size: 11px; margin-top: 24px;">Note: This secure invitation link is personal and will expire in 7 days.</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
          &copy; ${new Date().getFullYear()} ${orgName} Workspace. All rights reserved.
        </div>
      </div>
    `;
  return { subject, text, html };
};

/**
 * Admin or Manager invites a user.
 * Generates an onboarding token and returns the signup link.
 */
export const inviteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ message: 'Email and role are required.' });
      return;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: `role must be one of: ${validRoles.join(', ')}.` });
      return;
    }

    // The route-level checkPermission('Users','Update') only confirms this
    // requester is allowed to invite *someone* — it doesn't distinguish which
    // role they're allowed to hand out. Only real Admins can invite into any
    // role; everyone else (Managers, or any custom RBAC role an Admin has
    // separately granted Users:Update to) can only bring on Employees. This
    // is deliberately an allow-list on 'ADMIN' rather than a deny-list on
    // 'MANAGER' specifically — the whole point of the custom RBAC system is
    // that Users:Update isn't only ever held by the built-in Manager role,
    // so a check that only special-cased MANAGER would leave a gap open for
    // any other role an Admin grants this permission to.
    if (req.user?.role !== 'ADMIN' && role !== 'EMPLOYEE') {
      res.status(403).json({ message: 'Only Admins can invite a new Manager or Admin. You can invite new Employees.' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email already exists.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

    // Upsert invitation
    const invitation = await prisma.invitation.upsert({
      where: { email },
      update: {
        role,
        token,
        invitedById: req.user!.id,
        isUsed: false,
        expiresAt,
        createdAt: new Date(),
      },
      create: {
        email,
        role,
        token,
        invitedById: req.user!.id,
        expiresAt,
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${token}`;

    // Send invitation email
    const orgName = await getOrgName();
    const { subject, text, html } = buildInvitationEmail(orgName, role, inviteLink);

    try {
      await sendEmail(email, subject, text, html);
    } catch (emailError) {
      console.error('Failed to send onboarding email:', emailError);
    }

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'INVITE_USER',
        details: `Invited user ${email} with role ${role}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    emitDataUpdate(req, 'invitations');

    res.status(201).json({
      message: 'Invitation generated and email sent successfully.',
      inviteLink,
      invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List every invitation (pending, accepted, and expired) so admins/managers
 * have visibility into onboarding that's in flight instead of the previous
 * write-only flow, where a sent invite vanished from view immediately.
 */
export const getInvitations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // invitedById is a plain string column, not a Prisma relation, so the
    // inviter's name is resolved with a small batched lookup instead of an
    // `include`.
    const inviterIds = [...new Set(invitations.map((i) => i.invitedById))];
    const inviters = inviterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const inviterMap = new Map(inviters.map((u) => [u.id, u]));

    const now = new Date();
    const result = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inviterMap.get(inv.invitedById) || null,
      status: inv.isUsed ? 'ACCEPTED' : inv.expiresAt < now ? 'EXPIRED' : 'PENDING',
    }));

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a pending invitation so its link can no longer be used to onboard.
 */
export const revokeInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const invite = await prisma.invitation.findUnique({ where: { id } });
    if (!invite) {
      res.status(404).json({ message: 'Invitation not found.' });
      return;
    }
    if (invite.isUsed) {
      res.status(400).json({ message: 'This invitation was already accepted — there is nothing left to revoke.' });
      return;
    }

    // Managers may only send Employee invites (see inviteUser) — hold them
    // to the same boundary when revoking someone else's invite. Allow-listed
    // on 'ADMIN' rather than deny-listed on 'MANAGER' for the same reason as
    // inviteUser: Users:Update isn't only ever held by the built-in Manager
    // role once custom RBAC roles are involved.
    if (req.user?.role !== 'ADMIN' && invite.role !== 'EMPLOYEE') {
      res.status(403).json({ message: 'Only Admins can manage a Manager or Admin invitation. You can manage Employee invitations.' });
      return;
    }

    await prisma.invitation.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'REVOKE_INVITATION',
        details: `Revoked invitation for ${invite.email}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    emitDataUpdate(req, 'invitations');

    res.status(200).json({ message: 'Invitation revoked.', id });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend a pending or expired invitation: issues a fresh token and
 * expiration, and re-sends the onboarding email, without making the admin
 * re-key the email address and role from scratch.
 */
export const resendInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const invite = await prisma.invitation.findUnique({ where: { id } });
    if (!invite) {
      res.status(404).json({ message: 'Invitation not found.' });
      return;
    }
    if (invite.isUsed) {
      res.status(400).json({ message: 'This invitation was already accepted — there is nothing to resend.' });
      return;
    }
    if (req.user?.role !== 'ADMIN' && invite.role !== 'EMPLOYEE') {
      res.status(403).json({ message: 'Only Admins can manage a Manager or Admin invitation. You can manage Employee invitations.' });
      return;
    }

    // The invited person may have since been onboarded some other way.
    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email already exists. Revoke this stale invitation instead.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invitation.update({
      where: { id },
      data: { token, expiresAt, isUsed: false },
    });

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${token}`;
    const orgName = await getOrgName();
    const { subject, text, html } = buildInvitationEmail(orgName, invite.role, inviteLink);

    try {
      await sendEmail(invite.email, subject, text, html);
    } catch (emailError) {
      console.error('Failed to resend onboarding email:', emailError);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'RESEND_INVITATION',
        details: `Resent invitation to ${invite.email}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    emitDataUpdate(req, 'invitations');

    res.status(200).json({ message: 'Invitation resent.', inviteLink });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify invitation token details.
 */
export const verifyInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Token is required.' });
      return;
    }

    const invite = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invite) {
      res.status(404).json({ message: 'Invalid invitation token.' });
      return;
    }

    if (invite.isUsed) {
      res.status(400).json({ message: 'This invitation has already been used.' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(400).json({ message: 'This invitation has expired.' });
      return;
    }

    res.status(200).json({
      message: 'Invitation is valid.',
      email: invite.email,
      role: invite.role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete onboarding and create account.
 */
export const completeOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, firstName, lastName, password, designation, location, skills } = req.body;

    if (!token || !firstName || !lastName || !password) {
      res.status(400).json({ message: 'Token, name, and password are required.' });
      return;
    }

    const invite = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invite || invite.isUsed || invite.expiresAt < new Date()) {
      res.status(400).json({ message: 'Invalid or expired invitation token.' });
      return;
    }

    // Check if user already exists (backup check)
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existingUser) {
      res.status(400).json({ message: 'An account has already been registered with this email.' });
      return;
    }

    const strengthCheck = checkPasswordStrength(password);
    if (!strengthCheck.valid) {
      res.status(400).json({ message: strengthCheck.message });
      return;
    }
    const identityCheck = checkPasswordAgainstIdentity(password, { email: invite.email, firstName, lastName });
    if (!identityCheck.valid) {
      res.status(400).json({ message: identityCheck.message });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve CustomRole matching the invite role
    // Role can be "ADMIN", "MANAGER", or "EMPLOYEE"
    const customRoleName = invite.role === 'ADMIN' ? 'Admin' : invite.role === 'MANAGER' ? 'Manager' : 'Employee';
    const roleRecord = await prisma.customRole.findUnique({
      where: { name: customRoleName },
    });

    // Create User
    const orgSettingsForTimezone = await getOrganizationSettings();
    const employeeId = await generateEmployeeId();
    const user = await prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        firstName,
        lastName,
        role: invite.role as any,
        designation: designation || (invite.role === 'MANAGER' ? 'Engineering Lead' : 'Staff Associate'),
        location: location || 'Remote',
        skills: skills || [],
        employeeId,
        customRoleId: roleRecord?.id || null,
        isVerified: true, // Auto-verified since they were invited by admin/manager
        timezone: orgSettingsForTimezone.defaultTimezone || 'UTC',
        settings: {
          create: {}, // Initialize default settings
        },
      },
    });

    // Mark invitation as used
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { isUsed: true },
    });

    // Create log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ONBOARD_COMPLETE',
        details: `User completed onboarding via invite token. Account created.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    // Trigger workflow automation engine on employee onboarding signup
    const { AutomationService } = require('../services/automation.service');
    const automationIo = req.app.get('io');
    AutomationService.trigger('EMPLOYEE_JOINED', {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }, automationIo).catch((err: any) => console.error('[Automation] EMPLOYEE_JOINED trigger failed:', err));

    emitDataUpdate(req, 'invitations');
    emitDataUpdate(req, 'users');

    res.status(201).json({
      message: 'Onboarding completed successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
