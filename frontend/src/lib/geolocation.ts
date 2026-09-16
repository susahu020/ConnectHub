// Best-effort browser geolocation for the HR clock-in flow (see
// app/(dashboard)/hr/page.tsx). Resolves to `null` — never rejects — on
// any failure: no `navigator.geolocation` support, permission denied, a
// timeout, or any other error. Clocking in must always work even when
// location can't be determined; the backend treats missing coordinates as
// "unverified", not "invalid" (see services/geofence.service.ts on the
// backend), unless an Admin has explicitly turned on hard enforcement.
export const getBrowserCoordinates = (timeoutMs = 4000): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => resolve(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
};
