// ==========================================
// ATTENDANCE GEOFENCING
// ==========================================
// clockIn (see hr.controller.ts) previously accepted a free-text
// `location` string with zero verification — an employee could type
// "Office" from anywhere, and there was no way to tell a genuine
// work-from-home day from someone clocking in for a colleague who isn't
// actually there. This module adds an actual coordinate check.
//
// Deliberately NOT a hard lockout by default: many orgs are remote-friendly
// and a GPS mismatch has legitimate causes (phone GPS drift, a field visit,
// a laptop with no location permission granted). So this ships disabled,
// and even once enabled an org chooses whether a mismatch just gets
// recorded for visibility (`enforceBlock: false`, the safer default) or
// actually blocks the clock-in (`enforceBlock: true`).

export interface AttendanceGeofencePolicy {
  enabled: boolean;
  /** Office coordinates to measure distance from. Both must be set for the policy to actually apply. */
  officeLatitude: number | null;
  officeLongitude: number | null;
  /** How far (in meters) from the office coordinates counts as "within range". */
  radiusMeters: number;
  /** If true, a clock-in outside the radius (or with no location shared) is rejected outright rather than just flagged. */
  enforceBlock: boolean;
}

export const DEFAULT_ATTENDANCE_GEOFENCE_POLICY: AttendanceGeofencePolicy = {
  enabled: false,
  officeLatitude: null,
  officeLongitude: null,
  radiusMeters: 200,
  enforceBlock: false,
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceCheckResult {
  /** False when the policy is off or misconfigured (missing office coordinates) — nothing to check, nothing recorded, nothing blocked. */
  applicable: boolean;
  /** Null when not applicable, or when the employee shared no coordinates and enforcement is off (unverified, not failed). */
  withinFence: boolean | null;
  distanceMeters: number | null;
  /** True only when enforceBlock is on and the check actually failed (out of range, or no location shared at all). */
  blocked: boolean;
  message?: string;
}

/** Great-circle distance between two coordinates, in meters (haversine formula). Pure/DB-free. */
export const haversineDistanceMeters = (a: Coordinates, b: Coordinates): number => {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_RADIUS_METERS * c);
};

/**
 * Checks a clock-in's reported coordinates (if any) against the org's
 * geofence policy. Pure/DB-free — hr.controller.ts fetches the policy and
 * the submitted coordinates and passes them in.
 */
export const checkAttendanceGeofence = (
  coords: Coordinates | null,
  policy: AttendanceGeofencePolicy
): GeofenceCheckResult => {
  if (!policy.enabled || policy.officeLatitude === null || policy.officeLongitude === null) {
    return { applicable: false, withinFence: null, distanceMeters: null, blocked: false };
  }

  if (!coords) {
    return {
      applicable: true,
      withinFence: null,
      distanceMeters: null,
      blocked: policy.enforceBlock,
      message: policy.enforceBlock
        ? 'Location is required to clock in. Please enable location sharing and try again.'
        : undefined,
    };
  }

  const distanceMeters = haversineDistanceMeters(coords, {
    latitude: policy.officeLatitude,
    longitude: policy.officeLongitude,
  });
  const withinFence = distanceMeters <= policy.radiusMeters;

  return {
    applicable: true,
    withinFence,
    distanceMeters,
    blocked: policy.enforceBlock && !withinFence,
    message:
      policy.enforceBlock && !withinFence
        ? `You're approximately ${distanceMeters}m from the office, outside the ${policy.radiusMeters}m clock-in range. Contact your Admin if you're working remotely today.`
        : undefined,
  };
};

// ==========================================
// POLICY VALIDATION
// ==========================================
// Same purpose/pattern as statutoryDeductions.service.ts and
// attendanceAnomaly.service.ts's validators.

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const validateAttendanceGeofencePolicy = (
  input: any
): { valid: true; policy: AttendanceGeofencePolicy } | { valid: false; error: string } => {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, error: 'attendanceGeofencePolicy must be an object.' };
  }
  if (typeof input.enabled !== 'boolean') {
    return { valid: false, error: 'attendanceGeofencePolicy.enabled must be a boolean.' };
  }
  if (typeof input.enforceBlock !== 'boolean') {
    return { valid: false, error: 'attendanceGeofencePolicy.enforceBlock must be a boolean.' };
  }
  if (input.officeLatitude !== null && (!isFiniteNumber(input.officeLatitude) || input.officeLatitude < -90 || input.officeLatitude > 90)) {
    return { valid: false, error: 'attendanceGeofencePolicy.officeLatitude must be null or a number between -90 and 90.' };
  }
  if (input.officeLongitude !== null && (!isFiniteNumber(input.officeLongitude) || input.officeLongitude < -180 || input.officeLongitude > 180)) {
    return { valid: false, error: 'attendanceGeofencePolicy.officeLongitude must be null or a number between -180 and 180.' };
  }
  if (!isFiniteNumber(input.radiusMeters) || input.radiusMeters <= 0) {
    return { valid: false, error: 'attendanceGeofencePolicy.radiusMeters must be a positive number.' };
  }
  if (input.enabled && (input.officeLatitude === null || input.officeLongitude === null)) {
    return { valid: false, error: 'Office coordinates are required to enable geofencing — set them first, or leave geofencing disabled.' };
  }

  return {
    valid: true,
    policy: {
      enabled: input.enabled,
      officeLatitude: input.officeLatitude,
      officeLongitude: input.officeLongitude,
      radiusMeters: input.radiusMeters,
      enforceBlock: input.enforceBlock,
    },
  };
};
