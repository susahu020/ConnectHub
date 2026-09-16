// ==========================================
// ATTENDANCE REGULARIZATION VALIDATION
// ==========================================
// Previously the only way to fix a wrong or missing attendance log was an
// Admin silently editing it (updateAttendanceLog) — an employee who forgot
// to clock in, or whose clock-out got recorded wrong, had no way to flag
// that themselves; it depended on them remembering to ask an Admin. This
// gives them a request-and-approval path instead, mirroring how leave and
// expense claims already work (see approval.service.ts) rather than
// inventing a new authorization model.
//
// The validation here only covers what makes a request well-formed; the
// authorization check (is this approver allowed to decide on this
// employee's request) reuses isAuthorizedApprover, and the actual
// attendance-status recompute on approval reuses attendanceStatus.service.ts
// — this module doesn't duplicate either.

const MAX_REASON_LENGTH = 1000;

export interface RegularizationRequestInput {
  date: unknown;
  requestedClockIn?: unknown;
  requestedClockOut?: unknown;
  reason: unknown;
}

export interface ValidatedRegularizationRequest {
  date: Date;
  requestedClockIn: Date | null;
  requestedClockOut: Date | null;
  reason: string;
}

/**
 * `hasExistingAttendance` changes what's required: correcting an existing
 * log only needs the one field that's wrong (e.g. just requestedClockOut
 * if the clock-in was fine), but requesting a log be created from scratch
 * for a day with nothing recorded needs at least a clock-in — you can't
 * create an attendance record that only has a clock-out and no arrival
 * time.
 */
export const validateRegularizationRequest = (
  input: RegularizationRequestInput,
  hasExistingAttendance: boolean
): { valid: true; data: ValidatedRegularizationRequest } | { valid: false; error: string } => {
  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    return { valid: false, error: 'reason is required.' };
  }
  if (input.reason.length > MAX_REASON_LENGTH) {
    return { valid: false, error: `reason must be under ${MAX_REASON_LENGTH} characters.` };
  }

  if (!input.date || typeof input.date !== 'string') {
    return { valid: false, error: 'date is required.' };
  }
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'date must be a valid date.' };
  }
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (date.getTime() > todayEnd.getTime()) {
    return { valid: false, error: 'date cannot be in the future.' };
  }

  const parseOptionalTime = (value: unknown, fieldName: string): { error?: string; value?: Date | null } => {
    if (value === undefined || value === null || value === '') return { value: null };
    if (typeof value !== 'string') return { error: `${fieldName} must be a date/time string.` };
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { error: `${fieldName} must be a valid date/time.` };
    return { value: parsed };
  };

  const clockIn = parseOptionalTime(input.requestedClockIn, 'requestedClockIn');
  if (clockIn.error) return { valid: false, error: clockIn.error };
  const clockOut = parseOptionalTime(input.requestedClockOut, 'requestedClockOut');
  if (clockOut.error) return { valid: false, error: clockOut.error };

  if (!clockIn.value && !clockOut.value) {
    return { valid: false, error: 'At least one of requestedClockIn or requestedClockOut is required.' };
  }
  if (!hasExistingAttendance && !clockIn.value) {
    return { valid: false, error: 'There is no existing attendance log for this date — requestedClockIn is required to create one.' };
  }
  if (clockIn.value && clockOut.value && clockOut.value.getTime() <= clockIn.value.getTime()) {
    return { valid: false, error: 'requestedClockOut must be after requestedClockIn.' };
  }

  return {
    valid: true,
    data: { date, requestedClockIn: clockIn.value ?? null, requestedClockOut: clockOut.value ?? null, reason: input.reason.trim() },
  };
};
