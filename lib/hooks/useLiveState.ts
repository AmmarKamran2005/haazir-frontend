'use client';

/* useLiveState — a venue's fused live state, from the real stream or the mock hub.
 *
 * Returns the latest FuseResult plus a checkin helper. The fuse updates in place via
 * setState; the LivePanel never unmounts, so the count-up animation and sparkline do not
 * restart on every tick.
 *
 * Against the real backend there are two sources, deliberately. A one-shot GET fills the
 * panel immediately, because SSE only sends on change and a quiet venue would otherwise
 * render empty for as long as nothing happened there. The stream then takes over. Without the
 * fetch, the most common case — a venue nobody is currently reporting on — looks broken.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FuseResult } from '@/lib/hz/types';
import { subscribe } from '@/lib/live/subscribe';
import { currentPosition } from '@/lib/geo';
// Through the dispatcher, not rest.ts directly — going straight to rest would bypass the
// mock and quietly break the offline mode. The cycle that made this look attractive was
// in the other direction and is gone: lib/api.ts no longer re-exports hooks.
import { checkin as sendCheckin, venueLive, USE_REAL_API } from '@/lib/api';

export type ConnectionStatus = 'connecting' | 'live' | 'stale';

export function useLiveState(venueId: string) {
  const [fuse, setFuse] = useState<FuseResult | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const lastId = useRef(0);

  useEffect(() => {
    let alive = true;
    setStatus('connecting');

    if (USE_REAL_API) {
      venueLive(venueId)
        .then((f) => {
          // Do not overwrite a frame the stream already delivered while this was in flight.
          if (alive && f) setFuse((prev) => prev ?? f);
        })
        .catch(() => {
          /* the stream may still succeed; leave the status to it */
        });
    }

    const unsub = subscribe(
      venueId,
      (f, eid) => {
        if (!alive) return;
        lastId.current = eid;
        setFuse(f);
        setStatus('live');
      },
      { onStatus: (up) => alive && setStatus(up ? 'live' : 'stale') },
    );

    return () => {
      alive = false;
      unsub();
    };
  }, [venueId]);

  /* Asks the browser where we are, because the server will not count a report it cannot
     place at the venue — that geofence is the reason a check-in is worth anything. Permission
     denied, unavailable, or a browser without geolocation all resolve to null rather than
     rejecting: the report is still worth recording, it just will not move the estimate, and
     the response says which happened. */
  const doCheckin = useCallback(
    async (band: 'free' | 'moderate' | 'busy' | 'full', partySize: number) => {
      const where = await currentPosition();
      const result = await sendCheckin({ venueId, band, partySize, ...where });
      if (result.ok) lastId.current = result.eventId;
      return result;
    },
    [venueId],
  );

  return { fuse, status, checkin: doCheckin, lastEventId: lastId.current };
}
