import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { exportUserData } from '../services/dataExport.service';
import { deleteUserAccount } from '../services/accountDeletion.service';
import { emitDataUpdate } from '../utils/realtime';

/**
 * GET /users/me/export — self-service "right to access" data export.
 * Streams the JSON directly as a download (Content-Disposition: attachment)
 * rather than requiring a separate generate-then-download step, since the
 * data volume for one person is small enough not to need background
 * job/email-when-ready handling.
 */
export const exportMyData = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = await exportUserData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.status(200).send(JSON.stringify(data, null, 2));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /users/me — self-service "right to erasure." Requires re-entering
 * the current password as confirmation (same pattern as changePassword) so
 * a hijacked but already-open session can't be used to instantly destroy an
 * account without the actual password. Refuses if this is the workspace's
 * last remaining Admin (see accountDeletion.service.ts).
 */
export const deleteMyAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword } = req.body;

    if (!currentPassword) {
      res.status(400).json({ message: 'Enter your current password to confirm account deletion.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect password.' });
      return;
    }

    const result = await deleteUserAccount(userId, { id: userId, isSelfService: true });
    if (!result.ok) {
      res.status(400).json({ message: result.message, code: result.code });
      return;
    }

    emitDataUpdate(req, 'users');
    emitDataUpdate(req, 'org');
    res.status(200).json({ message: 'Your account has been permanently deleted.' });
  } catch (error) {
    next(error);
  }
};
