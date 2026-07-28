import prisma from '../config/db';

// Company standard: CH01, CH02, ... CH99, CH100, ...
// Employee IDs are system-generated only — never accepted as user input (see
// user.controller.ts, which intentionally does not allow employeeId in any
// profile-update payload, and the corresponding zod schema in utils/validation.ts).
const PREFIX = 'CH';
const PAD_WIDTH = 2;

/**
 * Generate the next sequential Employee ID based on the highest existing one.
 * Falls back to CH01 if no employee IDs exist yet. Retries on the rare race
 * where two users are created at the same moment and collide on the same id.
 */
export async function generateEmployeeId(): Promise<string> {
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existing = await prisma.user.findMany({
      where: { employeeId: { startsWith: PREFIX } },
      select: { employeeId: true },
    });

    let maxNumber = 0;
    for (const { employeeId } of existing) {
      if (!employeeId) continue;
      const match = employeeId.match(/^CH(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }

    const nextNumber = maxNumber + 1;
    const candidate = `${PREFIX}${String(nextNumber).padStart(PAD_WIDTH, '0')}`;

    const clash = await prisma.user.findUnique({ where: { employeeId: candidate } });
    if (!clash) {
      return candidate;
    }
    // Someone else grabbed this id between our read and now — loop and retry.
  }

  // Extremely unlikely fallback: timestamp-based suffix to guarantee uniqueness.
  return `${PREFIX}${Date.now()}`;
}
