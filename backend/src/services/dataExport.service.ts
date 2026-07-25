import prisma from '../config/db';

/**
 * Gathers a reasonably complete export of one user's own data for the
 * self-service "Export My Data" feature (Settings > Privacy). This is scoped
 * to data that clearly belongs to *this* person — their profile, their HR
 * records, content they authored, messages they sent — not other people's
 * private messages in a shared conversation, even if this user was a
 * participant, since those aren't solely this person's data to export.
 *
 * Not an exhaustive dump of every table this user is referenced in (e.g.
 * meeting attendee lists, task comments on other people's tasks) — the goal
 * is a genuinely useful, privacy-appropriate export, not literally every row
 * that mentions their id.
 */
export const exportUserData = async (userId: string) => {
  const [
    profile,
    tasksCreated,
    tasksAssigned,
    messagesSent,
    leaveRequests,
    expenseClaims,
    attendanceLogs,
    payslips,
    shiftAssignments,
    notifications,
    recognitionsGiven,
    recognitionsReceived,
    wikiPagesAuthored,
    auditLogEntries,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        designation: true, bio: true, location: true, skills: true, employeeId: true,
        joiningDate: true, employmentType: true, officeLocation: true, emergencyContact: true,
        birthday: true, timezone: true, role: true, departmentId: true, managerId: true,
        createdAt: true,
      },
    }),
    prisma.task.findMany({ where: { creatorId: userId }, select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true } }),
    prisma.task.findMany({ where: { assigneeId: userId }, select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true } }),
    prisma.message.findMany({ where: { senderId: userId }, select: { id: true, content: true, createdAt: true, groupId: true, receiverId: true } }),
    prisma.leaveRequest.findMany({ where: { userId } }),
    prisma.expenseClaim.findMany({ where: { userId } }),
    prisma.attendance.findMany({ where: { userId } }),
    prisma.payslip.findMany({ where: { userId } }),
    prisma.shiftAssignment.findMany({ where: { userId }, include: { shift: { select: { name: true, startTime: true, endTime: true } } } }),
    prisma.notification.findMany({ where: { userId }, select: { title: true, message: true, type: true, isRead: true, createdAt: true } }),
    prisma.recognition.findMany({ where: { senderId: userId }, select: { receiverId: true, message: true, badge: true, createdAt: true } }),
    prisma.recognition.findMany({ where: { receiverId: userId }, select: { senderId: true, message: true, badge: true, createdAt: true } }),
    prisma.wikiPage.findMany({ where: { authorId: userId }, select: { id: true, title: true, category: true, isPublished: true, createdAt: true } }),
    prisma.auditLog.findMany({ where: { userId }, select: { action: true, details: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    exportFormatNote: "This export includes your profile, HR records, and content you personally authored (tasks, messages you sent, wiki pages). It does not include other people's private messages in shared conversations.",
    profile,
    tasks: { created: tasksCreated, assigned: tasksAssigned },
    messagesSent,
    hr: { leaveRequests, expenseClaims, attendanceLogs, payslips, shiftAssignments },
    notifications,
    recognitions: { given: recognitionsGiven, received: recognitionsReceived },
    wikiPagesAuthored,
    auditLogEntries,
  };
};
