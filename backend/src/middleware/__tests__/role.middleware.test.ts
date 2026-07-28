import { Response, NextFunction } from 'express';
import { authorize } from '../role.middleware';
import { AuthenticatedRequest } from '../auth.middleware';

const makeRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('authorize', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('rejects with 401 when no user is attached to the request', async () => {
    const req = {} as AuthenticatedRequest;
    const res = makeRes();

    await authorize(['ADMIN'] as any)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a user whose enum role is in the allowed list', async () => {
    const req = { user: { role: 'ADMIN' } } as AuthenticatedRequest;
    const res = makeRes();

    await authorize(['ADMIN'] as any)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 403 a user whose enum role is not in the allowed list', async () => {
    const req = { user: { role: 'EMPLOYEE' } } as AuthenticatedRequest;
    const res = makeRes();

    await authorize(['ADMIN', 'MANAGER'] as any)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // Regression test: a CustomRole can be freely named anything by an Admin
  // (e.g. "Admin", "Super Manager") for display/permission-grouping
  // purposes, but that name must NEVER be able to satisfy an enum-gated
  // `authorize([...])` check. Only the authoritative `user.role` enum may.
  // An earlier version of this middleware looked up the CustomRole's name
  // and upper-cased it into the Role enum space as a fallback — meaning an
  // EMPLOYEE assigned a custom role literally named "Admin" could pass
  // `authorize(['ADMIN'])` checks (admin panel, org settings, etc.)
  // without ever holding the real ADMIN enum role.
  it('does NOT grant access based on a CustomRole name that happens to match an enum role', async () => {
    const req = {
      user: { role: 'EMPLOYEE', customRoleId: 'custom-role-1' },
    } as unknown as AuthenticatedRequest;
    const res = makeRes();

    await authorize(['ADMIN'] as any)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a MANAGER through a route permitting either ADMIN or MANAGER', async () => {
    const req = { user: { role: 'MANAGER' } } as AuthenticatedRequest;
    const res = makeRes();

    await authorize(['ADMIN', 'MANAGER'] as any)(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
