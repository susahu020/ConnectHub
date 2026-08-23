import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getWikiPages,
  getWikiPage,
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
  rollbackWikiPage,
} from '../controllers/wiki.controller';

const router = Router();

// ==========================================
// COMPANY WIKI
// ==========================================
router.get('/wiki', authenticate as any, getWikiPages as any);
router.get('/wiki/:id', authenticate as any, getWikiPage as any);
router.post('/wiki', authenticate as any, createWikiPage as any);
router.put('/wiki/:id', authenticate as any, updateWikiPage as any);
router.delete('/wiki/:id', authenticate as any, deleteWikiPage as any);
router.post('/wiki/:id/rollback/:versionId', authenticate as any, rollbackWikiPage as any);

export default router;
