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

/**
 * The set of user IDs a caller is allowed to see HR *records* for (leave
 * requests, expense claims, attendance, shift swaps, payslips, etc.) — as
 * opposed to `isAuthorizedApprover`, which governs who can actually approve
 * a specific request. Both use the same underlying reporting-line data, but
 * they were previously two different code paths that had drifted apart:
 * approve/reject actions already checked `User.managerId`, while the "list
 * everything" reads only checked `isManagerOrAdmin(role)` and returned every
 * employee in the company regardless of who they report to.
 *
 * Returns:
 *   - null       -> unrestricted (Admins see everyone)
 *   - string[]   -> the caller may only see records belonging to these user
 *                    IDs (their own, plus — for Managers — their direct
 *                    reports')
 *
 * A Manager who has no direct reports still sees their own records; they are
 * not treated as unrestricted just because `isManagerOrAdmin` is true.
 */
export const getVisibleUserIds = async (
  requesterId: string,
  requesterRole: string
): Promise<string[] | null> => {
  if (requesterRole === 'ADMIN') return null;

  if (requesterRole === 'MANAGER') {
    const directReports: { id: string }[] = await prisma.user.findMany({
      where: { managerId: requesterId },
      select: { id: true },
    });
    return [requesterId, ...directReports.map((u) => u.id)];
  }

  return [requesterId];
};
