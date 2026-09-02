import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { activeConnections } from '../services/socket.service';

export const getAnalyticsStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user?.role!;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      res.status(403).json({ message: 'Forbidden. Access restricted to Admins and Managers.' });
      return;
    }

    // Date-range filter: previously every metric here was an all-time
    // total with no way to narrow the window, and the one exception (the
    // chat-volume chart) was hardcoded to a fixed trailing 7 days with no
    // way to widen it either. ?range= accepts '7d' | '30d' | '90d' | 'all'
    // (default 'all', matching the original always-all-time behavior for
    // anyone who doesn't pass it).
    const rangeParam = (req.query.range as string) || 'all';
    const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };
    const rangeDays = RANGE_DAYS[rangeParam] ?? null;
    const rangeStart = rangeDays !== null ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) : null;
    // Applied to any query below filtering by `createdAt` — spread this
    // into a `where` clause; it's `{}` for 'all', so it's a safe no-op.
    const dateWhere = rangeStart ? { createdAt: { gte: rangeStart } } : {};

    // Department scoping: a Manager previously saw the exact same
    // company-wide numbers an Admin did, with no way to see just their
    // own team's picture. Admins still see everything; a Manager without
    // a department assigned falls back to company-wide too (there's
    // nothing sensible to scope to otherwise) rather than showing empty
    // charts, which would look like a bug rather than an edge case.
    const isScopedManager = role === 'MANAGER' && !!req.user?.departmentId;
    let deptUserIds: string[] | null = null;
    if (isScopedManager) {
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: req.user!.departmentId! },
        select: { id: true },
      });
      deptUserIds = deptUsers.map((u: { id: string }) => u.id);
    }
    // Spread into a `where` clause on whichever field identifies the
    // "actor" for that table (senderId, uploaderId, userId, hostId,
    // assigneeId...) — `{}` when not scoped, so it's a safe no-op for
    // Admins and for Managers with no department.
    const scopeWhere = (field: string) => (deptUserIds ? { [field]: { in: deptUserIds } } : {});

    // 1. ACTIVE USERS
    const totalUsers = await prisma.user.count({
      where: isScopedManager ? { departmentId: req.user!.departmentId! } : undefined,
    });
    const userStatuses = await prisma.user.groupBy({
      by: ['status'],
      where: isScopedManager ? { departmentId: req.user!.departmentId! } : undefined,
      _count: { _all: true }
    });

    const statusCounts: Record<string, number> = {
      ONLINE: 0,
      AWAY: 0,
      BUSY: 0,
      DND: 0,
      OFFLINE: 0,
      INVISIBLE: 0,
      ON_LEAVE: 0
    };
    userStatuses.forEach(group => {
      if (group.status && statusCounts[group.status] !== undefined) {
        statusCounts[group.status] = group._count._all;
      }
    });

    const relevantConnectionEntries = isScopedManager
      ? Array.from(activeConnections.entries()).filter(([userId]) => deptUserIds!.includes(userId))
      : Array.from(activeConnections.entries());
    const activeSocketConnections = relevantConnectionEntries.reduce((sum, [, list]) => sum + list.length, 0);
    const activeSocketUsers = relevantConnectionEntries.length;

    // 2. CHAT ANALYTICS & Response Time
    // The daily chart's own window is separate from the overall ?range=
    // filter above: charting 90 individual daily bars would be unreadable,
    // so this is capped at the last 30 days of daily granularity even when
    // a wider range (or 'all') is selected — the summary numbers above the
    // chart (totalMessages) still honor the full selected range.
    const chartDays = Math.min(rangeDays ?? 30, 30);
    const chartWindowStart = new Date();
    chartWindowStart.setDate(chartWindowStart.getDate() - (chartDays - 1));

    const [totalMessages, totalChannels, recentMessages] = await prisma.$transaction([
      prisma.message.count({ where: { ...dateWhere, ...scopeWhere('senderId') } }),
      prisma.group.count(isScopedManager ? { where: { createdById: { in: deptUserIds! } } } : undefined),
      prisma.message.findMany({
        where: { createdAt: { gte: chartWindowStart }, ...scopeWhere('senderId') },
        select: { createdAt: true }
      })
    ]);

    const messageCountsByDay: Record<string, number> = {};
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      messageCountsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    recentMessages.forEach(msg => {
      const dateStr = msg.createdAt.toISOString().slice(0, 10);
      if (messageCountsByDay[dateStr] !== undefined) {
        messageCountsByDay[dateStr]++;
      }
    });
    const chatHistory = Object.entries(messageCountsByDay).map(([date, count]) => ({ date, count }));

    // Estimate Chat Response Time (time interval between direct messages).
    // Two things were wrong with the original version of this: it sampled
    // the OLDEST 100 direct messages ever sent (orderBy asc + take 100),
    // so on any org with real message history this metric was frozen at
    // day-one behavior rather than reflecting anything current — unlike
    // the message-volume chart just above, which already uses a rolling
    // sevenDaysAgo window. And it compared consecutive rows in one GLOBAL
    // chronological stream across every 1:1 conversation in the company,
    // when "is this a reply" only makes sense within a single
    // conversation's own timeline — in an org with more than a couple of
    // concurrent DM threads, consecutive global rows are almost always two
    // unrelated conversations that happened to land next to each other in
    // time, not an actual reply.
    const recentDirectMessages = await prisma.message.findMany({
      where: {
        groupId: null,
        // Uses the overall selected range when one is set, falling back
        // to the original trailing-7-day default for 'all' — scanning
        // literally every direct message ever sent for this metric isn't
        // worth it, and 7 days was already this metric's own established
        // default before ?range= existed.
        createdAt: { gte: rangeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ...(deptUserIds ? { senderId: { in: deptUserIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 2000,
      select: { senderId: true, receiverId: true, createdAt: true }
    });

    // Group into per-conversation timelines (keyed by the sorted pair of
    // participant ids, so A->B and B->A messages land in the same bucket),
    // then only compare consecutive messages within the same conversation.
    const conversationThreads = new Map<string, { senderId: string; createdAt: Date }[]>();
    recentDirectMessages.forEach(msg => {
      if (!msg.receiverId) return;
      const key = [msg.senderId, msg.receiverId].sort().join('::');
      const thread = conversationThreads.get(key) || [];
      thread.push({ senderId: msg.senderId, createdAt: msg.createdAt });
      conversationThreads.set(key, thread);
    });

    let totalResponseTimeMs = 0;
    let responseCount = 0;
    conversationThreads.forEach(thread => {
      for (let i = 1; i < thread.length; i++) {
        const prev = thread[i - 1];
        const curr = thread[i];
        if (
          prev.senderId !== curr.senderId &&
          (curr.createdAt.getTime() - prev.createdAt.getTime() < 4 * 60 * 60 * 1000)
        ) {
          totalResponseTimeMs += (curr.createdAt.getTime() - prev.createdAt.getTime());
          responseCount++;
        }
      }
    });
    const avgChatResponseMinutes = responseCount > 0
      ? parseFloat((totalResponseTimeMs / (1000 * 60 * responseCount)).toFixed(1))
      : 0;

    // 3. DEPARTMENT PRODUCTIVITY — a Manager only ever sees their own
    // department's row here (there's only one department to compare
    // against themselves, but keeping the same list shape means the
    // frontend doesn't need a separate code path for the scoped view).
    const departments = await prisma.department.findMany({
      where: isScopedManager ? { id: req.user!.departmentId! } : undefined,
      include: {
        employees: { select: { id: true } },
        tasks: { select: { id: true, status: true, createdAt: true } },
      }
    });
    const departmentStats = departments.map(dept => {
      const tasksInRange = rangeStart
        ? dept.tasks.filter((t: { createdAt: Date }) => t.createdAt >= rangeStart)
        : dept.tasks;
      const totalMembers = dept.employees.length;
      const totalTasks = tasksInRange.length;
      const completedTasks = tasksInRange.filter(t => t.status === 'COMPLETED').length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;
      return {
        id: dept.id,
        name: dept.name,
        totalMembers,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate
      };
    });

    // 4. TASK COMPLETION & Resolution Time
    // Scoped by assignee's department — an unassigned task won't show up
    // in a Manager's scoped view even if it was created within their
    // team, since there's no assignee to check against. A more complete
    // scoping (creator's department OR assignee's department OR the
    // task's project's department) would close that gap but adds real
    // complexity for a fairly narrow edge case; noting it here rather
    // than building it out in this pass.
    const taskWhere = { ...dateWhere, ...scopeWhere('assigneeId') };
    const totalTasks = await prisma.task.count({ where: taskWhere });
    const taskStatusGroups = await prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: { _all: true }
    });
    const taskPriorityGroups = await prisma.task.groupBy({
      by: ['priority'],
      where: taskWhere,
      _count: { _all: true }
    });

    const taskStatusCounts: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      COMPLETED: 0
    };
    taskStatusGroups.forEach(group => {
      if (group.status && taskStatusCounts[group.status] !== undefined) {
        taskStatusCounts[group.status] = group._count._all;
      }
    });

    const taskPriorityCounts: Record<string, number> = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      URGENT: 0
    };
    taskPriorityGroups.forEach(group => {
      if (group.priority && taskPriorityCounts[group.priority] !== undefined) {
        taskPriorityCounts[group.priority] = group._count._all;
      }
    });

    const completedTasksCount = taskStatusCounts.COMPLETED;
    const taskCompletionRate = totalTasks > 0 ? parseFloat(((completedTasksCount / totalTasks) * 100).toFixed(1)) : 0;

    // Calculate Task Resolution Time (creation to completion hours)
    const completedTasksList = await prisma.task.findMany({
      where: { status: 'COMPLETED', ...taskWhere },
      select: { createdAt: true, updatedAt: true }
    });
    let totalResolutionTimeMs = 0;
    completedTasksList.forEach(task => {
      totalResolutionTimeMs += (task.updatedAt.getTime() - task.createdAt.getTime());
    });
    const avgTaskResolutionHours = completedTasksList.length > 0
      ? parseFloat((totalResolutionTimeMs / (1000 * 60 * 60 * completedTasksList.length)).toFixed(1))
      : 0;

    // 5. FILE USAGE
    const fileWhere = { isDeleted: false, ...dateWhere, ...scopeWhere('uploaderId') };
    const totalFiles = await prisma.file.count({ where: fileWhere });
    const fileStorageSum = await prisma.file.aggregate({
      where: fileWhere,
      _sum: { size: true }
    });
    const totalStorageBytes = fileStorageSum._sum.size || 0;

    const files = await prisma.file.findMany({
      where: fileWhere,
      select: { fileType: true, size: true }
    });

    const fileTypeDistribution: Record<string, { count: number; totalSize: number }> = {
      IMAGE: { count: 0, totalSize: 0 },
      PDF: { count: 0, totalSize: 0 },
      DOCUMENT: { count: 0, totalSize: 0 },
      SPREADSHEET: { count: 0, totalSize: 0 },
      ARCHIVE: { count: 0, totalSize: 0 },
      OTHER: { count: 0, totalSize: 0 }
    };

    files.forEach(file => {
      let cat = 'OTHER';
      const ext = file.fileType.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || ext.startsWith('image/')) cat = 'IMAGE';
      else if (['pdf'].includes(ext) || ext.includes('pdf')) cat = 'PDF';
      else if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext) || ext.includes('word') || ext.includes('text')) cat = 'DOCUMENT';
      else if (['xls', 'xlsx', 'csv'].includes(ext) || ext.includes('sheet') || ext.includes('csv')) cat = 'SPREADSHEET';
      else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext) || ext.includes('zip') || ext.includes('compressed')) cat = 'ARCHIVE';
      
      fileTypeDistribution[cat].count++;
      fileTypeDistribution[cat].totalSize += file.size;
    });

    const fileTypeData = Object.entries(fileTypeDistribution).map(([category, info]) => ({
      category,
      count: info.count,
      totalSize: info.totalSize
    }));

    // 6. EMPLOYEE ENGAGEMENT COMPOSITE SCORE
    const [totalKudos, totalComments, totalActivityLogs, totalMeetings] = await prisma.$transaction([
      prisma.recognition.count({ where: { ...dateWhere, ...scopeWhere('senderId') } }),
      prisma.taskComment.count({ where: { ...dateWhere, ...scopeWhere('userId') } }),
      prisma.activityLog.count({ where: { ...dateWhere, ...scopeWhere('userId') } }),
      prisma.meeting.count({ where: { ...dateWhere, ...scopeWhere('hostId') } })
    ]);
    const engagementScore = totalUsers > 0
      ? Math.min(100, Math.round(((totalKudos * 5 + totalComments * 2 + totalActivityLogs + totalMeetings * 3) / totalUsers)))
      : 0;

    res.status(200).json({
      meta: {
        range: rangeParam,
        scopedToDepartment: isScopedManager,
        departmentId: isScopedManager ? req.user!.departmentId : null,
      },
      activeUsers: {
        totalUsers,
        statusCounts,
        activeSocketUsers,
        activeSocketConnections
      },
      chatAnalytics: {
        totalMessages,
        totalChannels,
        chatHistory,
        avgChatResponseMinutes
      },
      departmentProductivity: departmentStats,
      taskCompletion: {
        totalTasks,
        statusCounts: taskStatusCounts,
        priorityCounts: taskPriorityCounts,
        completionRate: taskCompletionRate,
        avgTaskResolutionHours
      },
      fileUsage: {
        totalFiles,
        totalStorageBytes,
        fileTypeDistribution: fileTypeData
      },
      productivityMetrics: {
        engagementScore,
        avgChatResponseMinutes,
        avgTaskResolutionHours
      }
    });

  } catch (error) {
    next(error);
  }
};
