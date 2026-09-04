import { Request, Response, NextFunction } from 'express';
import { getSystemHealth } from '../services/health.service';

// A public status page (even a minimal "operational/degraded/down" one,
// no detail) is standard for anything calling itself enterprise-grade —
// previously the only health visibility anywhere in the app was the
// admin-only System Health tab. This reuses that exact same underlying
// check (health.service.ts's getSystemHealth) as the single source of
// truth for what's actually being measured, rather than a second,
// possibly-drifting implementation — but strips it down to just
// component names and status labels before it leaves the server. The
// admin view's latency numbers, error messages, and business metrics
// (user counts, pending leave requests, etc.) are deliberately never
// included here: those are internal operational detail that shouldn't be
// exposed to an unauthenticated caller, even in the name of transparency.
export const getPublicStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const io = req.app.get('io');
    const health = await getSystemHealth(io);

    const checks: Record<string, string> = {};
    for (const [name, result] of Object.entries(health.checks)) {
      checks[name] = (result as any).status;
    }

    res.status(200).json({
      status: health.status,
      timestamp: health.timestamp,
      checks,
    });
  } catch (error) {
    next(error);
  }
};
