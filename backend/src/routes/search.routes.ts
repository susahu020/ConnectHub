import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { globalSearch } from '../controllers/search.controller';

const router = Router();

// ==========================================
// SEARCH
// ==========================================
router.get('/search', authenticate as any, globalSearch as any);

export default router;
