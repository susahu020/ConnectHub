import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email already exists.' });
      return;
    }

    // Check if an unused invitation already exists for this email
    const existingInvite = await prisma.invitation.findUnique({
      where: { email },
    });
    if (existingInvite && !existingInvite.isUsed && existingInvite.expiresAt > new Date()) {
      res.status(400).json({ 
        message: 'An active invitation already exists for this email.',
        inviteLink: `http://localhost:3000/register?token=${existingInvite.token}`
      });
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

    const inviteLink = `http://localhost:3000/register?token=${token}`;

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'INVITE_USER',
        details: `Invited user ${email} with role ${role}`,
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.status(201).json({
      message: 'Invitation generated successfully.',
      inviteLink,
      invitation,
    });
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

    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve CustomRole matching the invite role
    // Role can be "ADMIN", "MANAGER", or "EMPLOYEE"
    const customRoleName = invite.role === 'ADMIN' ? 'Admin' : invite.role === 'MANAGER' ? 'Manager' : 'Employee';
    const roleRecord = await prisma.customRole.findUnique({
      where: { name: customRoleName },
    });

    // Create User
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
        customRoleId: roleRecord?.id || null,
        isVerified: true, // Auto-verified since they were invited by admin/manager
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
