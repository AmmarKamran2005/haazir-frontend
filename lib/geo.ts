/** Where the browser thinks it is.
 *
 * Both a diner check-in and a staff tap are geofenced server-side: a report the server cannot
 * place at the venue is stored for the audit trail and deliberately does not move the
 * estimate. That rule is the reason either signal is worth anything, so both callers have to
 * ask, and they should ask the same way.
 *
 * Never rejects. Permission denied, position unavailable, a browser without geolocation and a
 * server render all resolve to nulls — the report is still worth sending, it just will not
 * count, and the API says which happened.
 */
export async function currentPosition(): Promise<{ lat: number | null; lng: number | null }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { lat: null, lng: null };
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      // Eight seconds, because a tap that hangs on a permission prompt is worse than one the
      // geofence declines.
      { timeout: 8000, maximumAge: 60_000 },
    );
  });
}
