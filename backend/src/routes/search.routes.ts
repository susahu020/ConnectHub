import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { globalSearch, searchCategory } from '../controllers/search.controller';

const router = Router();

// ==========================================
// SEARCH
// ==========================================
router.get('/search', authenticate as any, globalSearch as any);
router.get('/search/category', authenticate as any, searchCategory as any);

export default router;
