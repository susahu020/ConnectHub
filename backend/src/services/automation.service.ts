import prisma from '../config/db';
import { createNotification } from './notification.service';

export class AutomationService {
  /**
   * Triggers a workflow event
   * @param triggerName The trigger type: "TASK_COMPLETED", "EMPLOYEE_JOINED", "DOCUMENT_UPLOADED"
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
            default:
              console.warn(`[Automation] Unrecognized action: ${flow.action}`);
          }
        } catch (err) {
          console.error(`[Automation] Failed executing workflow "${flow.name}":`, err);
        }
      }
    } catch (error) {
      console.error('[Automation] Trigger execution failed:', error);
    }
  }

  // Action: Notify Manager
  private static async handleNotifyManager(payload: any, io?: any): Promise<void> {
    const { taskTitle, assigneeId } = payload;
    if (!assigneeId) return;

    // Find assignee and their manager
    const employee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { firstName: true, lastName: true, managerId: true },
    });

    if (employee && employee.managerId) {
      // Routed through the shared notification service so this gets the
      // same real-time socket push and (if the admin has it enabled) email
      // as every other TASK_ASSIGNED-type notification in the app.
      await createNotification({
        userId: employee.managerId,
        title: 'Task Completed by Direct Report',
        message: `${employee.firstName} ${employee.lastName} has completed the task: "${taskTitle}".`,
        type: 'TASK_ASSIGNED',
        emailFeature: 'TASK_UPDATED',
        io,
      });
      console.log(`[Automation] Notified manager (${employee.managerId}) about task completion by ${employee.firstName}`);
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
}
