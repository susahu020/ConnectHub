import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const createGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const creatorId = req.user?.id!;
    const { name, description, type, memberIds, userIds, avatarUrl, isBroadcast = false } = req.body;
    const resolvedMemberIds = memberIds || userIds || [];

    // Build the member list ensuring the creator is included
    const uniqueMemberIds = Array.from(new Set([creatorId, ...resolvedMemberIds]));

    const group = await prisma.group.create({
      data: {
        name,
        description,
        type: type || 'CUSTOM',
        isBroadcast: !!isBroadcast,
        avatarUrl: avatarUrl || null,
        createdById: creatorId,
        members: {
          create: uniqueMemberIds.map((userId: string) => ({
            userId,
            role: userId === creatorId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: creatorId,
        action: 'CREATE_GROUP',
        details: `Created group channel "${name}"`,
      },
    });

    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

export const getGroups = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

export const getGroupDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;

    // Ensure user is member
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!member) {
      res.status(403).json({ message: 'Forbidden. You are not a member of this group.' });
      return;
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, designation: true, status: true } },
          },
        },
      },
    });

    res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

export const getGroupMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user?.id!;
    const { limit = '30', cursor, search } = req.query;

    const parsedLimit = parseInt(limit as string);

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      res.status(403).json({ message: 'Forbidden. You are not a member of this group.' });
      return;
    }

    const queryArgs: any = {
      where: {
        groupId,
        NOT: {
          isDeletedFor: {
            has: userId,
          },
        },
        scheduledFor: null,
        ...(search && {
          content: {
            contains: search as string,
            mode: 'insensitive',
          },
        }),
      },
      take: parsedLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        attachments: { include: { file: true } },
        reactions: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        statuses: true,
        parent: { include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
        poll: {
          include: {
            options: {
              include: {
                votes: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
      },
    };

    if (cursor) {
      queryArgs.skip = 1;
      queryArgs.cursor = { id: cursor as string };
    }

    const messages = await prisma.message.findMany(queryArgs);
    const sortedMessages = messages.reverse();

    res.status(200).json({
      messages: sortedMessages,
      nextCursor: messages.length === parsedLimit ? messages[0].id : null,
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user?.id!;

    // Check if requester is group admin (only required if adding someone else)
    if (userId !== requesterId) {
      const requesterMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: requesterId } },
      });

      if (!requesterMember || (requesterMember.role !== 'ADMIN' && req.user?.role !== 'ADMIN')) {
        res.status(403).json({ message: 'Forbidden. Only group admins can add other members.' });
        return;
      }
    }

    // Check if user already exists
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existing) {
      res.status(400).json({ message: 'User is already a member of this group.' });
      return;
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role: 'MEMBER',
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ message: `${membership.user.firstName} added to group.`, membership });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user?.id!;

    const requesterMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requesterId } },
    });

    if (!requesterMember || (requesterMember.role !== 'ADMIN' && req.user?.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Forbidden. Only group admins can remove members.' });
      return;
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    res.status(200).json({ message: 'Member removed from group successfully.', userId });
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user?.id!;

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    res.status(200).json({ message: 'Left the group successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user?.id!;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ message: 'Channel not found.' });
      return;
    }

    if (group.createdById !== userId) {
      res.status(403).json({ message: 'Only the channel creator can delete this channel.' });
      return;
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    res.status(200).json({ message: 'Channel deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const { name, description, avatarUrl, isBroadcast } = req.body;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      res.status(404).json({ message: 'Channel not found.' });
      return;
    }

    // If the group is a broadcast channel, then only an administrator can change or update the profile
    if (group.isBroadcast) {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden. Only an administrator can update the profile of a broadcast channel.' });
        return;
      }
    }

    // Only the channel creator or an administrator can toggle the broadcast channels option
    if (isBroadcast !== undefined && isBroadcast !== group.isBroadcast) {
      if (group.createdById !== userId && req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden. Only the channel creator or an administrator can change broadcast status.' });
        return;
      }
    }

    const updated = await prisma.group.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        isBroadcast: isBroadcast !== undefined ? !!isBroadcast : undefined,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
