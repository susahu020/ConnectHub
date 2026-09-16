import prisma from '../config/db';

/**
 * Writes an audit log entry. Previously this was hand-rolled inline at each
 * call site (admin/auth/organization/rbac/team controllers), which is why
 * HR actions (leave/expense/payslip approval), task deletion, and profile
 * edits — exactly what a security review asks about first — had none at
 * all. New sensitive-action call sites should use this helper instead of
 * inlining `prisma.auditLog.create(...)` again.
 *
 * Deliberately fire-and-forget (never awaited by the caller, errors are
 * swallowed after logging to console) — an audit log write failing should
 * never be the reason a real request fails.
 */
export const logAudit = (
  req: { user?: { id: string } | null; ip?: string; headers: any },
  action: string,
  details: string
): void => {
  const userId = req.user?.id;
  if (!userId) return; // nothing meaningful to attribute the action to

  prisma.auditLog
    .create({
      data: {
        userId,
        action,
        details,
        ipAddress: req.ip || null,
        userAgent: (req.headers?.['user-agent'] as string) || null,
      },
    })
    .catch((err: unknown) => {
      console.error(`Audit log write failed for action "${action}":`, err);
    });
};
