import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * List all teams, optionally filtered by department, with their member
 * roster and project count. Available to any authenticated user (teams are
 * an org-wide organizational concept, not sensitive data).
 */
export const getTeams = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { departmentId } = req.query;

    const teams = await prisma.team.findMany({
      where: departmentId ? { departmentId: departmentId as string } : {},
      include: {
        department: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } } },
        },
        _count: { select: { projects: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json(teams);
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true, email: true } } },
        },
        projects: { select: { id: true, name: true } },
      },
    });

    if (!team) {
      res.status(404).json({ message: 'Team not found.' });
      return;
    }

    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, departmentId } = req.body;

    if (!name || !departmentId) {
      res.status(400).json({ message: 'Team name and department are required.' });
      return;
    }

    const team = await prisma.team.create({
      data: { name, description, departmentId },
      include: { department: { select: { id: true, name: true } }, members: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE_TEAM',
        details: `Created team "${name}" in department ${departmentId}`,
      },
    });

    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, departmentId } = req.body;

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(departmentId !== undefined && { departmentId }),
      },
      include: { department: { select: { id: true, name: true } }, members: true },
    });

    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.team.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE_TEAM',
        details: `Deleted team ID: ${id}`,
      },
    });

    res.status(200).json({ message: 'Team deleted successfully.', teamId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a user to a team's roster. Idempotent-ish: relies on the
 * @@unique([teamId, userId]) constraint to reject duplicates cleanly.
 */
export const addTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: teamId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'userId is required.' });
      return;
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) {
      res.status(409).json({ message: 'This user is already on the team.' });
      return;
    }

    const member = await prisma.teamMember.create({
      data: { teamId, userId, role: role || 'MEMBER' },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } } },
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: teamId, userId } = req.params;

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    res.status(200).json({ message: 'Member removed from team.' });
  } catch (error) {
    next(error);
  }
};
