import prisma from '../config/db';

/**
 * A user's "reporting manager" is whoever is set as their manager (User.managerId).
 * That relationship — not just holding the MANAGER role in general — is what
 * carries approval authority over that specific employee's HR requests
 * (leave, expense, shift-swap):
 *   - Admins can approve/reject anything (org-wide authority).
 *   - Managers can only approve/reject requests for users who report directly to them.
 *   - A manager who is not that employee's reporting manager is treated like any
 *     other employee for that request (no special authority).
 *
 * Extracted out of hr.controller.ts into its own module specifically so this —
 * the exact rule this project got wrong before ("any manager could approve
 * anyone's leave/expense/payslip") — has direct unit test coverage instead of
 * only being reachable through a full HTTP request against a live database.
 * See __tests__/approval.service.test.ts.
 */
export const isAuthorizedApprover = async (
  approverId: string,
  approverRole: string,
  targetUserId: string
): Promise<boolean> => {
  if (approverRole === 'ADMIN') return true;
  if (approverRole !== 'MANAGER') return false;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { managerId: true },
  });

  return !!target && target.managerId === approverId;
};

export const isManagerOrAdmin = (role: string): boolean => role === 'ADMIN' || role === 'MANAGER';
