import prisma from '../config/db';
import { createNotification } from './notification.service';
import { sendEmail } from '../config/mailer';

// Two condition formats are supported, for backward compatibility:
//   1. Legacy flat format: { key: value, key2: value2 } — every key must
//      equal the payload's value for that key (AND-only, exact equality
//      only). Existing workflows saved before the format below existed
//      still work exactly as they did.
//   2. Rule-group format: { logic: 'ALL' | 'ANY', rules: [{ field,
//      operator, value }] } — supports AND (`ALL`) or OR (`ANY`)
//      combination, and operators beyond plain equality (equals,
//      not_equals, contains, greater_than, less_than). This is what the
//      condition builder UI now writes; the old format is still read
//      correctly for anything created before this existed.
//
// Exported as a standalone function (rather than kept as a private class
// method) specifically so it has direct unit test coverage — see
// __tests__/automation.service.test.ts — instead of only being reachable
// through AutomationService.trigger()'s full DB-backed flow.
export function conditionsMatch(conditions: any, payload: any): boolean {
  if (!conditions || typeof conditions !== 'object') return true;

  if (Array.isArray(conditions.rules)) {
    const rules: Array<{ field: string; operator: string; value: any }> = conditions.rules;
    if (rules.length === 0) return true;
    const logic = conditions.logic === 'ANY' ? 'ANY' : 'ALL';
    const evalRule = (rule: { field: string; operator: string; value: any }): boolean => {
      const actual = payload?.[rule.field];
      switch (rule.operator) {
        case 'not_equals':
          return actual !== rule.value;
        case 'contains':
          return typeof actual === 'string' && actual.includes(String(rule.value));
        case 'greater_than':
          return typeof actual === 'number' && actual > Number(rule.value);
        case 'less_than':
          return typeof actual === 'number' && actual < Number(rule.value);
        case 'equals':
        default:
          return actual === rule.value;
      }
    };
    return logic === 'ANY' ? rules.some(evalRule) : rules.every(evalRule);
  }

  const keys = Object.keys(conditions);
  if (keys.length === 0) return true;
  return keys.every((key) => payload?.[key] === conditions[key]);
}

export class AutomationService {
  /**
   * Triggers a workflow event
   * @param triggerName The trigger type: "TASK_COMPLETED", "EMPLOYEE_JOINED", "DOCUMENT_UPLOADED", "LEAVE_REQUESTED", "EMPLOYEE_OFFBOARDED", "ATTENDANCE_ANOMALY_DETECTED", "REGULARIZATION_REQUESTED"
   * @param payload Context info for the trigger
   * @param io Optional Socket.IO server instance, so automation-generated
   *           notifications get the same real-time delivery as every other
   *           notification in the app instead of only appearing after a
   *           manual refetch.
   */
  static async trigger(triggerName: string, payload: any, io?: any): Promise<void> {
    try {
      console.log(`[Automation] Triggered: ${triggerName}`, payload);

      // Find all active workflows for this trigger
      const activeWorkflows = await prisma.workflow.findMany({
        where: { trigger: triggerName, isActive: true },
      });

      for (const flow of activeWorkflows) {
        if (!conditionsMatch(flow.conditions, payload)) {
          console.log(`[Automation] Skipping "${flow.name}" — conditions did not match payload.`);
          continue;
        }

        console.log(`[Automation] Executing workflow: "${flow.name}" (Action: ${flow.action})`);

        try {
          switch (flow.action) {
            case 'NOTIFY_MANAGER':
              await this.handleNotifyManager(payload, io);
              break;
            case 'ASSIGN_ONBOARDING_TASKS':
              await this.handleAssignOnboardingTasks(payload);
              break;
            case 'ASSIGN_OFFBOARDING_TASKS':
              await this.handleAssignOffboardingTasks(payload, io);
              break;
            case 'NOTIFY_TEAM':
              await this.handleNotifyTeam(payload, io);
              break;
            case 'SEND_EMAIL_ONLY':
              await this.handleSendEmailOnly(flow, payload);
              break;
            default:
              console.warn(`[Automation] Unrecognized action: ${flow.action}`);
          }
          await this.logRun(flow, 'SUCCESS', payload);
        } catch (err) {
          console.error(`[Automation] Failed executing workflow "${flow.name}":`, err);
          await this.logRun(flow, 'FAILED', payload, err);
        }
      }
    } catch (error) {
      console.error('[Automation] Trigger execution failed:', error);
    }
  }

  // Records each execution attempt so admins can see, from the UI, whether
  // a rule actually ran and why it failed — previously this only existed
  // as a console.log line that nobody but the server operator could see.
  // Logging failures here are swallowed on purpose: a broken audit trail
  // must never be the reason a workflow action itself appears to fail.
  private static async logRun(
    flow: { id: string; trigger: string; action: string },
    status: 'SUCCESS' | 'FAILED',
    payload: any,
    err?: unknown,
  ): Promise<void> {
    try {
      await prisma.workflowRun.create({
        data: {
          workflowId: flow.id,
          trigger: flow.trigger,
          action: flow.action,
          status,
          error: err ? (err instanceof Error ? err.message : String(err)) : null,
          payload,
        },
      });
    } catch (logErr) {
      console.error('[Automation] Failed to record workflow run:', logErr);
    }
  }

  // Action: Notify Manager
  // Handles four payload shapes, all boiling down to "tell this employee's
  // manager something happened": task completion ({ taskTitle, assigneeId }),
  // leave requests ({ leaveType, requesterId }), offboarding
  // ({ offboardedUserId }), and attendance anomalies ({ employeeId,
  // anomalies }). Resolved into a single `kind` up front rather than a
  // growing ternary chain, since a plain if/else-if reads far more clearly
  // once there are more than two or three shapes to support.
  private static async handleNotifyManager(payload: any, io?: any): Promise<void> {
    const { taskTitle, assigneeId, leaveType, requesterId, offboardedUserId, employeeId: anomalyEmployeeId, anomalies, regularizationDate } = payload;
    const targetEmployeeId = assigneeId || requesterId || offboardedUserId || anomalyEmployeeId;
    if (!targetEmployeeId) return;

    // requesterId alone is ambiguous between LEAVE_REQUESTED and
    // REGULARIZATION_REQUESTED (both use the same field name for "who
    // asked") — regularizationDate is only ever present on the latter, so
    // it disambiguates.
    type NotifyKind = 'TASK_COMPLETED' | 'LEAVE_REQUEST' | 'OFFBOARDING' | 'ATTENDANCE_ANOMALY' | 'REGULARIZATION_REQUEST';
    const kind: NotifyKind = regularizationDate
      ? 'REGULARIZATION_REQUEST'
      : requesterId
      ? 'LEAVE_REQUEST'
      : offboardedUserId
      ? 'OFFBOARDING'
      : anomalyEmployeeId
      ? 'ATTENDANCE_ANOMALY'
      : 'TASK_COMPLETED';

    // Find employee and their manager
    const employee = await prisma.user.findUnique({
      where: { id: targetEmployeeId },
      select: { firstName: true, lastName: true, managerId: true },
    });
    if (!employee || !employee.managerId) return;

    const titles: Record<NotifyKind, string> = {
      TASK_COMPLETED: 'Task Completed by Direct Report',
      LEAVE_REQUEST: 'New Leave Request',
      OFFBOARDING: 'Direct Report Offboarded',
      ATTENDANCE_ANOMALY: 'Attendance Anomaly Detected',
      REGULARIZATION_REQUEST: 'Attendance Correction Requested',
    };
    const anomalySummary = Array.isArray(anomalies) ? anomalies.map((a: any) => a.message).join(' ') : 'Unusual attendance this month.';
    const regularizationDateStr = regularizationDate ? new Date(regularizationDate).toLocaleDateString() : 'a past date';
    const messages: Record<NotifyKind, string> = {
      TASK_COMPLETED: `${employee.firstName} ${employee.lastName} has completed the task: "${taskTitle}".`,
      LEAVE_REQUEST: `${employee.firstName} ${employee.lastName} submitted a ${leaveType || ''} leave request awaiting your review.`,
      OFFBOARDING: `${employee.firstName} ${employee.lastName} has been marked as offboarded. Please review their pending work, shift assignments, and access.`,
      ATTENDANCE_ANOMALY: `${employee.firstName} ${employee.lastName}'s attendance this month needs a look: ${anomalySummary}`,
      REGULARIZATION_REQUEST: `${employee.firstName} ${employee.lastName} requested an attendance correction for ${regularizationDateStr}.`,
    };
    const notificationTypes: Record<NotifyKind, 'SYSTEM' | 'REMINDER' | 'TASK_ASSIGNED'> = {
      TASK_COMPLETED: 'TASK_ASSIGNED',
      LEAVE_REQUEST: 'REMINDER',
      OFFBOARDING: 'SYSTEM',
      ATTENDANCE_ANOMALY: 'SYSTEM',
      REGULARIZATION_REQUEST: 'REMINDER',
    };

    // Routed through the shared notification service so this gets the
    // same real-time socket push and (if the admin has it enabled) email
    // as every other notification in the app.
    await createNotification({
      userId: employee.managerId,
      title: titles[kind],
      message: messages[kind],
      type: notificationTypes[kind],
      emailFeature: kind === 'TASK_COMPLETED' ? 'TASK_UPDATED' : undefined,
      io,
    });
    console.log(`[Automation] Notified manager (${employee.managerId}) — ${kind} — about ${employee.firstName} ${employee.lastName}`);
  }

  // Action: Assign Onboarding Tasks
  // Every new hire gets the same baseline checklist below regardless of
  // role. On top of that, role-specific items are appended — a Manager or
  // Admin has genuinely different first-week responsibilities than an
  // Employee, so treating them identically meant a new Manager's checklist
  // said nothing about their team, and a new Admin's said nothing about
  // the settings they now own.
  private static async handleAssignOnboardingTasks(payload: any): Promise<void> {
    const { userId, firstName, lastName, role } = payload;
    if (!userId) return;

    const onboardingTasks = [
      { title: 'Fill out employee profile and emergency contact details', description: 'Go to Settings -> Profile page and fill in emergency contacts, bio, and birthday details.' },
      { title: 'Read organizational wiki guidelines', description: 'Review the Company Wiki General category to read workspace codes of conduct and compliance handbooks.' },
      { title: 'Join general org chat channels', description: 'Go to Chat -> Channels list and follow public groups to meet teammates.' },
    ];

    if (role === 'MANAGER') {
      onboardingTasks.push(
        { title: 'Review your team roster', description: 'Go to Directory and filter by your name under Manager to see who reports to you, and introduce yourself.' },
        { title: 'Check the Leave and Attendance approval queues', description: 'Go to HR -> Leave Requests and HR -> Attendance to see what is waiting on your review as team members request time off.' },
      );
    } else if (role === 'ADMIN') {
      onboardingTasks.push(
        { title: 'Review Organization Settings', description: 'Go to Organization -> Settings to review branding, registration, security, and payroll automation policies already configured for this workspace.' },
        { title: 'Review configured Workflows', description: 'Go to Workflows to see what automation rules (onboarding, offboarding, notifications) are already active for the org.' },
      );
    }

    for (const t of onboardingTasks) {
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: userId,
          creatorId: userId, // Creator is user themselves for compliance with Prisma schema constraints
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });
    }
    console.log(`[Automation] Automatically allocated ${onboardingTasks.length} onboarding tasks (role: ${role || 'unknown'}) to new employee ${firstName} ${lastName}`);
  }

  // Action: Assign Offboarding Tasks
  // Mirrors handleAssignOnboardingTasks, but the checklist is exit work
  // that someone else has to do *about* the departing employee — asset
  // return, access review, knowledge handover — so, unlike onboarding, the
  // tasks are never assigned to the person being offboarded (their account
  // is already deactivated and login-blocked by this point; see
  // admin.controller.ts's toggleUserActive). Assigned to their manager
  // when one exists, falling back to whichever admin performed the
  // deactivation so the checklist is never silently dropped.
  private static async handleAssignOffboardingTasks(payload: any, io?: any): Promise<void> {
    const { offboardedUserId, firstName, lastName, managerId, triggeredById } = payload;
    if (!offboardedUserId) return;

    const assigneeId = managerId || triggeredById;
    if (!assigneeId) {
      console.warn('[Automation] ASSIGN_OFFBOARDING_TASKS skipped — no manager or triggering admin to assign the checklist to.');
      return;
    }

    const displayName = `${firstName || ''} ${lastName || ''}`.trim() || 'the departing employee';
    const offboardingTasks = [
      { title: `Collect company assets from ${displayName}`, description: 'Retrieve laptop, access cards, and any other issued equipment before their last working day.' },
      { title: `Review and revoke system access for ${displayName}`, description: 'Confirm their account is deactivated everywhere it should be (this app, email, third-party tools, shared drives).' },
      { title: `Reassign ${displayName}'s open tasks and shift assignments`, description: 'Go to Tasks and Shifts to redistribute anything still assigned to them so nothing falls through.' },
      { title: `Schedule exit interview with ${displayName}`, description: 'Cover reason for leaving, feedback, and handover status.' },
      { title: `Process final settlement for ${displayName}`, description: 'Confirm pending leave encashment, last payslip, and any outstanding expense claims are settled.' },
    ];

    for (const t of offboardingTasks) {
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          status: 'TODO',
          priority: 'HIGH',
          assigneeId,
          creatorId: assigneeId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });
    }

    // Also let the assignee know right away, same as any other automation
    // action — the tasks alone are easy to miss amid a normal task list.
    await createNotification({
      userId: assigneeId,
      title: 'Offboarding Checklist Assigned',
      message: `An exit checklist for ${displayName} has been added to your tasks.`,
      type: 'TASK_ASSIGNED',
      emailFeature: 'TASK_UPDATED',
      io,
    });

    console.log(`[Automation] Assigned offboarding checklist for ${displayName} to ${assigneeId}`);
  }

  // Action: Notify Team
  private static async handleNotifyTeam(payload: any, io?: any): Promise<void> {
    const { fileName, uploaderId } = payload;
    if (!uploaderId) return;

    // Get uploader info and department
    const uploader = await prisma.user.findUnique({
      where: { id: uploaderId },
      select: { firstName: true, lastName: true, departmentId: true },
    });

    if (uploader && uploader.departmentId) {
      // Find all employees in the same department
      const teamMembers = await prisma.user.findMany({
        where: { departmentId: uploader.departmentId, id: { not: uploaderId } },
        select: { id: true },
      });

      for (const member of teamMembers) {
        await createNotification({
          userId: member.id,
          title: 'New Document Shared',
          message: `${uploader.firstName} ${uploader.lastName} uploaded a new document: "${fileName}".`,
          type: 'SYSTEM',
          emailFeature: 'FILE_SHARED',
          io,
        });
      }
      console.log(`[Automation] Notified ${teamMembers.length} department members about uploaded document: ${fileName}`);
    }
  }

  // Action: Send Email Only — bypasses in-app notifications/preferences
  // entirely and emails the relevant person directly. Useful for rules
  // where an in-app ping isn't enough (e.g. a leave request someone
  // should see even if they're not actively in the app).
  private static async handleSendEmailOnly(flow: { name: string }, payload: any): Promise<void> {
    const { assigneeId, requesterId, uploaderId, userId, offboardedUserId, employeeId } = payload;
    const targetUserId = assigneeId || requesterId || uploaderId || userId || offboardedUserId || employeeId;
    if (!targetUserId) return;

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, firstName: true, lastName: true, managerId: true },
    });
    if (!target) return;

    // Prefer emailing the manager when one exists (matches the intent of
    // most automation rules — alerting a manager, not the actor
    // themselves), otherwise fall back to the acting user.
    const recipient = target.managerId
      ? await prisma.user.findUnique({ where: { id: target.managerId }, select: { email: true } })
      : target;
    if (!recipient?.email) return;

    await sendEmail(
      recipient.email,
      `Automation Alert: ${flow.name}`,
      `The automation "${flow.name}" ran for ${target.firstName} ${target.lastName}.`,
    );
    console.log(`[Automation] Sent direct email for "${flow.name}" to ${recipient.email}`);
  }
}
