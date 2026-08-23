import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { createTaskSchema, updateTaskSchema } from '../utils/validation';
import {
  createTask,
  getTasks,
  getTaskDetails,
  updateTask,
  deleteTask,
  addTaskComment,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  logTaskTime,
  getTaskTimeLogs,
  addTaskDependency,
  removeTaskDependency,
} from '../controllers/task.controller';

const router = Router();

// ==========================================
// TASKS & KANBAN
// ==========================================
router.post('/tasks', authenticate as any, checkPermission('Tasks', 'Create'), validate(createTaskSchema), createTask as any);
router.get('/tasks', authenticate as any, getTasks as any);
router.get('/tasks/:id', authenticate as any, getTaskDetails as any);
router.put('/tasks/:id', authenticate as any, checkPermission('Tasks', 'Update'), validate(updateTaskSchema), updateTask as any);
router.delete('/tasks/:id', authenticate as any, checkPermission('Tasks', 'Delete'), deleteTask as any);
router.post('/tasks/:id/comment', authenticate as any, addTaskComment as any);
router.post('/tasks/:id/subtasks', authenticate as any, createSubtask as any);
router.put('/tasks/subtasks/:subtaskId', authenticate as any, toggleSubtask as any);
router.delete('/tasks/subtasks/:subtaskId', authenticate as any, deleteSubtask as any);
router.post('/tasks/:id/timelogs', authenticate as any, logTaskTime as any);
router.get('/tasks/:id/timelogs', authenticate as any, getTaskTimeLogs as any);
router.post('/tasks/:id/dependencies', authenticate as any, addTaskDependency as any);
router.delete('/tasks/:id/dependencies/:dependsOnTaskId', authenticate as any, removeTaskDependency as any);

router.get('/projects', authenticate as any, getProjects as any);
router.post('/projects', authenticate as any, checkPermission('Tasks', 'Create'), createProject as any);
router.put('/projects/:id', authenticate as any, checkPermission('Tasks', 'Update'), updateProject as any);
router.delete('/projects/:id', authenticate as any, checkPermission('Tasks', 'Delete'), deleteProject as any);

export default router;
