import {
  haversineDistanceMeters,
  checkAttendanceGeofence,
  validateAttendanceGeofencePolicy,
  DEFAULT_ATTENDANCE_GEOFENCE_POLICY,
  AttendanceGeofencePolicy,
} from '../geofence.service';

describe('haversineDistanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it('computes a known real-world distance (Empire State Building to Times Square, ~1.4km) within tolerance', () => {
    const empireState = { latitude: 40.748817, longitude: -73.985428 };
    const timesSquare = { latitude: 40.758896, longitude: -73.98513 };
    const distance = haversineDistanceMeters(empireState, timesSquare);
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(1300);
  });

  it('is symmetric', () => {
    const a = { latitude: 12.9716, longitude: 77.5946 };
    const b = { latitude: 13.0827, longitude: 80.2707 };
    expect(haversineDistanceMeters(a, b)).toBe(haversineDistanceMeters(b, a));
  });
});

describe('checkAttendanceGeofence', () => {
  const office = { latitude: 12.9716, longitude: 77.5946 };
  const nearby = { latitude: 12.9718, longitude: 77.5948 }; // a few dozen meters away
  const farAway = { latitude: 13.0827, longitude: 80.2707 }; // a different city entirely

  it('is not applicable when the policy is disabled', () => {
    const result = checkAttendanceGeofence(farAway, { ...DEFAULT_ATTENDANCE_GEOFENCE_POLICY, enabled: false });
    expect(result).toEqual({ applicable: false, withinFence: null, distanceMeters: null, blocked: false });
  });

  it('is not applicable when enabled but office coordinates are missing (misconfigured, never blocks)', () => {
    const policy: AttendanceGeofencePolicy = { ...DEFAULT_ATTENDANCE_GEOFENCE_POLICY, enabled: true, officeLatitude: null, officeLongitude: null };
    const result = checkAttendanceGeofence(farAway, policy);
    expect(result.applicable).toBe(false);
    expect(result.blocked).toBe(false);
  });

  describe('when enabled and configured', () => {
    const policy: AttendanceGeofencePolicy = {
      enabled: true,
      officeLatitude: office.latitude,
      officeLongitude: office.longitude,
      radiusMeters: 200,
      enforceBlock: false,
    };

    it('marks a nearby location as within the fence and never blocks when enforceBlock is off', () => {
      const result = checkAttendanceGeofence(nearby, policy);
      expect(result.applicable).toBe(true);
      expect(result.withinFence).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('marks a far-away location as outside the fence but still does not block when enforceBlock is off', () => {
      const result = checkAttendanceGeofence(farAway, policy);
      expect(result.applicable).toBe(true);
      expect(result.withinFence).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(200);
      expect(result.blocked).toBe(false);
    });

    it('treats missing coordinates as unverified (not failed) when enforceBlock is off', () => {
      const result = checkAttendanceGeofence(null, policy);
      expect(result.applicable).toBe(true);
      expect(result.withinFence).toBeNull();
      expect(result.blocked).toBe(false);
      expect(result.message).toBeUndefined();
    });

    it('blocks a far-away location when enforceBlock is on, with a human-readable message', () => {
      const enforced: AttendanceGeofencePolicy = { ...policy, enforceBlock: true };
      const result = checkAttendanceGeofence(farAway, enforced);
      expect(result.blocked).toBe(true);
      expect(result.message).toMatch(/outside the 200m clock-in range/);
    });

    it('does not block a nearby location even when enforceBlock is on', () => {
      const enforced: AttendanceGeofencePolicy = { ...policy, enforceBlock: true };
      const result = checkAttendanceGeofence(nearby, enforced);
      expect(result.blocked).toBe(false);
    });

    it('blocks missing coordinates when enforceBlock is on', () => {
      const enforced: AttendanceGeofencePolicy = { ...policy, enforceBlock: true };
      const result = checkAttendanceGeofence(null, enforced);
      expect(result.blocked).toBe(true);
      expect(result.message).toMatch(/Location is required/);
    });
  });
});

describe('validateAttendanceGeofencePolicy', () => {
  it('accepts a well-formed disabled policy', () => {
    const result = validateAttendanceGeofencePolicy(DEFAULT_ATTENDANCE_GEOFENCE_POLICY);
    expect(result.valid).toBe(true);
  });

  it('accepts a well-formed enabled policy with coordinates set', () => {
    const result = validateAttendanceGeofencePolicy({
      enabled: true,
      officeLatitude: 12.9716,
      officeLongitude: 77.5946,
      radiusMeters: 150,
      enforceBlock: true,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects enabling geofencing without office coordinates set', () => {
    const result = validateAttendanceGeofencePolicy({
      enabled: true,
      officeLatitude: null,
      officeLongitude: null,
      radiusMeters: 150,
      enforceBlock: false,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects an out-of-range latitude', () => {
    const result = validateAttendanceGeofencePolicy({
      enabled: false,
      officeLatitude: 200,
      officeLongitude: 77.5946,
      radiusMeters: 150,
      enforceBlock: false,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects a non-positive radius', () => {
    const result = validateAttendanceGeofencePolicy({
      enabled: false,
      officeLatitude: null,
      officeLongitude: null,
      radiusMeters: 0,
      enforceBlock: false,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects a non-object input', () => {
    expect(validateAttendanceGeofencePolicy(null).valid).toBe(false);
    expect(validateAttendanceGeofencePolicy('nope').valid).toBe(false);
  });
});
