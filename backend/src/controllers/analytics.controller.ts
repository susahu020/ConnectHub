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

    // 1. ACTIVE USERS
    const totalUsers = await prisma.user.count();
    const userStatuses = await prisma.user.groupBy({
      by: ['status'],
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

    const activeSocketConnections = Array.from(activeConnections.values()).reduce((sum, list) => sum + list.length, 0);
    const activeSocketUsers = activeConnections.size;

    // 2. CHAT ANALYTICS (Last 7 Days) & Response Time
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalMessages, totalChannels, recentMessages] = await prisma.$transaction([
      prisma.message.count(),
      prisma.group.count(),
      prisma.message.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true }
      })
    ]);

    const messageCountsByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
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

    // Estimate Chat Response Time (time interval between direct messages)
    const sampleMessages = await prisma.message.findMany({
      where: { groupId: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { senderId: true, receiverId: true, createdAt: true }
    });
    let totalResponseTimeMs = 0;
    let responseCount = 0;
    for (let i = 1; i < sampleMessages.length; i++) {
      const prev = sampleMessages[i - 1];
      const curr = sampleMessages[i];
      if (
        (prev.senderId === curr.receiverId && prev.receiverId === curr.senderId) &&
        (curr.createdAt.getTime() - prev.createdAt.getTime() < 4 * 60 * 60 * 1000)
      ) {
        totalResponseTimeMs += (curr.createdAt.getTime() - prev.createdAt.getTime());
        responseCount++;
      }
    }
    const avgChatResponseMinutes = responseCount > 0
      ? parseFloat((totalResponseTimeMs / (1000 * 60 * responseCount)).toFixed(1))
      : 0;

    // 3. DEPARTMENT PRODUCTIVITY
    const departments = await prisma.department.findMany({
      include: {
        employees: { select: { id: true } },
        tasks: { select: { id: true, status: true } },
      }
    });
    const departmentStats = departments.map(dept => {
      const totalMembers = dept.employees.length;
      const totalTasks = dept.tasks.length;
      const completedTasks = dept.tasks.filter(t => t.status === 'COMPLETED').length;
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
    const totalTasks = await prisma.task.count();
    const taskStatusGroups = await prisma.task.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
    const taskPriorityGroups = await prisma.task.groupBy({
      by: ['priority'],
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
      where: { status: 'COMPLETED' },
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
    const totalFiles = await prisma.file.count({ where: { isDeleted: false } });
    const fileStorageSum = await prisma.file.aggregate({
      where: { isDeleted: false },
      _sum: { size: true }
    });
    const totalStorageBytes = fileStorageSum._sum.size || 0;

    const files = await prisma.file.findMany({
      where: { isDeleted: false },
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
      prisma.recognition.count(),
      prisma.taskComment.count(),
      prisma.activityLog.count(),
      prisma.meeting.count()
    ]);
    const engagementScore = totalUsers > 0
      ? Math.min(100, Math.round(((totalKudos * 5 + totalComments * 2 + totalActivityLogs + totalMeetings * 3) / totalUsers)))
      : 0;

    res.status(200).json({
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
