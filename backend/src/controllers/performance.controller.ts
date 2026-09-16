import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/auditLog';
import { getVisibleUserIds } from '../services/approval.service';
import { createNotification } from '../services/notification.service';
import { validateReviewSubmission, validateCycleDates } from '../services/performanceReview.service';

const emitHRUpdate = (req: any, type: string) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('hr_update', { type });
  }
};

// ==========================================
// REVIEW CYCLES
// ==========================================

export const createReviewCycle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'name is required.' });
      return;
    }
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'startDate and endDate are required.' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateCheck = validateCycleDates(start, end);
    if (!dateCheck.valid) {
      res.status(400).json({ message: dateCheck.error });
      return;
    }

    const cycle = await prisma.performanceReviewCycle.create({
      data: { name: name.trim(), startDate: start, endDate: end, createdById: req.user!.id },
    });

    logAudit(req, 'PERFORMANCE_CYCLE_CREATED', `Created review cycle "${cycle.name}".`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(201).json(cycle);
  } catch (error) {
    next(error);
  }
};

export const getReviewCycles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cycles = await prisma.performanceReviewCycle.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { reviews: true } } },
    });
    res.status(200).json(cycles);
  } catch (error) {
    next(error);
  }
};

// Activating a cycle is the moment the whole feature earns the word
// "automation" — rather than an Admin manually creating N review records,
// this generates exactly one PerformanceReview per active employee,
// pre-assigned to that employee's current reporting manager. An employee
// with no manager set still gets a review row (reviewerId null) rather
// than being silently skipped, so an Admin can see and reassign it instead
// of the gap being invisible.
export const activateReviewCycle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await prisma.performanceReviewCycle.findUnique({ where: { id } });
    if (!cycle) {
      res.status(404).json({ message: 'Review cycle not found.' });
      return;
    }
    if (cycle.status !== 'DRAFT') {
      res.status(400).json({ message: `Only a DRAFT cycle can be activated (this one is ${cycle.status}).` });
      return;
    }

    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, managerId: true },
    });

    const io = req.app.get('io');
    const createdReviews: { id: string; reviewerId: string | null }[] = [];

    for (const employee of employees) {
      // Skip if a review for this employee+cycle already exists (defensive
      // — shouldn't happen on a DRAFT cycle activating for the first time,
      // but activation should never be a destructive operation to retry).
      const existing = await prisma.performanceReview.findUnique({
        where: { cycleId_employeeId: { cycleId: id, employeeId: employee.id } },
      });
      if (existing) continue;

      const review = await prisma.performanceReview.create({
        data: { cycleId: id, employeeId: employee.id, reviewerId: employee.managerId },
      });
      createdReviews.push({ id: review.id, reviewerId: employee.managerId });
    }

    await prisma.performanceReviewCycle.update({ where: { id }, data: { status: 'ACTIVE' } });

    // Notify each reviewer once (a manager with 5 direct reports gets 5
    // reviews created but should get 1 notification, not 5).
    const reviewerIds = [...new Set(createdReviews.map((r) => r.reviewerId).filter((x): x is string => !!x))];
    for (const reviewerId of reviewerIds) {
      const count = createdReviews.filter((r) => r.reviewerId === reviewerId).length;
      await createNotification({
        userId: reviewerId,
        title: 'Performance Reviews Assigned',
        message: `"${cycle.name}" is now active — you have ${count} team member review${count === 1 ? '' : 's'} to complete.`,
        type: 'REMINDER',
        io,
      });
    }

    logAudit(req, 'PERFORMANCE_CYCLE_ACTIVATED', `Activated review cycle "${cycle.name}" — ${createdReviews.length} review(s) generated.`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(200).json({ cycleId: id, reviewsCreated: createdReviews.length });
  } catch (error) {
    next(error);
  }
};

export const closeReviewCycle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await prisma.performanceReviewCycle.findUnique({ where: { id } });
    if (!cycle) {
      res.status(404).json({ message: 'Review cycle not found.' });
      return;
    }
    if (cycle.status !== 'ACTIVE') {
      res.status(400).json({ message: `Only an ACTIVE cycle can be closed (this one is ${cycle.status}).` });
      return;
    }

    await prisma.performanceReviewCycle.update({ where: { id }, data: { status: 'CLOSED' } });
    logAudit(req, 'PERFORMANCE_CYCLE_CLOSED', `Closed review cycle "${cycle.name}".`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(200).json({ message: 'Cycle closed.' });
  } catch (error) {
    next(error);
  }
};

// Deletion is deliberately restricted to DRAFT cycles — once activated,
// a cycle has real review data (even a PENDING review is a record that a
// reviewer was assigned) that shouldn't disappear via cleanup.
export const deleteReviewCycle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await prisma.performanceReviewCycle.findUnique({ where: { id } });
    if (!cycle) {
      res.status(404).json({ message: 'Review cycle not found.' });
      return;
    }
    if (cycle.status !== 'DRAFT') {
      res.status(400).json({ message: 'Only a DRAFT cycle (never activated) can be deleted.' });
      return;
    }

    await prisma.performanceReviewCycle.delete({ where: { id } });
    logAudit(req, 'PERFORMANCE_CYCLE_DELETED', `Deleted draft review cycle "${cycle.name}".`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(200).json({ message: 'Cycle deleted.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REVIEWS
// ==========================================

export const getMyPerformanceReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: { employeeId: req.user!.id },
      include: {
        cycle: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// Reviews the caller owes as a reviewer — the manager-facing "to-do" list.
export const getReviewsToGive = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: { reviewerId: req.user!.id },
      include: {
        cycle: { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// Admin/Manager view of every review in a cycle — scoped the same way
// every other HR "list everything" endpoint is (see getVisibleUserIds):
// Admins see the whole org, Managers see themselves + direct reports only.
export const getCycleReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const visibleUserIds = await getVisibleUserIds(req.user!.id, req.user!.role);

    const reviews = await prisma.performanceReview.findMany({
      where: {
        cycleId: id,
        ...(visibleUserIds ? { employeeId: { in: visibleUserIds } } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

// Reviewer fills out (or edits, while the cycle is still active) their
// assessment. Re-submission is allowed — status SUBMITTED -> SUBMITTED is
// fine — since a manager catching a typo before the employee has
// acknowledged it shouldn't require a support ticket. Once ACKNOWLEDGED,
// editing is blocked so the employee's acknowledgment stays meaningful
// (they signed off on what they actually read).
export const submitReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await prisma.performanceReview.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    const isOwningReviewer = review.reviewerId === req.user!.id;
    if (!isOwningReviewer && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only the assigned reviewer (or an Admin) can submit this review.' });
      return;
    }
    if (review.status === 'ACKNOWLEDGED') {
      res.status(400).json({ message: 'This review has already been acknowledged by the employee and can no longer be edited.' });
      return;
    }

    const validation = validateReviewSubmission(req.body);
    if (!validation.valid) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: {
        ...validation.data,
        status: 'SUBMITTED',
        submittedAt: review.submittedAt || new Date(),
      },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: review.employeeId,
      title: 'Performance Review Ready',
      message: 'Your manager has submitted your performance review — take a look and add your own comments.',
      type: 'REMINDER',
      io,
    });

    logAudit(req, 'PERFORMANCE_REVIEW_SUBMITTED', `Submitted performance review ${id}.`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// Employee reads their submitted review and (optionally) adds their own
// comments — the closing step of the loop. Only the review's own employee
// can acknowledge it; an Admin override isn't offered here since
// acknowledgment is meant to represent the employee's own confirmation,
// not something that can be done on their behalf.
export const acknowledgeReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { employeeComments } = req.body;

    const review = await prisma.performanceReview.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }
    if (review.employeeId !== req.user!.id) {
      res.status(403).json({ message: 'Only the reviewed employee can acknowledge this review.' });
      return;
    }
    if (review.status !== 'SUBMITTED') {
      res.status(400).json({ message: `This review isn't ready to acknowledge yet (status: ${review.status}).` });
      return;
    }
    if (employeeComments !== undefined && employeeComments !== null && typeof employeeComments !== 'string') {
      res.status(400).json({ message: 'employeeComments must be text.' });
      return;
    }
    if (typeof employeeComments === 'string' && employeeComments.length > 5000) {
      res.status(400).json({ message: 'employeeComments must be under 5000 characters.' });
      return;
    }

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: {
        employeeComments: employeeComments || null,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    if (review.reviewerId) {
      const io = req.app.get('io');
      await createNotification({
        userId: review.reviewerId,
        title: 'Review Acknowledged',
        message: 'An employee has acknowledged the performance review you submitted for them.',
        type: 'SYSTEM',
        io,
      });
    }

    logAudit(req, 'PERFORMANCE_REVIEW_ACKNOWLEDGED', `Acknowledged performance review ${id}.`);
    emitHRUpdate(req, 'PERFORMANCE');
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
