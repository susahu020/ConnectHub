import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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
    const { name, trigger, action, isActive } = req.body || {};

    if (!name || !trigger || !action) {
      return res.status(400).json({ message: 'Name, trigger, and action are required.' });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        trigger,
        action,
        isActive: isActive === undefined ? true : !!isActive,
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
};

// 3. PUT /api/workflows/:id — Update/Toggle workflow
export const updateWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, trigger, action, isActive } = req.body || {};

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        trigger: trigger !== undefined ? trigger : existing.trigger,
        action: action !== undefined ? action : existing.action,
        isActive: isActive !== undefined ? !!isActive : existing.isActive,
      },
    });

    res.json(updated);
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
  } catch (error) {
    next(error);
  }
};
