'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../lib/store';

interface MyPermissionsResponse {
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isAdminBypass: boolean;
  roleName: string;
  permissions: Record<string, Record<string, boolean>> | null;
}

// Fetches the caller's own effective module/action permission map
// (GET /users/permissions — see getMyPermissions in user.controller.ts) and
// keeps the auth store's `user.permissions` in sync with it, the same field
// the 'role_assignment_updated' socket event already writes to on a live
// role change (see hooks/useSocket.tsx). That socket event only fires when
// something changes *while connected*; this hook is what populates the
// field on a fresh login/page load, when there's been no such event yet.
//
// Use the returned `can(module, action)` to decide whether to show/enable a
// role-gated action in the UI (e.g. "New Task", "New Announcement") — it
// mirrors exactly what the backend's `checkPermission` middleware will
// actually allow, instead of showing the control to everyone and only
// discovering a mismatch via a 403 after submit.
export function usePermissions() {
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const { data, isLoading } = useQuery<MyPermissionsResponse>({
    queryKey: ['my-permissions'],
    queryFn: () => api.getMyPermissions(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes — role_assignment_updated pushes live changes anyway
  });

  useEffect(() => {
    if (!data) return;
    updateUser({
      customRoleName: data.roleName,
      // Admins bypass the permission map entirely server-side; store null
      // rather than a synthetic all-true map so `can()` can special-case it
      // explicitly instead of relying on a map staying in sync with every
      // module/action pair hasPermission() might ever be asked about.
      permissions: data.permissions ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const isAdminBypass = user?.role === 'ADMIN';

  const can = useMemo(() => {
    return (module: string, action: string): boolean => {
      if (isAdminBypass) return true;
      return !!user?.permissions?.[module]?.[action];
    };
  }, [isAdminBypass, user?.permissions]);

  return { can, isLoading, isAdminBypass };
}
