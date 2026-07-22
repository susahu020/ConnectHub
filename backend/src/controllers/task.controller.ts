import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createNotification } from '../services/notification.service';

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      priority, 
      status, 
      dueDate, 
      assigneeId, 
      departmentId, 
      projectId, 
      fileIds,
      estimatedHours,
      labels,
      watcherIds,
      sprintName,
      milestoneName,
      isRecurring,
      recurrenceInterval
    } = req.body;

    const creatorId = req.user?.id!;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId,
        creatorId,
        departmentId: departmentId || req.user?.departmentId || null,
        projectId: projectId || null,
        estimatedHours: estimatedHours !== undefined && estimatedHours !== null ? parseFloat(estimatedHours) : null,
        labels: labels || [],
        watcherIds: watcherIds || [],
        sprintName: sprintName || null,
        milestoneName: milestoneName || null,
        isRecurring: isRecurring || false,
        recurrenceInterval: recurrenceInterval || null,
        attachments: fileIds && fileIds.length > 0 ? {
          create: fileIds.map((fileId: string) => ({ fileId }))
        } : undefined,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Write task history
    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        userId: creatorId,
        action: 'CREATED',
        details: `Task created by ${req.user?.firstName} and assigned to ${task.assignee.firstName}`,
      },
    });

    // Send Notification (Real-time and Email preferences integrated)
    const io = req.app.get('io');
    await createNotification({
      userId: assigneeId,
      title: 'New Task Assigned',
      message: `Task: "${title}" has been assigned to you by ${req.user?.firstName}.`,
      type: 'TASK_ASSIGNED',
      relatedId: task.id,
      emailFeature: 'TASK_ASSIGNED',
      io,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, assigneeId, creatorId, departmentId, priority, projectId } = req.query;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status as any;
    }
    if (assigneeId) {
      whereClause.assigneeId = assigneeId as string;
    }
    if (creatorId) {
      whereClause.creatorId = creatorId as string;
    }
    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }
    if (priority) {
      whereClause.priority = priority as any;
    }
    if (projectId) {
      whereClause.projectId = projectId === 'unassigned' ? null : (projectId as string);
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        attachments: { include: { file: true } },
        subtasks: true,
        dependencies: { include: { dependsOnTask: true } },
        timeLogs: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        attachments: { include: { file: true } },
        subtasks: true,
        dependencies: { include: { dependsOnTask: true } },
        timeLogs: { include: { user: { select: { firstName: true, lastName: true } } } },
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const { 
      title, 
      description, 
      priority, 
      status, 
      dueDate, 
      assigneeId, 
      projectId, 
      progress,
      estimatedHours,
      labels,
      watcherIds,
      sprintName,
      milestoneName,
      isRecurring,
      recurrenceInterval
    } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    // Auth check: Admin, Manager, or the assignee/creator can update task
    const isAssignee = existingTask.assigneeId === userId;
    const isCreator = existingTask.creatorId === userId;
    const canManage = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER' || isAssignee || isCreator;

    if (!canManage) {
      res.status(403).json({ message: 'Forbidden. You do not have permissions to update this task.' });
      return;
    }

    // Build history logging details
    const updates: any = {};
    const historyActions: string[] = [];

    if (title && title !== existingTask.title) {
      updates.title = title;
      historyActions.push(`updated title to "${title}"`);
    }
    if (description && description !== existingTask.description) {
      updates.description = description;
    }
    if (priority && priority !== existingTask.priority) {
      updates.priority = priority;
      historyActions.push(`changed priority to ${priority}`);
    }
    if (status && status !== existingTask.status) {
      updates.status = status;
      historyActions.push(`changed status to ${status}`);
    }
    if (dueDate) {
      const newDate = new Date(dueDate);
      if (!existingTask.dueDate || newDate.getTime() !== existingTask.dueDate.getTime()) {
        updates.dueDate = newDate;
        historyActions.push(`changed due date to ${newDate.toLocaleDateString()}`);
      }
    }
    if (assigneeId && assigneeId !== existingTask.assigneeId) {
      updates.assigneeId = assigneeId;
      historyActions.push('reassigned task');
    }
    if (progress !== undefined && progress !== existingTask.progress) {
      updates.progress = progress;
      historyActions.push(`updated progress to ${progress}%`);
    }
    if (projectId !== undefined && projectId !== existingTask.projectId) {
      updates.projectId = projectId || null;
      historyActions.push('updated project allocation');
    }
    if (estimatedHours !== undefined && estimatedHours !== existingTask.estimatedHours) {
      updates.estimatedHours = estimatedHours !== null ? parseFloat(estimatedHours) : null;
      historyActions.push(`updated estimated hours to ${estimatedHours}`);
    }
    if (labels !== undefined) {
      updates.labels = labels;
      historyActions.push('updated task labels');
    }
    if (watcherIds !== undefined) {
      updates.watcherIds = watcherIds;
      historyActions.push('updated task watchers');
    }
    if (sprintName !== undefined && sprintName !== existingTask.sprintName) {
      updates.sprintName = sprintName || null;
      historyActions.push(`moved task to sprint "${sprintName}"`);
    }
    if (milestoneName !== undefined && milestoneName !== existingTask.milestoneName) {
      updates.milestoneName = milestoneName || null;
      historyActions.push(`updated milestone to "${milestoneName}"`);
    }
    if (isRecurring !== undefined && isRecurring !== existingTask.isRecurring) {
      updates.isRecurring = isRecurring;
      historyActions.push(`changed recurrence state to ${isRecurring}`);
    }
    if (recurrenceInterval !== undefined && recurrenceInterval !== existingTask.recurrenceInterval) {
      updates.recurrenceInterval = recurrenceInterval || null;
      historyActions.push(`changed recurrence interval to ${recurrenceInterval}`);
    }

    if (Object.keys(updates).length === 0) {
      res.status(200).json(existingTask);
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updates,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Trigger workflow automation engine on task completion
    if (updates.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      const { AutomationService } = require('../services/automation.service');
      const automationIo = req.app.get('io');
      AutomationService.trigger('TASK_COMPLETED', {
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        assigneeId: updatedTask.assigneeId,
      }, automationIo).catch((err: any) => console.error('[Automation] TASK_COMPLETED trigger failed:', err));
    }

    // Write histories
    if (historyActions.length > 0) {
      await prisma.taskHistory.create({
        data: {
          taskId: id,
          userId,
          action: 'UPDATED',
          details: `${req.user?.firstName} ${historyActions.join(', ')}`,
        },
      });

      // Send update alert to assignee if changed by someone else
      if (userId !== updatedTask.assigneeId) {
        const io = req.app.get('io');
        await createNotification({
          userId: updatedTask.assigneeId,
          title: 'Task Updated',
          message: `Task: "${updatedTask.title}" has been updated by ${req.user?.firstName}.`,
          type: 'SYSTEM',
          relatedId: id,
          emailFeature: 'TASK_UPDATED',
          io,
        });
      }
    }

    // Spawn recurring task copy if completed
    if (updatedTask.status === 'COMPLETED' && updatedTask.isRecurring && existingTask.status !== 'COMPLETED') {
      try {
        const nextDueDate = new Date(updatedTask.dueDate || new Date());
        const interval = updatedTask.recurrenceInterval || 'daily';
        if (interval === 'daily') {
          nextDueDate.setDate(nextDueDate.getDate() + 1);
        } else if (interval === 'weekly') {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (interval === 'monthly') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        await prisma.task.create({
          data: {
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            status: 'TODO',
            dueDate: nextDueDate,
            assigneeId: updatedTask.assigneeId,
            creatorId: updatedTask.creatorId,
            departmentId: updatedTask.departmentId,
            projectId: updatedTask.projectId,
            estimatedHours: updatedTask.estimatedHours,
            labels: updatedTask.labels,
            watcherIds: updatedTask.watcherIds,
            sprintName: updatedTask.sprintName,
            milestoneName: updatedTask.milestoneName,
            isRecurring: true,
            recurrenceInterval: updatedTask.recurrenceInterval,
          }
        });
      } catch (err) {
        console.error('Failed to spawn recurring task:', err);
      }
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && task.creatorId !== req.user?.id) {
      res.status(403).json({ message: 'Forbidden. You do not have permissions to delete this task.' });
      return;
    }

    await prisma.task.delete({ where: { id } });

    res.status(200).json({ message: 'Task deleted successfully.', taskId: id });
  } catch (error) {
    next(error);
  }
};

export const addTaskComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id!;

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Write activity/history
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action: 'COMMENT_ADDED',
        details: `${req.user?.firstName} commented: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

const isManagerOrAdmin = (role?: string) => role === 'ADMIN' || role === 'MANAGER';

export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role)) {
      res.status(403).json({ message: 'Only managers and admins can create projects.' });
      return;
    }

    const { name, description, teamId } = req.body;

    let targetTeamId = teamId;
    if (!targetTeamId) {
      const firstTeam = await prisma.team.findFirst();
      if (!firstTeam) {
        const defaultDept = await prisma.department.findFirst() || await prisma.department.create({ data: { name: 'General Org' } });
        const defaultTeam = await prisma.team.create({
          data: {
            name: 'Default Team',
            departmentId: defaultDept.id,
          }
        });
        targetTeamId = defaultTeam.id;
      } else {
        targetTeamId = firstTeam.id;
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        teamId: targetTeamId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role)) {
      res.status(403).json({ message: 'Only managers and admins can edit projects.' });
      return;
    }

    const { id } = req.params;
    const { name, description, status } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: { name, description, status },
    });
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isManagerOrAdmin(req.user?.role)) {
      res.status(403).json({ message: 'Only managers and admins can delete projects.' });
      return;
    }

    const { id } = req.params;
    await prisma.project.delete({
      where: { id },
    });
    res.status(200).json({ message: 'Project deleted successfully.', projectId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to recursively verify that task dependencies do not form a cycle.
 */
async function checkCyclicDependency(taskId: string, targetDependsOnId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [targetDependsOnId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true; // Cycle detected

    visited.add(current);

    const deps = await prisma.taskDependency.findMany({
      where: { taskId: current },
      select: { dependsOnTaskId: true },
    });

    for (const dep of deps) {
      if (!visited.has(dep.dependsOnTaskId)) {
        queue.push(dep.dependsOnTaskId);
      }
    }
  }

  return false;
}

// Same rule updateTask already applies: the assignee, the creator, or a manager/admin.
// Subtasks, time logs, etc. are really just editing the task in disguise, so they
// should be gated the same way updateTask itself already is.
const canManageTask = (task: { assigneeId: string | null; creatorId: string }, userId: string, role?: string) =>
  isManagerOrAdmin(role) || task.assigneeId === userId || task.creatorId === userId;

/**
 * Create a subtask checklist item.
 */
export const createSubtask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const { title } = req.body;
    const userId = req.user!.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }
    if (!canManageTask(task, userId, req.user?.role)) {
      res.status(403).json({ message: 'You do not have permission to edit this task.' });
      return;
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title,
      },
    });

    // History log
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action: 'SUBTASK_ADDED',
        details: `Subtask checklist item "${title}" added.`,
      },
    });

    res.status(201).json(subtask);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle subtask completion check.
 */
export const toggleSubtask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subtaskId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!existing) {
      res.status(404).json({ message: 'Subtask not found.' });
      return;
    }

    const parentTask = await prisma.task.findUnique({ where: { id: existing.taskId } });
    if (parentTask && !canManageTask(parentTask, userId, req.user?.role)) {
      res.status(403).json({ message: 'You do not have permission to edit this task.' });
      return;
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted: !existing.isCompleted },
    });

    // History log
    await prisma.taskHistory.create({
      data: {
        taskId: existing.taskId,
        userId,
        action: 'SUBTASK_TOGGLED',
        details: `Subtask "${existing.title}" marked as ${updated.isCompleted ? 'Completed' : 'Pending'}.`,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a subtask.
 */
export const deleteSubtask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subtaskId } = req.params;
    const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });

    if (existing) {
      const parentTask = await prisma.task.findUnique({ where: { id: existing.taskId } });
      if (parentTask && !canManageTask(parentTask, req.user!.id, req.user?.role)) {
        res.status(403).json({ message: 'You do not have permission to edit this task.' });
        return;
      }
      await prisma.subtask.delete({ where: { id: subtaskId } });
    }

    res.status(200).json({ message: 'Subtask deleted successfully.', subtaskId });
  } catch (error) {
    next(error);
  }
};

/**
 * Log work hours / minutes spent on task.
 */
export const logTaskTime = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const { minutes } = req.body;
    const userId = req.user?.id!;

    if (!minutes || isNaN(minutes) || minutes <= 0) {
      res.status(400).json({ message: 'A valid number of logged minutes is required.' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }
    if (!canManageTask(task, userId, req.user?.role)) {
      res.status(403).json({ message: 'You can only log time on tasks assigned to you (or that you created/manage).' });
      return;
    }

    const timeLog = await prisma.taskTimeLog.create({
      data: {
        taskId,
        userId,
        minutes: parseInt(minutes),
      },
    });

    // History log
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action: 'TIME_LOGGED',
        details: `${minutes} minute(s) logged by ${req.user?.firstName}.`,
      },
    });

    res.status(201).json(timeLog);
  } catch (error) {
    next(error);
  }
};

/**
 * Get time logging logs of a task.
 */
export const getTaskTimeLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const logs = await prisma.taskTimeLog.findMany({
      where: { taskId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { loggedAt: 'desc' },
    });
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

/**
 * Add blocking task dependency.
 */
export const addTaskDependency = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId } = req.params;
    const { dependsOnTaskId } = req.body;
    const userId = req.user!.id;

    if (taskId === dependsOnTaskId) {
      res.status(400).json({ message: 'Task cannot depend on itself.' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }
    if (!canManageTask(task, userId, req.user?.role)) {
      res.status(403).json({ message: 'You do not have permission to edit this task.' });
      return;
    }

    // Verify cyclic dependencies using BFS path checker
    const isCyclic = await checkCyclicDependency(taskId, dependsOnTaskId);
    if (isCyclic) {
      res.status(400).json({ message: 'Cyclic task dependency detected. This linking forms an infinite blocking loop.' });
      return;
    }

    const dep = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
      include: {
        dependsOnTask: true,
      },
    });

    // History log
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action: 'DEPENDENCY_ADDED',
        details: `Dependency added: Task now depends on blocker "${dep.dependsOnTask.title}".`,
      },
    });

    res.status(201).json(dep);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove task dependency blocker.
 */
export const removeTaskDependency = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: taskId, dependsOnTaskId } = req.params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }
    if (!canManageTask(task, req.user!.id, req.user?.role)) {
      res.status(403).json({ message: 'You do not have permission to edit this task.' });
      return;
    }

    await prisma.taskDependency.deleteMany({
      where: {
        taskId,
        dependsOnTaskId,
      },
    });

    res.status(200).json({ message: 'Dependency blocker removed successfully.', taskId, dependsOnTaskId });
  } catch (error) {
    next(error);
  }
};
