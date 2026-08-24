import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDirectMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markAsRead,
  getRecentChats,
  pinMessage,
  bookmarkMessage,
  getBookmarks,
  createPoll,
  votePoll,
  forwardMessage,
  clearChat,
} from '../controllers/chat.controller';

const router = Router();

// ==========================================
// CHAT & MESSAGING
// ==========================================
router.get('/chats/recent', authenticate as any, getRecentChats as any);
router.get('/chats/direct/:contactId', authenticate as any, getDirectMessages as any);
router.post('/chats/message', authenticate as any, sendMessage as any);
router.put('/chats/message/:id', authenticate as any, editMessage as any);
router.delete('/chats/message/:id', authenticate as any, deleteMessage as any);
router.post('/chats/message/:id/reaction', authenticate as any, addReaction as any);
router.delete('/chats/message/:id/reaction', authenticate as any, removeReaction as any);
router.post('/chats/read', authenticate as any, markAsRead as any);
router.post('/chats/message/:id/pin', authenticate as any, pinMessage as any);
router.post('/chats/message/:id/bookmark', authenticate as any, bookmarkMessage as any);
router.get('/chats/bookmarks', authenticate as any, getBookmarks as any);
router.post('/chats/message/poll', authenticate as any, createPoll as any);
router.post('/chats/message/poll/:optionId/vote', authenticate as any, votePoll as any);
router.post('/chats/message/:id/forward', authenticate as any, forwardMessage as any);
router.post('/chats/clear', authenticate as any, clearChat as any);

export default router;
