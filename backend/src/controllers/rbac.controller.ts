import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateRoleCache } from '../services/rbac.service';

/**
 * Get all custom roles.
 */
export const getRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await prisma.customRole.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(roles);
  } catch (error) {
    next(error);
  }
};

/**
 * Get role details and its permissions.
 */
export const getRoleDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const role = await prisma.customRole.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        permissions: true,
      },
    });

    if (!role) {
      res.status(404).json({ message: 'Role not found.' });
      return;
    }

    res.status(200).json(role);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new custom role.
 */
export const createRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, parentId, duplicateFromRoleId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Role name is required.' });
      return;
    }

    // Check duplicate name
    const existing = await prisma.customRole.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ message: 'Role name already exists.' });
      return;
    }

    // Create the role
    const role = await prisma.customRole.create({
      data: {
        name,
        description,
        parentId: parentId || null,
      },
    });

    // If duplicateFromRoleId is specified, copy permissions
    if (duplicateFromRoleId) {
      const sourcePermissions = await prisma.customPermission.findMany({
        where: { roleId: duplicateFromRoleId },
      });

      if (sourcePermissions.length > 0) {
        await prisma.customPermission.createMany({
          data: sourcePermissions.map((sp) => ({
            roleId: role.id,
            module: sp.module,
            action: sp.action,
            isEnabled: sp.isEnabled,
          })),
        });
      }
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE_ROLE',
        details: `Created custom role "${name}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

/**
 * Update the permission matrix for a specific role.
 */
export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: roleId } = req.params;
    const { permissions } = req.body; // Array of { module: string, action: string, isEnabled: boolean }

    if (!Array.isArray(permissions)) {
      res.status(400).json({ message: 'Permissions array is required.' });
      return;
    }

    const role = await prisma.customRole.findUnique({ where: { id: roleId } });
    if (!role) {
      res.status(404).json({ message: 'Role not found.' });
      return;
    }

    // Upsert permissions
    await prisma.$transaction(
      permissions.map((p) =>
        prisma.customPermission.upsert({
          where: {
            roleId_module_action: {
              roleId,
              module: p.module,
              action: p.action,
            },
          },
          update: { isEnabled: p.isEnabled },
          create: {
            roleId,
            module: p.module,
            action: p.action,
            isEnabled: p.isEnabled,
          },
        })
      )
    );

    // Invalidate Redis permissions cache for this role and its descendants
    await invalidateRoleCache(roleId);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ROLE_PERMISSIONS',
        details: `Updated permission matrix for role "${role.name}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(200).json({ message: 'Role permissions updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate an existing role.
 */
export const duplicateRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { newName, description } = req.body;

    if (!newName || !newName.trim()) {
      res.status(400).json({ message: 'New role name is required.' });
      return;
    }

    const sourceRole = await prisma.customRole.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!sourceRole) {
      res.status(404).json({ message: 'Source role not found.' });
      return;
    }

    const existing = await prisma.customRole.findUnique({ where: { name: newName } });
    if (existing) {
      res.status(400).json({ message: 'Role name already exists.' });
      return;
    }

    // Create target role duplicating parentId
    const duplicatedRole = await prisma.customRole.create({
      data: {
        name: newName,
        description: description || `Duplicate of ${sourceRole.name}`,
        parentId: sourceRole.parentId,
      },
    });

    // Copy permissions
    if (sourceRole.permissions.length > 0) {
      await prisma.customPermission.createMany({
        data: sourceRole.permissions.map((sp) => ({
          roleId: duplicatedRole.id,
          module: sp.module,
          action: sp.action,
          isEnabled: sp.isEnabled,
        })),
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DUPLICATE_ROLE',
        details: `Duplicated role "${sourceRole.name}" to "${newName}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json(duplicatedRole);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a custom role.
 */
export const deleteRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await prisma.customRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      res.status(404).json({ message: 'Role not found.' });
      return;
    }

    if (role._count.users > 0) {
      res.status(400).json({ message: 'Cannot delete a role that has active users assigned.' });
      return;
    }

    // Clean cache
    await invalidateRoleCache(id);

    await prisma.customRole.delete({ where: { id } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE_ROLE',
        details: `Deleted custom role "${role.name}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(200).json({ message: 'Role deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a custom role to a user.
 */
export const assignRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body; // customRoleId

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const role = await prisma.customRole.findUnique({ where: { id: roleId } });
    if (!role) {
      res.status(404).json({ message: 'Custom role not found.' });
      return;
    }

    // Update user: also map role enum to ADMIN/MANAGER/EMPLOYEE for backward compatibility
    let legacyRole = user.role;
    const nameUpper = role.name.toUpperCase();
    if (nameUpper === 'ADMIN') {
      legacyRole = 'ADMIN';
    } else if (nameUpper === 'MANAGER') {
      legacyRole = 'MANAGER';
    } else {
      legacyRole = 'EMPLOYEE';
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        customRoleId: roleId,
        role: legacyRole,
      },
    });

    // Invalidate session cache in Redis to refresh permissions immediately
    await redis.del(`permissions:role:${roleId}`);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ASSIGN_ROLE',
        details: `Assigned custom role "${role.name}" to user ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(200).json({ message: `Role "${role.name}" successfully assigned.` });
  } catch (error) {
    next(error);
  }
};
