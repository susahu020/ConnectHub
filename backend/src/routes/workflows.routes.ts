import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, getWorkflowRuns } from '../controllers/workflow.controller';

const router = Router();

// ==========================================
// WORKFLOW AUTOMATION
// ==========================================
router.get('/workflows', authenticate as any, authorize(['ADMIN']), getWorkflows as any);
router.post('/workflows', authenticate as any, authorize(['ADMIN']), createWorkflow as any);
router.put('/workflows/:id', authenticate as any, authorize(['ADMIN']), updateWorkflow as any);
router.delete('/workflows/:id', authenticate as any, authorize(['ADMIN']), deleteWorkflow as any);
router.get('/workflows/:id/runs', authenticate as any, authorize(['ADMIN']), getWorkflowRuns as any);

export default router;
