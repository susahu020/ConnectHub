import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { hasPermission } from '../services/rbac.service';

/**
 * Express middleware to enforce module-action authorization.
 */
export const checkPermission = (module: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      const allowed = await hasPermission(req.user.id, module, action);
      if (!allowed) {
        res.status(403).json({ message: `Forbidden. You do not have permission to ${action} in ${module}.` });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
