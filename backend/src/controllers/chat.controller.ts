import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getDirectMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { contactId } = req.params;
    const { limit = '30', cursor, search } = req.query;

    const parsedLimit = parseInt(limit as string);

    // Keyset pagination excluding messages deleted for me and scheduled messages
    const queryArgs: any = {
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId },
        ],
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

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const senderId = req.user?.id!;
    const { receiverId, groupId, content, fileIds, parentId, voiceNoteUrl, scheduledFor } = req.body;

    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });
      if (group && group.isBroadcast) {
        const memberRecord = group.members.find((m) => m.userId === senderId);
        if (!memberRecord || memberRecord.role !== 'ADMIN') {
          res.status(403).json({ message: 'Only administrators can post in this broadcast channel.' });
          return;
        }
      }
    }

    if (!content && (!fileIds || fileIds.length === 0) && !voiceNoteUrl) {
      res.status(400).json({ message: 'Message content, file, or voice note is required.' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: receiverId || null,
        groupId: groupId || null,
        content: content || '',
        type: voiceNoteUrl ? 'FILE' : (fileIds && fileIds.length > 0 ? 'FILE' : 'TEXT'),
        parentId: parentId || null,
        voiceNoteUrl: voiceNoteUrl || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isDeletedFor: [],
        attachments: fileIds && fileIds.length > 0 ? {
          create: fileIds.map((fileId: string) => ({
            fileId,
          })),
        } : undefined,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        attachments: { include: { file: true } },
        reactions: true,
        parent: { include: { sender: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    // Restore conversation if previously deleted/hidden
    if (receiverId) {
      await prisma.deletedConversation.deleteMany({
        where: {
          OR: [
            { userId: senderId, contactId: receiverId },
            { userId: receiverId, contactId: senderId },
          ],
        },
      });
    } else if (groupId) {
      await prisma.deletedConversation.deleteMany({
        where: {
          groupId,
        },
      });
    }

    // If it's scheduled for future delivery, skip instant socket push
    if (scheduledFor) {
      res.status(201).json(message);
      return;
    }

    // Create delivered status for recipient
    if (receiverId) {
      await prisma.messageStatus.create({
        data: {
          messageId: message.id,
          userId: receiverId,
          status: 'DELIVERED',
        },
      });

      // Notification
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: `New message from ${req.user?.firstName}`,
          message: content ? (content.length > 50 ? `${content.substring(0, 50)}...` : content) : (voiceNoteUrl ? 'Sent a voice note' : 'Sent an attachment'),
          type: 'MESSAGE',
          relatedId: message.id,
        },
      });
    } else if (groupId) {
      // Create delivered status for all members in the group except sender
      const members = await prisma.groupMember.findMany({
        where: { groupId, userId: { not: senderId } },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });

      await prisma.messageStatus.createMany({
        data: members.map((m) => ({
          messageId: message.id,
          userId: m.userId,
          status: 'DELIVERED',
        })),
      });

      // Parse mentions from message content
      const notificationsData = members.map((m) => {
        const isMentioned = content && (
          content.toLowerCase().includes(`@${m.user.firstName.toLowerCase()}`) ||
          content.toLowerCase().includes(`@${m.user.lastName.toLowerCase()}`)
        );

        return {
          userId: m.userId,
          title: isMentioned 
            ? `${req.user?.firstName} mentioned you in a group` 
            : `New message in group`,
          message: `${req.user?.firstName}: ${content ? (content.length > 50 ? `${content.substring(0, 50)}...` : content) : (voiceNoteUrl ? 'Sent a voice note' : 'Sent an attachment')}`,
          type: (isMentioned ? 'MENTION' : 'MESSAGE') as any,
          relatedId: message.id,
        };
      });

      // Notifications for group members
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    // Broadcast message via Socket
    const io = req.app.get('io');
    if (io) {
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('message', message);
        io.to(`user:${senderId}`).emit('message', message);
      } else if (groupId) {
        io.to(`group:${groupId}`).emit('message', message);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    const existingMessage = await prisma.message.findUnique({ where: { id } });
    if (!existingMessage) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    if (existingMessage.senderId !== userId) {
      res.status(403).json({ message: 'Forbidden. You did not send this message.' });
      return;
    }

    // 15-minute edit window (like WhatsApp)
    const timeDifference = Date.now() - new Date(existingMessage.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (timeDifference > fifteenMinutes) {
      res.status(400).json({ message: 'Messages can only be edited within 15 minutes of sending.' });
      return;
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
        isEdited: true,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        attachments: { include: { file: true } },
        reactions: true,
      },
    });

    // Broadcast edit to client rooms
    const io = req.app.get('io');
    if (io) {
      if (existingMessage.receiverId) {
        io.to(`user:${existingMessage.receiverId}`).emit('message_edited', { messageId: id, content, isEdited: true });
        io.to(`user:${existingMessage.senderId}`).emit('message_edited', { messageId: id, content, isEdited: true });
      }
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const { mode = 'FOR_EVERYONE' } = req.body;

    const existingMessage = await prisma.message.findUnique({ where: { id } });
    if (!existingMessage) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    if (mode === 'FOR_ME') {
      if (!existingMessage.isDeletedFor.includes(userId)) {
        await prisma.message.update({
          where: { id },
          data: {
            isDeletedFor: {
              push: userId,
            },
          },
        });
      }
      res.status(200).json({ message: 'Message deleted for you.', messageId: id, mode: 'FOR_ME' });
      return;
    }

    if (existingMessage.senderId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden. You do not have permission to delete this message for everyone.' });
      return;
    }

    await prisma.message.update({
      where: { id },
      data: {
        content: 'This message was deleted.',
        isDeleted: true,
        isDeletedForEveryone: true,
      },
    });

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      if (existingMessage.receiverId) {
        io.to(`user:${existingMessage.receiverId}`).emit('message_deleted', { messageId: id });
        io.to(`user:${existingMessage.senderId}`).emit('message_deleted', { messageId: id });
      } else if (existingMessage.groupId) {
        io.to(`group:${existingMessage.groupId}`).emit('message_deleted', { messageId: id });
      }
    }

    res.status(200).json({ message: 'Message deleted for everyone.', messageId: id, mode: 'FOR_EVERYONE' });
  } catch (error) {
    next(error);
  }
};

export const addReaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id!;

    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json(reaction);
  } catch (error) {
    next(error);
  }
};

export const removeReaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id!;

    await prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });

    res.status(200).json({ message: 'Reaction removed successfully.', messageId, emoji });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { contactId, groupId } = req.body;

    if (contactId) {
      // Mark 1-on-1 messages received from contact as read
      await prisma.messageStatus.updateMany({
        where: {
          userId,
          status: 'DELIVERED',
          message: {
            senderId: contactId,
            receiverId: userId,
          },
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    } else if (groupId) {
      // Mark group messages received as read
      await prisma.messageStatus.updateMany({
        where: {
          userId,
          status: 'DELIVERED',
          message: {
            groupId,
          },
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    }

    res.status(200).json({ message: 'Messages marked as read.' });
  } catch (error) {
    next(error);
  }
};

export const getRecentChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;

    // Get deleted conversations list
    const deletedConversations = await prisma.deletedConversation.findMany({
      where: { userId },
    });
    const deletedContactIds = new Set(deletedConversations.map((c) => c.contactId).filter(Boolean));
    const deletedGroupIds = new Set(deletedConversations.map((c) => c.groupId).filter(Boolean));

    // 1. Get recent direct message participants
    const directMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, groupId: null },
          { receiverId: userId, groupId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Look at last 200 messages to construct recent contacts list
      select: {
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        isDeletedFor: true,
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, status: true, lastSeen: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, status: true, lastSeen: true } },
      },
    });

    const recentDMsMap = new Map<string, any>();
    for (const msg of directMessages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!otherUser) continue;

      // Skip if this conversation has been deleted by the user!
      if (deletedContactIds.has(otherUser.id)) continue;

      if (!recentDMsMap.has(otherUser.id)) {
        const isMsgDeletedForMe = msg.isDeletedFor.includes(userId);
        recentDMsMap.set(otherUser.id, {
          id: otherUser.id,
          type: 'DIRECT',
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          avatarUrl: otherUser.avatarUrl,
          status: otherUser.status === 'INVISIBLE' ? 'OFFLINE' : otherUser.status,
          lastSeen: otherUser.lastSeen,
          lastMessage: isMsgDeletedForMe ? 'No messages yet' : msg.content,
          lastMessageAt: msg.createdAt,
        });
      }
    }

    const recentDMsList = Array.from(recentDMsMap.values());
    const recentDMsWithUnread = await Promise.all(
      recentDMsList.map(async (chat) => {
        const unreadCount = await prisma.messageStatus.count({
          where: {
            userId,
            status: 'DELIVERED',
            message: {
              senderId: chat.id,
              receiverId: userId,
              groupId: null,
            },
          },
        });
        return {
          ...chat,
          unreadCount,
        };
      })
    );

    // 2. Get user's groups
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { content: true, createdAt: true, isDeletedFor: true },
            },
          },
        },
      },
    });

    const recentGroups = groupMemberships
      .filter((membership) => !deletedGroupIds.has(membership.group.id))
      .map((membership) => {
        const group = membership.group;
        const lastMsg = group.messages[0];
        const isMsgDeletedForMe = lastMsg ? lastMsg.isDeletedFor.includes(userId) : false;
        return {
          id: group.id,
          type: 'GROUP',
          groupType: group.type,
          name: group.name,
          avatarUrl: group.avatarUrl,
          lastMessage: lastMsg ? (isMsgDeletedForMe ? 'No messages yet' : lastMsg.content) : 'No messages yet',
          lastMessageAt: lastMsg ? lastMsg.createdAt : group.createdAt,
        };
      });

    const recentGroupsWithUnread = await Promise.all(
      recentGroups.map(async (group) => {
        const unreadCount = await prisma.messageStatus.count({
          where: {
            userId,
            status: 'DELIVERED',
            message: {
              groupId: group.id,
            },
          },
        });
        return {
          ...group,
          unreadCount,
        };
      })
    );

    // Merge and sort by last activity date
    const allChats = [...recentDMsWithUnread, ...recentGroupsWithUnread].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    res.status(200).json(allChats);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle pin message status.
 */
export const pinMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existingMessage = await prisma.message.findUnique({ where: { id } });

    if (!existingMessage) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { isPinned: !existingMessage.isPinned },
    });

    // Broadcast pin toggle
    const io = req.app.get('io');
    if (io) {
      const room = existingMessage.receiverId 
        ? `user:${existingMessage.receiverId}`
        : `group:${existingMessage.groupId}`;
      io.to(room).emit('message_pinned', { messageId: id, isPinned: updated.isPinned });
      if (existingMessage.receiverId) {
        io.to(`user:${existingMessage.senderId}`).emit('message_pinned', { messageId: id, isPinned: updated.isPinned });
      }
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle bookmark message.
 */
export const bookmarkMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user?.id!;

    const existing = await prisma.messageBookmark.findUnique({
      where: { userId_messageId: { userId, messageId } },
    });

    if (existing) {
      await prisma.messageBookmark.delete({
        where: { id: existing.id },
      });
      res.status(200).json({ bookmarked: false });
    } else {
      await prisma.messageBookmark.create({
        data: { userId, messageId },
      });
      res.status(201).json({ bookmarked: true });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get user bookmarked messages.
 */
export const getBookmarks = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const bookmarks = await prisma.messageBookmark.findMany({
      where: { userId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(bookmarks);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a chat message containing an option-based poll.
 */
export const createPoll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const senderId = req.user?.id!;
    const { receiverId, groupId, question, options, expiresAt } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ message: 'Question and at least 2 options are required.' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: receiverId || null,
        groupId: groupId || null,
        content: `Poll: ${question}`,
        type: 'TEXT',
        isDeletedFor: [],
        poll: {
          create: {
            question,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            options: {
              create: options.map((opt: string) => ({
                text: opt,
              })),
            },
          },
        },
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        poll: {
          include: {
            options: {
              include: { votes: true },
            },
          },
        },
      },
    });

    // Broadcast poll creation
    const io = req.app.get('io');
    if (io) {
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('message', message);
        io.to(`user:${senderId}`).emit('message', message);
      } else if (groupId) {
        io.to(`group:${groupId}`).emit('message', message);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Submit or toggle a vote on a poll option.
 */
export const votePoll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { optionId } = req.params;
    const userId = req.user?.id!;

    // Find the option and poll
    const option = await prisma.messagePollOption.findUnique({
      where: { id: optionId },
      include: { poll: { include: { options: true } } },
    });

    if (!option) {
      res.status(404).json({ message: 'Poll option not found.' });
      return;
    }

    // Check if user already voted for this option
    const existingVote = await prisma.messagePollVote.findUnique({
      where: {
        optionId_userId: {
          optionId,
          userId,
        },
      },
    });

    if (existingVote) {
      // Toggle off (remove vote)
      await prisma.messagePollVote.delete({
        where: { id: existingVote.id },
      });
    } else {
      // Remove any other vote this user has in this specific poll (single-choice enforcement)
      const otherOptionIds = option.poll.options.map((o) => o.id);
      await prisma.messagePollVote.deleteMany({
        where: {
          userId,
          optionId: { in: otherOptionIds },
        },
      });

      // Cast new vote
      await prisma.messagePollVote.create({
        data: {
          optionId,
          userId,
        },
      });
    }

    // Fetch updated poll state
    const updatedPoll = await prisma.messagePoll.findUnique({
      where: { id: option.pollId },
      include: {
        message: true,
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
    });

    // Broadcast updated poll votes
    const io = req.app.get('io');
    if (io && updatedPoll) {
      const room = updatedPoll.message.receiverId 
        ? `user:${updatedPoll.message.receiverId}`
        : `group:${updatedPoll.message.groupId}`;
      io.to(room).emit('poll_updated', updatedPoll);
      if (updatedPoll.message.receiverId) {
        io.to(`user:${updatedPoll.message.senderId}`).emit('poll_updated', updatedPoll);
      }
    }

    res.status(200).json(updatedPoll);
  } catch (error) {
    next(error);
  }
};

/**
 * Forward an existing message to multiple recipients.
 */
export const forwardMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const senderId = req.user?.id!;
    const { targetReceiverIds = [], targetGroupIds = [] } = req.body;

    const sourceMessage = await prisma.message.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!sourceMessage) {
      res.status(404).json({ message: 'Source message not found.' });
      return;
    }

    const createdMessages: any[] = [];

    // Forward to direct receivers
    for (const rxId of targetReceiverIds) {
      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId: rxId,
          content: sourceMessage.content,
          type: sourceMessage.type,
          forwardedFromId: sourceMessage.id,
          isDeletedFor: [],
          attachments: sourceMessage.attachments.length > 0 ? {
            create: sourceMessage.attachments.map((a) => ({
              fileId: a.fileId,
            })),
          } : undefined,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          attachments: { include: { file: true } },
          reactions: true,
        },
      });
      createdMessages.push(msg);

      // Status
      await prisma.messageStatus.create({
        data: { messageId: msg.id, userId: rxId, status: 'DELIVERED' },
      });
    }

    // Forward to groups
    for (const grId of targetGroupIds) {
      const msg = await prisma.message.create({
        data: {
          senderId,
          groupId: grId,
          content: sourceMessage.content,
          type: sourceMessage.type,
          forwardedFromId: sourceMessage.id,
          isDeletedFor: [],
          attachments: sourceMessage.attachments.length > 0 ? {
            create: sourceMessage.attachments.map((a) => ({
              fileId: a.fileId,
            })),
          } : undefined,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          attachments: { include: { file: true } },
          reactions: true,
        },
      });
      createdMessages.push(msg);

      // Group members statuses
      const members = await prisma.groupMember.findMany({
        where: { groupId: grId, userId: { not: senderId } },
      });
      await prisma.messageStatus.createMany({
        data: members.map((m) => ({ messageId: msg.id, userId: m.userId, status: 'DELIVERED' })),
      });
    }

    // Broadcast messages via sockets
    const io = req.app.get('io');
    if (io) {
      for (const msg of createdMessages) {
        if (msg.receiverId) {
          io.to(`user:${msg.receiverId}`).emit('message', msg);
          io.to(`user:${senderId}`).emit('message', msg);
        } else if (msg.groupId) {
          io.to(`group:${msg.groupId}`).emit('message', msg);
        }
      }
    }

    res.status(200).json({ message: 'Message forwarded successfully.', count: createdMessages.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear/delete all messages in a conversation for the current user.
 */
export const clearChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { contactId, groupId, isDelete = false } = req.body;

    if (!contactId && !groupId) {
      res.status(400).json({ message: 'contactId or groupId is required.' });
      return;
    }

    if (isDelete) {
      if (contactId) {
        await prisma.deletedConversation.upsert({
          where: {
            userId_contactId: {
              userId,
              contactId,
            },
          },
          update: { deletedAt: new Date() },
          create: {
            userId,
            contactId,
          },
        });
      } else if (groupId) {
        await prisma.deletedConversation.upsert({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
          update: { deletedAt: new Date() },
          create: {
            userId,
            groupId,
          },
        });
      }
    }

    if (contactId) {
      // Find all messages in the 1-on-1 chat
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: contactId },
            { senderId: contactId, receiverId: userId },
          ],
          NOT: {
            isDeletedFor: {
              has: userId,
            },
          },
        },
      });

      // Update all to append userId to isDeletedFor
      for (const msg of messages) {
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            isDeletedFor: {
              push: userId,
            },
          },
        });
      }
    } else if (groupId) {
      // Find all messages in the group chat
      const messages = await prisma.message.findMany({
        where: {
          groupId,
          NOT: {
            isDeletedFor: {
              has: userId,
            },
          },
        },
      });

      // Update all to append userId to isDeletedFor
      for (const msg of messages) {
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            isDeletedFor: {
              push: userId,
            },
          },
        });
      }
    }

    res.status(200).json({ message: 'Chat conversation cleared successfully.' });
  } catch (error) {
    next(error);
  }
};

