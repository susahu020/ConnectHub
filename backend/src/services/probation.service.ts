import prisma from '../config/db';
import { createNotification } from './notification.service';

// ==========================================
// PROBATION TRACKING
// ==========================================
// Previously nothing in the schema tracked probation at all — an Admin had
// no structured way to know who was still on probation or when it ended,
// short of remembering manually. This adds an Admin-settable
// User.probationEndDate plus a daily job that reminds the employee's
// manager a week out, so it doesn't depend on anyone remembering to check.

/** How many days out a reminder should fire. Not configurable per-org (yet) — a fixed, reasonable default. */
export const PROBATION_REMINDER_WINDOW_DAYS = 7;

/**
 * True when `probationEndDate` falls within [today, today + windowDays]
 * inclusive — i.e. "ending soon, but not already past". Pure/DB-free.
 * Dates are compared at the day level (time-of-day is ignored) since
 * probation end is a calendar-day concept, not a precise timestamp.
 */
export const isProbationEndingSoon = (
  probationEndDate: Date,
  referenceDate: Date,
  windowDays: number = PROBATION_REMINDER_WINDOW_DAYS
): boolean => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(referenceDate);
  const end = startOfDay(probationEndDate);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  return end.getTime() >= today.getTime() && end.getTime() <= windowEnd.getTime();
};

/**
 * Daily job (see index.ts) — finds active employees whose probation ends
 * within the reminder window and haven't already been reminded (dedup via
 * User.probationReminderSentAt, cleared whenever the date itself changes —
 * see updateEmployeeProbation in hr.controller.ts), notifies their
 * manager, and marks the reminder sent. An employee with no manager set is
 * skipped — there's no natural recipient for the reminder — rather than
 * falling back to some ambiguous "any Admin" notion.
 */
export const runProbationReminderCheck = async (io?: any): Promise<{ checked: number; remindersSent: number }> => {
  const candidates = await prisma.user.findMany({
    where: { isActive: true, probationEndDate: { not: null }, probationReminderSentAt: null },
    select: { id: true, firstName: true, lastName: true, probationEndDate: true, managerId: true },
  });

  const now = new Date();
  let remindersSent = 0;

  for (const employee of candidates) {
    if (!employee.probationEndDate || !isProbationEndingSoon(employee.probationEndDate, now)) continue;

    if (employee.managerId) {
      await createNotification({
        userId: employee.managerId,
        title: 'Probation Ending Soon',
        message: `${employee.firstName} ${employee.lastName}'s probation period ends on ${employee.probationEndDate.toLocaleDateString()} — worth a check-in before then.`,
        type: 'REMINDER',
        io,
      });
      remindersSent += 1;
    }

    // Marked sent either way (with or without a manager to notify) so a
    // manager-less employee doesn't get re-checked every single day for
    // the rest of the reminder window.
    await prisma.user.update({ where: { id: employee.id }, data: { probationReminderSentAt: now } });
  }

  return { checked: candidates.length, remindersSent };
};
