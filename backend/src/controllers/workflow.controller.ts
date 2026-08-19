import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitDataUpdate } from '../utils/realtime';
import { logAudit } from '../utils/auditLog';

// 1. GET /api/workflows — List workflows
export const getWorkflows = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
};

// 2. POST /api/workflows — Create workflow
export const createWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, trigger, action, isActive, conditions } = req.body || {};

    if (!name || !trigger || !action) {
      return res.status(400).json({ message: 'Name, trigger, and action are required.' });
    }

    const willBeActive = isActive === undefined ? true : !!isActive;

    // Two active rules with the same trigger+action would both fire on
    // every matching event, double-executing the action. Check first so we
    // can return a clear message instead of surfacing the raw unique
    // constraint error from the DB.
    if (willBeActive) {
      const conflict = await prisma.workflow.findFirst({
        where: { trigger, action, isActive: true },
      });
      if (conflict) {
        return res.status(409).json({
          message: `An active automation ("${conflict.name}") already uses this same trigger and action. Deactivate or delete it first, or choose a different action.`,
        });
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        trigger,
        action,
        isActive: willBeActive,
        conditions: conditions ?? undefined,
      },
    });

    res.status(201).json(workflow);

    logAudit(req, 'WORKFLOW_CREATED', `Created automation "${name}" (${trigger} -> ${action}).`);
    emitDataUpdate(req, 'workflows');
  } catch (error) {
    next(error);
  }
};

// 3. PUT /api/workflows/:id — Update/Toggle workflow
export const updateWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, trigger, action, isActive, conditions } = req.body || {};

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }

    const nextTrigger = trigger !== undefined ? trigger : existing.trigger;
    const nextAction = action !== undefined ? action : existing.action;
    const nextIsActive = isActive !== undefined ? !!isActive : existing.isActive;

    // Same duplicate check as create, run against any *other* workflow —
    // covers both "activating this rule" and "editing trigger/action while
    // active" landing on a pair another active rule already owns.
    if (nextIsActive) {
      const conflict = await prisma.workflow.findFirst({
        where: { trigger: nextTrigger, action: nextAction, isActive: true, id: { not: id } },
      });
      if (conflict) {
        return res.status(409).json({
          message: `An active automation ("${conflict.name}") already uses this same trigger and action. Deactivate or delete it first, or choose a different action.`,
        });
      }
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        trigger: nextTrigger,
        action: nextAction,
        isActive: nextIsActive,
        conditions: conditions !== undefined ? conditions : existing.conditions,
      },
    });

    res.json(updated);

    // Toggling active/inactive is by far the most common update, so call
    // it out distinctly rather than logging every edit the same way.
    if (isActive !== undefined && existing.isActive !== nextIsActive) {
      logAudit(req, nextIsActive ? 'WORKFLOW_ACTIVATED' : 'WORKFLOW_DEACTIVATED', `${nextIsActive ? 'Activated' : 'Deactivated'} automation "${updated.name}".`);
    } else {
      logAudit(req, 'WORKFLOW_UPDATED', `Updated automation "${updated.name}" (${nextTrigger} -> ${nextAction}).`);
    }
    emitDataUpdate(req, 'workflows');
  } catch (error) {
    next(error);
  }
};

// 4. DELETE /api/workflows/:id — Delete workflow
export const deleteWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.workflow.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }

    await prisma.workflow.delete({ where: { id } });
    res.json({ message: 'Workflow deleted successfully.' });

    logAudit(req, 'WORKFLOW_DELETED', `Deleted automation "${existing.name}" (${existing.trigger} -> ${existing.action}).`);
    emitDataUpdate(req, 'workflows');
  } catch (error) {
    next(error);
  }
};

// 5. GET /api/workflows/:id/runs — Recent execution history for a workflow
export const getWorkflowRuns = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }

    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { ranAt: 'desc' },
      take: 10,
    });

    res.json(runs);
  } catch (error) {
    next(error);
  }
};
