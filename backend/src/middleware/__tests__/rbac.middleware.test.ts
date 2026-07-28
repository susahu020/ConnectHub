import { Response, NextFunction } from 'express';

jest.mock('../../services/rbac.service', () => ({
  hasPermission: jest.fn(),
}));

import { hasPermission } from '../../services/rbac.service';
import { checkPermission } from '../rbac.middleware';
import { AuthenticatedRequest } from '../auth.middleware';

const mockedHasPermission = hasPermission as jest.Mock;

const makeRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('checkPermission', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    mockedHasPermission.mockReset();
  });

  it('rejects with 401 when no user is attached to the request', async () => {
    const req = {} as AuthenticatedRequest;
    const res = makeRes();

    await checkPermission('Tasks', 'Create')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedHasPermission).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when hasPermission resolves true, checking the right module/action/user', async () => {
    mockedHasPermission.mockResolvedValue(true);
    const req = { user: { id: 'user-1' } } as AuthenticatedRequest;
    const res = makeRes();

    await checkPermission('Tasks', 'Create')(req, res, next);

    expect(mockedHasPermission).toHaveBeenCalledWith('user-1', 'Tasks', 'Create');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 403 and a module/action-specific message when hasPermission resolves false', async () => {
    mockedHasPermission.mockResolvedValue(false);
    const req = { user: { id: 'user-2' } } as AuthenticatedRequest;
    const res = makeRes();

    await checkPermission('Payroll', 'Delete')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Payroll') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards unexpected errors to next(error) rather than throwing', async () => {
    const boom = new Error('db down');
    mockedHasPermission.mockRejectedValue(boom);
    const req = { user: { id: 'user-3' } } as AuthenticatedRequest;
    const res = makeRes();

    await checkPermission('Files', 'Delete')(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
