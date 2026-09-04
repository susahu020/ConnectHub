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
   * @param triggerName The trigger type: "TASK_COMPLETED", "EMPLOYEE_JOINED", "DOCUMENT_UPLOADED", "LEAVE_REQUESTED"
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
  // Handles two payload shapes: task completion ({ taskTitle, assigneeId })
  // and leave requests ({ leaveType, requesterId }) — both just mean
  // "tell this employee's manager something happened."
  private static async handleNotifyManager(payload: any, io?: any): Promise<void> {
    const { taskTitle, assigneeId, leaveType, requesterId } = payload;
    const employeeId = assigneeId || requesterId;
    if (!employeeId) return;

    // Find employee and their manager
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true, managerId: true },
    });

    if (employee && employee.managerId) {
      const isLeaveRequest = !!requesterId;
      // Routed through the shared notification service so this gets the
      // same real-time socket push and (if the admin has it enabled) email
      // as every other notification in the app.
      await createNotification({
        userId: employee.managerId,
        title: isLeaveRequest ? 'New Leave Request' : 'Task Completed by Direct Report',
        message: isLeaveRequest
          ? `${employee.firstName} ${employee.lastName} submitted a ${leaveType || ''} leave request awaiting your review.`
          : `${employee.firstName} ${employee.lastName} has completed the task: "${taskTitle}".`,
        type: isLeaveRequest ? 'REMINDER' : 'TASK_ASSIGNED',
        emailFeature: isLeaveRequest ? undefined : 'TASK_UPDATED',
        io,
      });
      console.log(`[Automation] Notified manager (${employee.managerId}) about ${isLeaveRequest ? 'leave request from' : 'task completion by'} ${employee.firstName}`);
    }
  }

  // Action: Assign Onboarding Tasks
  private static async handleAssignOnboardingTasks(payload: any): Promise<void> {
    const { userId, firstName, lastName } = payload;
    if (!userId) return;

    const onboardingTasks = [
      { title: 'Fill out employee profile and emergency contact details', description: 'Go to Settings -> Profile page and fill in emergency contacts, bio, and birthday details.' },
      { title: 'Read organizational wiki guidelines', description: 'Review the Company Wiki General category to read workspace codes of conduct and compliance handbooks.' },
      { title: 'Join general org chat channels', description: 'Go to Chat -> Channels list and follow public groups to meet teammates.' },
    ];

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
    console.log(`[Automation] Automatically allocated onboarding tasks to new employee ${firstName} ${lastName}`);
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
    const { assigneeId, requesterId, uploaderId, userId } = payload;
    const targetUserId = assigneeId || requesterId || uploaderId || userId;
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
