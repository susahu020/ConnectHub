import prisma from '../config/db';
import redis from '../config/redis';

interface PermissionMap {
  [module: string]: {
    [action: string]: boolean;
  };
}

/**
 * Compile permissions for a role, recursively traversing up the inheritance parent chain.
 * Child role permissions override parent role permissions if explicitly set.
 */
export async function getRolePermissions(roleId: string): Promise<PermissionMap> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  const cacheKey = `permissions:role:${roleId}`;

  // 1. Try to read from Redis cache
  if (isRedisAvailable) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // 2. Resolve Role & Permissions from Database
  const role = await prisma.customRole.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });

  if (!role) {
    return {};
  }

  const compiledMap: PermissionMap = {};

  // Initialize with role's own explicit permissions
  for (const perm of role.permissions) {
    if (!compiledMap[perm.module]) {
      compiledMap[perm.module] = {};
    }
    compiledMap[perm.module][perm.action] = perm.isEnabled;
  }

  // If there is a parent role, resolve its permissions and merge them as fallbacks
  if (role.parentId) {
    const parentMap = await getRolePermissions(role.parentId);
    
    // Merge parent permissions: only use them if the child has not explicitly defined them
    for (const module in parentMap) {
      if (!compiledMap[module]) {
        compiledMap[module] = {};
      }
      for (const action in parentMap[module]) {
        if (compiledMap[module][action] === undefined) {
          compiledMap[module][action] = parentMap[module][action];
        }
      }
    }
  }

  // 3. Cache the compiled result in Redis for 1 hour
  if (isRedisAvailable) {
    await redis.set(cacheKey, JSON.stringify(compiledMap), 'EX', 3600);
  }

  return compiledMap;
}

/**
 * Check if a user has a specific module/action permission.
 */
export async function hasPermission(userId: string, module: string, action: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customRoleId: true, role: true },
  });

  if (!user) return false;

  // Fallback for backward compatibility: legacy ADMIN bypasses all permission checks
  if (user.role === 'ADMIN') {
    return true;
  }

  if (!user.customRoleId) {
    return false;
  }

  const permissions = await getRolePermissions(user.customRoleId);
  return !!permissions[module]?.[action];
}

/**
 * Invalidate the Redis cache for a role and all of its child roles recursively.
 */
export async function invalidateRoleCache(roleId: string): Promise<void> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (!isRedisAvailable) return;

  await redis.del(`permissions:role:${roleId}`);

  // Find all child roles that inherit from this role and invalidate them too
  const children = await prisma.customRole.findMany({
    where: { parentId: roleId },
    select: { id: true },
  });

  for (const child of children) {
    await invalidateRoleCache(child.id);
  }
}
