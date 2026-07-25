import prisma from '../config/db';

export interface DeleteAccountResult {
  ok: boolean;
  message?: string;
}

/**
 * Deletes a user account and the records that would otherwise violate a
 * restrict-delete constraint (invitations tied to their email, groups they
 * created). Extracted out of admin.controller.ts's adminDeleteUser so the
 * same safe path is used whether an Admin removes someone or a user deletes
 * their own account (see privacy.controller.ts) — previously only the admin
 * path existed at all, so there was no self-service "right to erasure" story.
 *
 * Deliberately still a hard delete, not an anonymize-in-place — that was
 * already this codebase's established pattern for adminDeleteUser before
 * this feature existed, so self-service deletion follows the same behavior
 * for consistency rather than introducing a second, different deletion
 * semantics. Business records that reference the user (tasks, messages,
 * audit logs, payslips) are governed by the schema's own onDelete behavior
 * (cascade/SetNull per relation) — this function doesn't second-guess that.
 */
export const deleteUserAccount = async (
  userId: string,
  initiatedBy: { id: string; isSelfService: boolean }
): Promise<DeleteAccountResult> => {
  const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
  if (!userToDelete) {
    return { ok: false, message: 'User not found.' };
  }

  if (userToDelete.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return { ok: false, message: 'This is the last remaining Admin account — the workspace must always have at least one Admin. Promote another user to Admin first.' };
    }
  }

  // Written BEFORE the delete transaction, and awaited (not the usual
  // fire-and-forget logAudit helper) — AuditLog.userId is a foreign key to
  // User, so this write must actually complete while the row it references
  // still exists, not race against the deletion that follows.
  await prisma.auditLog.create({
    data: {
      userId: initiatedBy.id,
      action: initiatedBy.isSelfService ? 'ACCOUNT_SELF_DELETED' : 'ADMIN_DELETE_USER',
      details: initiatedBy.isSelfService
        ? `User deleted their own account (${userToDelete.email}).`
        : `Deleted user ${userToDelete.email} (${userId}).`,
    },
  }).catch((err) => console.error('Audit log write failed before account deletion:', err));

  await prisma.$transaction(async (tx) => {
    await tx.invitation.deleteMany({ where: { email: userToDelete.email } });
    await tx.group.deleteMany({ where: { createdById: userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true };
};
