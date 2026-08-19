import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { sendEmail } from '../config/mailer';
import { getOrgName, getOrganizationSettings } from '../services/organization.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { generateSecret, verifyTOTP, generateBackupCodes } from '../utils/twoFactor';
import { generateEmployeeId } from '../utils/employeeId';
import { checkPasswordStrength, checkPasswordAgainstIdentity } from '../utils/passwordPolicy';
import {
  isGoogleSsoAvailable,
  isGoogleSsoConfigured,
  createSsoState,
  verifySsoState,
  getGoogleAuthUrl,
  exchangeGoogleCode,
} from '../services/sso.service';
import {
  parseUserAgent,
  hashToken,
  checkFailedLoginLockout,
  registerFailedLogin,
  clearFailedLogins,
  checkFailedTwoFactorLockout,
  registerFailedTwoFactor,
  clearFailedTwoFactor,
  enforceDuplicateLoginPolicy,
  cacheSession,
  invalidateSessionCache,
  revokeSession,
  revokeSessions,
  notifyIfNewDevice
} from '../services/session.service';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-local-jwt-refresh-secret-123456';

// Options for the HttpOnly refresh-token cookie. This was previously always
// `sameSite: 'lax'`, which quietly breaks the moment the frontend and
// backend are on different domains (e.g. a Vercel frontend + a Render
// backend, or any other split-hosting setup) — Lax cookies are not sent on
// cross-site fetch/XHR requests (only on top-level navigations), so the
// browser would just never attach this cookie to the cross-origin
// `credentials: 'include'` call to /auth/refresh. Login itself would look
// like it worked (the Set-Cookie response succeeds either way), but the
// first token refresh after that would silently fail and the user would be
// logged out with no clear cause.
//
// SameSite=None is required for a cross-site cookie to actually be sent,
// but browsers reject SameSite=None unless Secure is also set — which in
// turn requires HTTPS, so this only applies when NODE_ENV=production (where
// both Render and Vercel serve over HTTPS by default). In local dev, both
// sides are on http://localhost, so Lax (and non-Secure) is correct there.
const isProd = process.env.NODE_ENV === 'production';
const getRefreshCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  ...(maxAge !== undefined ? { maxAge } : {}),
});

// Helper to generate access and refresh tokens
const generateTokens = (userId: string, email: string, sessionId: string, rememberMe: boolean) => {
  const accessToken = jwt.sign(
    { id: userId, email, sessionId },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshExpiresIn = rememberMe ? '30d' : '8h';
  const refreshToken = jwt.sign(
    { id: userId, email, sessionId },
    REFRESH_SECRET,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken, refreshExpiresIn };
};

// Resolver helper for mock location lookup
const resolveLocation = (ip: string): string => {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('172.') || ip.startsWith('192.')) {
    return 'Local Network';
  }
  return 'New York, US (Estimated)'; // Fallback mock location
};

// 1. REGISTER
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, designation } = req.body;

    const adminExists = await prisma.user.count({ where: { role: 'ADMIN' } });
    const role = adminExists === 0 ? 'ADMIN' : 'EMPLOYEE';

    // The very first account (bootstrap Admin) is always allowed through —
    // the org has to have one owner before registrationMode even means
    // anything. Every registration after that is gated by the admin's
    // chosen mode (see organization.controller.ts / OrganizationSettings).
    // This is deliberately separate from the invite flow (auth/invite/complete),
    // which always works regardless of this setting since an admin/manager
    // already explicitly chose to invite that exact email address.
    if (adminExists > 0) {
      const orgSettings = await getOrganizationSettings();
      const mode = orgSettings.registrationMode || 'INVITE_ONLY';

      if (mode === 'INVITE_ONLY') {
        res.status(403).json({
          message: 'Public registration is disabled for this workspace. Please ask an administrator to send you an invitation.',
        });
        return;
      }

      if (mode === 'DOMAIN_RESTRICTED') {
        const emailDomain = String(email).split('@')[1]?.toLowerCase();
        const allowedDomains: string[] = orgSettings.allowedDomains || [];
        const domainAllowed = !!emailDomain && allowedDomains.includes(emailDomain);
        if (!domainAllowed) {
          res.status(403).json({
            message: 'Self-registration is only open to company email addresses. Please ask an administrator to send you an invitation instead.',
          });
          return;
        }
      }
      // mode === 'OPEN' falls through with no restriction.
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email address already registered.' });
      return;
    }

    const identityCheck = checkPasswordAgainstIdentity(password, { email, firstName, lastName });
    if (!identityCheck.valid) {
      res.status(400).json({ message: identityCheck.message });
      return;
    }

    // Resolve the matching CustomRole so the granular RBAC permission checks
    // (checkPermission middleware on task/project/group/file/etc. routes) actually
    // work for this account, the same way the invitation-acceptance flow already
    // does it. Without this, a self-registered user has no customRoleId, and
    // hasPermission() denies everything by default for non-legacy-admins.
    const customRoleName = role === 'ADMIN' ? 'Admin' : 'Employee';
    const roleRecord = await prisma.customRole.findUnique({ where: { name: customRoleName } });

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const orgSettingsForTimezone = await getOrganizationSettings();
    const employeeId = await generateEmployeeId();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        designation,
        role,
        employeeId,
        customRoleId: roleRecord?.id || null,
        timezone: orgSettingsForTimezone.defaultTimezone || 'UTC',
        settings: {
          create: {}, // Initialize default settings
        },
        emailVerifications: {
          create: {
            otp,
            expiresAt: otpExpiry,
          },
        },
      },
    });

    // Send Verification Email
    const orgName = await getOrgName();
    const subject = `${orgName} - Verify Your Email`;
    const text = `Welcome to ${orgName}! Your email verification OTP is ${otp}. It will expire in 15 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to ${orgName}</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address using the one-time password (OTP) below:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0; color: #1e293b;">
          ${otp}
        </div>
        <p>This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">${orgName} Inc. - Enterprise Communication Platform</p>
      </div>
    `;

    try {
      await sendEmail(email, subject, text, html);
    } catch (mailError) {
      console.error('Failed to send verification email during register:', mailError);
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        details: `Registered account for ${email}`,
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(201).json({
      message: 'Registration successful. Verification OTP sent to email.',
      userId: user.id,
      email: user.email,
      ...(process.env.NODE_ENV === 'development' && { otp }), // Expose OTP in development for easy sandbox onboarding
    });
  } catch (error) {
    next(error);
  }
};

// 2. VERIFY EMAIL
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const verificationRecord = await prisma.emailVerification.findFirst({
      where: {
        otp,
        expiresAt: { gte: new Date() },
        user: { email },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      res.status(400).json({ message: 'Invalid or expired verification OTP.' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationRecord.userId },
        data: { isVerified: true },
      }),
      prisma.emailVerification.deleteMany({
        where: { userId: verificationRecord.userId },
      }),
    ]);

    res.status(200).json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// 3. LOGIN WITH SESSION RECORDING & LOCKOUTS
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    // A. Check Lockout Status
    const lockoutEndTime = await checkFailedLoginLockout(email);
    if (lockoutEndTime) {
      const minutesLeft = Math.ceil((lockoutEndTime.getTime() - Date.now()) / 60000);
      res.status(423).json({
        message: `Account temporarily locked due to excessive failed attempts. Please try again in ${minutesLeft} minute(s).`,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    });

    // B. Validate User Existence & Password
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const { locked, remainingAttempts } = await registerFailedLogin(email);
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'FAILED_LOGIN',
          details: `Failed password attempt. Locked: ${locked}`,
          ipAddress: req.ip,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });

      if (locked) {
        res.status(423).json({
          message: 'Account locked for 15 minutes due to 5 consecutive failed attempts.',
        });
      } else {
        res.status(401).json({
          message: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before lockout.`,
        });
      }
      return;
    }

    // C. Reset failed login limits on success
    await clearFailedLogins(email);

    // C2. Suspended accounts are blocked outright. This must run before the
    // 2FA and email-verification checks below — otherwise a suspended user
    // could complete the "unverified email" OTP flow (or Google SSO, which
    // auto-verifies) and effectively undo the admin's suspension themselves.
    if (user.isSuspended) {
      res.status(403).json({ message: 'Your account has been suspended. Contact your administrator.', code: 'USER_SUSPENDED' });
      return;
    }

    // C3. Inactive accounts are blocked the same way. Distinct from
    // isSuspended — this is the routine active/inactive toggle rather than
    // a security/administrative suspension — but it must gate login just
    // as strictly, and for the same reason (before 2FA/verification).
    if (!user.isActive) {
      res.status(403).json({ message: 'Your account is inactive. Contact your administrator.', code: 'USER_INACTIVE' });
      return;
    }

    // Two-Factor Authentication Check
    if (user.twoFactorEnabled) {
      const isRemember = !!rememberMe;
      const tempToken = jwt.sign(
        { id: user.id, rememberMe: isRemember, step2fa: true },
        ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      res.status(200).json({
        require2fa: true,
        tempToken,
        message: 'Two-factor authentication code required.',
      });
      return;
    }

    // D. Force OTP if unverified
    if (!user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          otp,
          expiresAt: otpExpiry,
        },
      });

      await sendEmail(
        email,
        `${await getOrgName()} - Verify Your Email`,
        `Please verify your email using OTP: ${otp}`,
        `<p>Please verify your email using OTP: <strong>${otp}</strong></p>`
      ).catch(e => console.error(e));

      res.status(403).json({
        message: 'Account not verified. A new OTP has been sent to your email.',
        code: 'USER_NOT_VERIFIED',
      });
      return;
    }

    // E. Enforce Concurrent Login Limit Policy
    await enforceDuplicateLoginPolicy(user.id);

    // F. Parse User Agent & Device info
    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
    const ipAddress = req.ip || '';
    const location = resolveLocation(ipAddress);

    // G. Create new Session Record
    const sessionRecord = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName,
        browser,
        operatingSystem,
        ipAddress,
        location,
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000), // 30 days vs 8 hours (represented as 1 day for safety here, let's make it exactly 8h or 30d)
      },
    });

    const isRemember = !!rememberMe;
    const sessionLifespan = isRemember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionLifespan);
    
    // Update session expiration date
    await prisma.session.update({
      where: { id: sessionRecord.id },
      data: { expiresAt },
    });

    // H. Token Generation
    const { accessToken, refreshToken, refreshExpiresIn } = generateTokens(
      user.id,
      user.email,
      sessionRecord.sessionId,
      isRemember
    );

    // Hash refresh token for DB security
    const refreshTokenHash = hashToken(refreshToken);
    await prisma.session.update({
      where: { id: sessionRecord.id },
      data: { refreshTokenHash },
    });

    // Cache active session in Redis
    await cacheSession(sessionRecord.sessionId, {
      userId: user.id,
      email: user.email,
      accessTokenVersion: 1,
      expiresAt: expiresAt.getTime(),
    }, sessionLifespan / 1000);

    // Fire-and-forget: never let alerting delay or fail the login itself
    // (the helper already catches its own errors internally).
    notifyIfNewDevice(user.id, user.email, sessionRecord.sessionId, browser, operatingSystem, location, ipAddress);

    // Update status and last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        status: 'ONLINE',
        lastLoginAt: new Date()
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Successful login from ${browser} / ${operatingSystem}`,
        ipAddress: req.ip,
        userAgent: userAgentStr || null,
      },
    });

    // Strip password and 2FA secret material — the frontend never reads
    // these off a user object (only the dedicated /auth/2fa/setup response
    // carries a secret, once, during enrollment), so there's no reason for
    // them to go out over the wire on every login.
    const { passwordHash: _, twoFactorSecret: __, twoFactorBackupCodes: ___, ...safeUser } = user;

    // Set refresh token in secure HttpOnly cookie
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(sessionLifespan));

    res.status(200).json({
      message: 'Login successful',
      user: safeUser,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// 4. LOGOUT CURRENT DEVICE
export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (userId && sessionId) {
      // Invalidate current session
      await revokeSession(sessionId, 'LOGOUT', 'User logged out manually');

      // Check if user has any other active sessions
      const otherActiveSessions = await prisma.session.findMany({
        where: { userId, isRevoked: false, expiresAt: { gte: new Date() } },
      });

      // Only set status to OFFLINE if no other active devices exist
      if (otherActiveSessions.length === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE' },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'USER_LOGOUT',
          details: 'Logged out successfully from current device',
          ipAddress: req.ip,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });
    }

    res.clearCookie('refreshToken', getRefreshCookieOptions());
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// 5. REFRESH TOKEN ROTATION WITH REPLAY DETECTION
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token is required.' });
      return;
    }

    // Verify token signature
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      res.status(401).json({ message: 'Invalid refresh token.' });
      return;
    }

    const { id: userId, email, sessionId } = decoded;
    const incomingTokenHash = hashToken(refreshToken);

    // Fetch associated session
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    // A. Replay Attack Detection
    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ message: 'Session expired or invalid.', code: 'SESSION_EXPIRED' });
      return;
    }

    if (session.isRevoked) {
      // Surface *why* this session died (single-session policy kicked it
      // out, an admin force-logged-out or suspended the account, a password
      // change invalidated it, etc.) rather than a generic "expired" — the
      // person sitting at this now-dead session otherwise has no way to
      // tell a silent bug apart from an intentional security action. The
      // frontend (services/api.ts + components/providers.tsx) maps this
      // code to a human-readable toast before redirecting to /login.
      res.status(401).json({
        message: 'This session has been signed out.',
        code: session.revokedReason || 'SESSION_REVOKED',
      });
      return;
    }

    if (session.refreshTokenHash !== incomingTokenHash) {
      // Token reuse detected! Invalidate the entire session
      await revokeSession(sessionId, 'REPLAY_ATTACK_DETECTED', 'Rotated refresh token presented twice');
      
      // Log critical security breach
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUSPICIOUS_LOGIN',
          details: `Replay attack detected: reuse of rotated refresh token for session ${sessionId}`,
          ipAddress: req.ip,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });

      res.clearCookie('refreshToken', getRefreshCookieOptions());
      res.status(401).json({ message: 'Session compromised. Forced logout triggered.' });
      return;
    }

    // B. Issue New Rotated Tokens
    // Calculate remaining session lifetime
    const sessionLifespan = session.expiresAt.getTime() - Date.now();
    const isRemember = sessionLifespan > 8 * 60 * 60 * 1000; // Remember me if lifespan > 8h

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      userId,
      email,
      sessionId,
      isRemember
    );

    const newHash = hashToken(newRefreshToken);

    // Update session record
    await prisma.session.update({
      where: { sessionId },
      data: {
        refreshTokenHash: newHash,
        lastActivity: new Date(),
      },
    });

    // Refresh Redis session cache
    await cacheSession(sessionId, {
      userId,
      email,
      accessTokenVersion: session.accessTokenVersion,
      expiresAt: session.expiresAt.getTime(),
    }, sessionLifespan / 1000);

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions(sessionLifespan));

    res.status(200).json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// 6. LOGOUT OTHER DEVICES (LOGOUT ALL EXCEPT CURRENT)
export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const currentSessionId = req.sessionId;

    if (!userId || !currentSessionId) {
      res.status(400).json({ message: 'Invalid request context.' });
      return;
    }

    // Revoke every other active session in parallel (see revokeSessions'
    // doc comment for why this used to be a sequential loop).
    await revokeSessions(
      { userId, sessionId: { not: currentSessionId }, isRevoked: false },
      'FORCE_OUT',
      'Logged out remotely by user'
    );

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FORCED_LOGOUT',
        details: 'Logged out all other remote active sessions',
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({ message: 'Successfully logged out of all other devices.' });
  } catch (error) {
    next(error);
  }
};

// 7. EXTEND SESSION (ACTIVITY HEARTBEAT)
export const extendSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.sessionId;

    if (sessionId) {
      // Update session lastActivity timestamp
      await prisma.session.update({
        where: { sessionId },
        data: { lastActivity: new Date() },
      });

      // Update Redis cache
      const cached = await prisma.session.findUnique({ where: { sessionId } });
      if (cached) {
        const ttlSeconds = (cached.expiresAt.getTime() - Date.now()) / 1000;
        await cacheSession(sessionId, {
          userId: cached.userId,
          accessTokenVersion: cached.accessTokenVersion,
          expiresAt: cached.expiresAt.getTime(),
        }, ttlSeconds);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// 8. ADMIN FORCE LOGOUT A USER
export const adminLogoutUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({ message: 'Target User ID is required.' });
      return;
    }

    // Revoke every active session for this user in parallel
    await revokeSessions({ userId: targetUserId, isRevoked: false }, 'ADMIN_LOGOUT', 'Logged out by Administrator');

    // Update status
    await prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'OFFLINE' },
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_LOGOUT',
        details: `Administrator forced logout for user ID: ${targetUserId}`,
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({ message: 'User sessions successfully terminated.' });
  } catch (error) {
    next(error);
  }
};

// 9. ADMIN FORCE LOGOUT ALL SESSIONS GLOBALLY
export const adminLogoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Revoke every active session, company-wide, in parallel. This is the
    // call site where the old sequential one-by-one loop hurt the most —
    // it could mean revoking hundreds/thousands of sessions one HTTP
    // request at a time.
    await revokeSessions({ isRevoked: false }, 'ADMIN_LOGOUT_ALL', 'Global termination by Administrator');

    // Set all users status to offline
    await prisma.user.updateMany({
      data: { status: 'OFFLINE' },
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_LOGOUT',
        details: 'Administrator forced global logout for all users',
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({ message: 'Global logout triggered. All user sessions invalidated.' });
  } catch (error) {
    next(error);
  }
};

// 10. FORGOT PASSWORD
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(200).json({ message: 'If user exists, a password reset link has been sent.' });
      return;
    }

    const token = jwt.sign({ id: user.id }, ACCESS_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Reset Link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const orgNameForReset = await getOrgName();
    const subject = `${orgNameForReset} - Reset Your Password`;
    const text = `Reset your password by visiting: ${resetUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password. You can reset it by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; font-size: 14px; color: #64748b;">${resetUrl}</p>
        <p>This link is valid for 1 hour. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">${orgNameForReset} Inc.</p>
      </div>
    `;

    await sendEmail(email, subject, text, html).catch(e => console.error(e));

    res.status(200).json({ message: 'If user exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

// 11. RESET PASSWORD
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: { gte: new Date() },
      },
    });

    if (!resetRecord) {
      res.status(400).json({ message: 'Invalid or expired password reset token.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Change password, revoke reset tokens, and terminate active sessions
    await revokeSessions(
      { userId: resetRecord.userId, isRevoked: false },
      'PASSWORD_CHANGE',
      'Forced session termination due to password reset'
    );

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    res.status(200).json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// 12. CHANGE PASSWORD (REVOKES OTHER SESSIONS OPTIONALLY)
export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const currentSessionId = req.sessionId;
    const { currentPassword, newPassword, logoutOthers } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      res.status(400).json({ message: 'Missing parameters.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password.' });
      return;
    }

    const strengthCheck = checkPasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      res.status(400).json({ message: strengthCheck.message });
      return;
    }
    const identityCheck = checkPasswordAgainstIdentity(newPassword, { email: user.email, firstName: user.firstName, lastName: user.lastName });
    if (!identityCheck.valid) {
      res.status(400).json({ message: identityCheck.message });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // If logoutOthers is true, revoke other active sessions
    if (logoutOthers && currentSessionId) {
      await revokeSessions(
        { userId, sessionId: { not: currentSessionId }, isRevoked: false },
        'PASSWORD_CHANGE',
        'Forced session logout due to password change'
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        details: `Password changed successfully. Remote devices revoked: ${!!logoutOthers}`,
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete second-step 2FA login verification.
 */
export const verifyLogin2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      res.status(400).json({ message: 'Temporary session token and verification code are required.' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, ACCESS_SECRET);
      if (!decoded.step2fa) {
        throw new Error('Invalid token step');
      }
    } catch (err) {
      res.status(401).json({ message: 'Invalid or expired 2FA login session.' });
      return;
    }

    const userId = decoded.id;
    const isRemember = !!decoded.rememberMe;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ message: 'Two-Factor Authentication is not active on this account.' });
      return;
    }

    // Account-level lockout for the 2FA code itself. A TOTP code is only 6
    // digits (1,000,000 combinations) and a stolen/guessed password already
    // gets an attacker past step one, so this step needs its own brute-force
    // protection — mirrors the password lockout in login() above, tracked
    // as a separate counter (by userId) so it doesn't share state with
    // failed password attempts.
    const lockoutEndTime = await checkFailedTwoFactorLockout(user.id);
    if (lockoutEndTime) {
      const minutesLeft = Math.ceil((lockoutEndTime.getTime() - Date.now()) / 60000);
      res.status(423).json({
        message: `Too many failed authentication attempts. Please try again in ${minutesLeft} minute(s).`,
      });
      return;
    }

    let isValid = verifyTOTP(code, user.twoFactorSecret);

    // Support backup recovery code login
    if (!isValid && user.twoFactorBackupCodes) {
      const backupList = user.twoFactorBackupCodes.split(',');
      const foundIdx = backupList.indexOf(code);
      if (foundIdx !== -1) {
        isValid = true;
        backupList.splice(foundIdx, 1);
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: backupList.join(',') },
        });
      }
    }

    if (!isValid) {
      const { locked, remainingAttempts } = await registerFailedTwoFactor(user.id);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'FAILED_LOGIN',
          details: `Failed 2FA code attempt. Locked: ${locked}`,
          ipAddress: req.ip,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });

      if (locked) {
        res.status(423).json({
          message: 'Too many failed authentication attempts. Please try again in 15 minutes.',
        });
      } else {
        res.status(401).json({
          message: `Invalid authentication token code. ${remainingAttempts} attempt(s) remaining before lockout.`,
        });
      }
      return;
    }

    await clearFailedTwoFactor(user.id);

    // Re-check suspension/active status here too — the account could have
    // been suspended or deactivated in the window between the password step
    // (which already checked this) and completing 2FA.
    if (user.isSuspended) {
      res.status(403).json({ message: 'Your account has been suspended. Contact your administrator.', code: 'USER_SUSPENDED' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ message: 'Your account is inactive. Contact your administrator.', code: 'USER_INACTIVE' });
      return;
    }

    await enforceDuplicateLoginPolicy(user.id);

    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
    const ipAddress = req.ip || '';
    const location = resolveLocation(ipAddress);

    const sessionLifespan = isRemember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionLifespan);

    const sessionRecord = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName,
        browser,
        operatingSystem,
        ipAddress,
        location,
        expiresAt,
      },
    });

    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      sessionRecord.sessionId,
      isRemember
    );

    const refreshTokenHash = hashToken(refreshToken);
    await prisma.session.update({
      where: { id: sessionRecord.id },
      data: { refreshTokenHash },
    });

    await cacheSession(sessionRecord.sessionId, {
      userId: user.id,
      email: user.email,
      accessTokenVersion: 1,
      expiresAt: expiresAt.getTime(),
    }, sessionLifespan / 1000);

    notifyIfNewDevice(user.id, user.email, sessionRecord.sessionId, browser, operatingSystem, location, ipAddress);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        status: 'ONLINE',
        lastLoginAt: new Date()
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_2FA_VERIFIED_LOGIN',
        details: `Successful 2FA login via ${browser} / ${operatingSystem}`,
        ipAddress: req.ip,
        userAgent: userAgentStr || null,
      },
    });

    const { passwordHash: _, twoFactorSecret: __, twoFactorBackupCodes: ___, ...safeUser } = user;

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(sessionLifespan));

    res.status(200).json({
      message: 'Login successful',
      user: safeUser,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Setup 2FA configuration secret and QR code.
 */
export const setup2FA = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const secret = generateSecret();
    const orgNameFor2FA = await getOrgName();
    const label = `${orgNameFor2FA}:${user.email}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(orgNameFor2FA)}`;

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    res.status(200).json({
      secret,
      qrCodeUrl,
      otpauthUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and activate 2FA setup.
 */
export const activate2FA = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { token } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ message: 'Two-factor setup has not been initialized.' });
      return;
    }

    const isValid = verifyTOTP(token, user.twoFactorSecret);
    if (!isValid) {
      res.status(400).json({ message: 'Verification failed. Incorrect 2FA token.' });
      return;
    }

    const backupCodesList = generateBackupCodes();
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodesList.join(','),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: '2FA_ENABLED',
        details: 'User enabled Two-Factor Authentication.',
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({
      message: 'Two-factor authentication successfully activated.',
      backupCodes: backupCodesList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable 2FA.
 */
export const disable2FA = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { token } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ message: 'Two-factor is already disabled.' });
      return;
    }

    const isValid = verifyTOTP(token, user.twoFactorSecret);
    if (!isValid) {
      res.status(400).json({ message: 'Verification failed. Incorrect 2FA token.' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: '2FA_DISABLED',
        details: 'User disabled Two-Factor Authentication.',
        ipAddress: req.ip,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(200).json({
      message: 'Two-factor authentication disabled.',
    });
  } catch (error) {
    next(error);
  }
};

export const sendContactMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ message: 'Name, email, and message are required.' });
      return;
    }

    const orgSettings = await getOrganizationSettings();
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    const adminEmail = orgSettings.supportEmail || adminUser?.email || process.env.SMTP_USER;
    if (!adminEmail) {
      res.status(500).json({ message: 'No support email is configured to receive contact messages. Set an Org support email or SMTP_USER.' });
      return;
    }

    const subject = `New Contact Form Message from ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 15px;">
          <h4 style="margin-top: 0; color: #111827;">Message:</h4>
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #4b5563;">${message}</p>
        </div>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
          This message was sent from the ${orgSettings.orgName} contact form.
        </p>
      </div>
    `;

    await sendEmail(adminEmail, subject, text, html);

    res.status(200).json({
      message: 'Message sent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/sso/google — kicks off the Google OAuth flow by redirecting the
 * browser to Google's consent screen. See services/sso.service.ts for the
 * full design rationale.
 */
export const initiateGoogleSso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const available = await isGoogleSsoAvailable();
    if (!available) {
      const reason = isGoogleSsoConfigured() ? 'disabled by your administrator' : 'not configured for this workspace';
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?ssoError=${encodeURIComponent(`Google sign-in is ${reason}.`)}`);
      return;
    }

    const state = createSsoState();
    res.redirect(getGoogleAuthUrl(state));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/sso/google/callback — Google redirects here with an
 * authorization code after the user approves access. Exchanges the code,
 * finds or creates the matching account (respecting the same
 * registrationMode rules as normal self-registration), issues a session
 * exactly like a password login would, and redirects into the app with the
 * access token. The refresh token still goes into the same HttpOnly cookie
 * password login uses — only the short-lived access token needs to travel
 * via URL param, and only for the one hop to the SSO callback page, which
 * immediately stores it and drops it from the URL.
 *
 * This mirrors login()'s session-issuance steps (E through the cookie-set)
 * rather than importing/refactoring login() itself — the two flows diverge
 * completely before that point (password check vs OAuth identity), and
 * duplicating ~40 lines here was judged lower-risk than restructuring the
 * existing, already-hardened login() path. Worth extracting into a shared
 * helper as a follow-up if a third auth method is ever added.
 */
export const googleSsoCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const failRedirect = (message: string) => res.redirect(`${frontendUrl}/login?ssoError=${encodeURIComponent(message)}`);

  try {
    const available = await isGoogleSsoAvailable();
    if (!available) {
      failRedirect('Google sign-in is not available for this workspace.');
      return;
    }

    const { code, state, error: googleError } = req.query;

    if (googleError) {
      failRedirect('Google sign-in was cancelled.');
      return;
    }
    if (!code || typeof code !== 'string' || !state || typeof state !== 'string' || !verifySsoState(state)) {
      failRedirect('Your sign-in link expired or was invalid. Please try again.');
      return;
    }

    let googleUser;
    try {
      googleUser = await exchangeGoogleCode(code);
    } catch (err: any) {
      console.error('Google SSO exchange failed:', err);
      failRedirect('Could not verify your Google account. Please try again.');
      return;
    }

    if (!googleUser.email_verified) {
      failRedirect('Your Google email address is not verified. Please verify it with Google first.');
      return;
    }

    const email = googleUser.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Same account-creation gating as register() — first-ever account
      // always becomes Admin (bootstrap); after that, respect registrationMode.
      const adminExists = await prisma.user.count({ where: { role: 'ADMIN' } });
      const role = adminExists === 0 ? 'ADMIN' : 'EMPLOYEE';

      if (adminExists > 0) {
        const orgSettings = await getOrganizationSettings();
        const mode = orgSettings.registrationMode || 'INVITE_ONLY';

        if (mode === 'INVITE_ONLY') {
          failRedirect('This workspace is invite-only. Ask an administrator to send you an invitation, then sign in with Google afterward.');
          return;
        }
        if (mode === 'DOMAIN_RESTRICTED') {
          const emailDomain = email.split('@')[1];
          const allowedDomains: string[] = orgSettings.allowedDomains || [];
          if (!allowedDomains.includes(emailDomain)) {
            failRedirect('Self sign-up is limited to approved company email domains for this workspace.');
            return;
          }
        }
      }

      const orgSettingsForTimezone = await getOrganizationSettings();
      const employeeId = await generateEmployeeId();
      // SSO-created accounts still need *some* passwordHash (the column is
      // required) — generate a long random one the user will never see or
      // need; they can set a real password later via "Forgot Password" if
      // they ever want password-based login too.
      const unusablePassword = crypto.randomBytes(32).toString('hex');
      const randomPasswordHash = await bcrypt.hash(unusablePassword, 10);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomPasswordHash,
          firstName: googleUser.given_name || email.split('@')[0],
          lastName: googleUser.family_name || '',
          avatarUrl: googleUser.picture || null,
          role,
          employeeId,
          isVerified: true, // Google already verified this email address
          ssoProvider: 'GOOGLE',
          timezone: orgSettingsForTimezone.defaultTimezone || 'UTC',
          settings: { create: {} },
        },
      });
    } else if (!user.ssoProvider) {
      // Existing password-based account signing in via Google for the first
      // time — link it (doesn't remove their password login option).
      await prisma.user.update({ where: { id: user.id }, data: { ssoProvider: 'GOOGLE' } });
    }

    // Suspended accounts must not be able to sign back in via Google, which
    // would otherwise auto-verify them below and silently undo the suspension.
    if (user.isSuspended) {
      failRedirect('Your account has been suspended. Contact your administrator.');
      return;
    }

    // Same as above, but for the separate active/inactive toggle.
    if (!user.isActive) {
      failRedirect('Your account is inactive. Contact your administrator.');
      return;
    }

    if (!user.isVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }

    // --- From here down mirrors login()'s session-issuance (steps E-H) ---
    await enforceDuplicateLoginPolicy(user.id);

    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const { browser, operatingSystem, deviceName } = parseUserAgent(userAgentStr);
    const ipAddress = req.ip || '';
    const location = resolveLocation(ipAddress);

    const sessionRecord = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName,
        browser,
        operatingSystem,
        ipAddress,
        location,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const sessionLifespan = 8 * 60 * 60 * 1000; // SSO sessions default to a standard 8h session (no "remember me" step in this flow)
    const expiresAt = new Date(Date.now() + sessionLifespan);
    await prisma.session.update({ where: { id: sessionRecord.id }, data: { expiresAt } });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, sessionRecord.sessionId, false);

    const refreshTokenHash = hashToken(refreshToken);
    await prisma.session.update({ where: { id: sessionRecord.id }, data: { refreshTokenHash } });

    await cacheSession(sessionRecord.sessionId, {
      userId: user.id,
      email: user.email,
      accessTokenVersion: 1,
      expiresAt: expiresAt.getTime(),
    }, sessionLifespan / 1000);

    notifyIfNewDevice(user.id, user.email, sessionRecord.sessionId, browser, operatingSystem, location, ipAddress);

    await prisma.user.update({ where: { id: user.id }, data: { status: 'ONLINE', lastLoginAt: new Date() } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Successful Google SSO login from ${browser} / ${operatingSystem}`,
        ipAddress: req.ip,
        userAgent: userAgentStr || null,
      },
    });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(sessionLifespan));

    res.redirect(`${frontendUrl}/sso-callback?accessToken=${encodeURIComponent(accessToken)}`);
  } catch (error) {
    console.error('Google SSO callback failed:', error);
    failRedirect('Something went wrong signing you in with Google. Please try again.');
  }
};
