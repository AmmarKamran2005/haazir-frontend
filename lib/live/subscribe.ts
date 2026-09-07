/* Live updates, from whichever source is configured.
 *
 * Real mode opens an EventSource against GET /v1/venues/{id}/live/stream. Mock mode keeps the
 * in-process hub driven by the demo clock. Same signature, so `useLiveState` does not know or
 * care which one it got — which was the point of writing the mock hub with this shape.
 *
 * Reconnection is left to EventSource, which already retries with the server's `retry` hint
 * and resends `Last-Event-ID` on its own. Writing a backoff loop here would fight it. What is
 * not automatic is telling the caller whether the stream is currently up, so that is reported.
 */

import type { FuseResult } from '@/lib/hz/types';
import { API_BASE, USE_REAL_API } from '@/lib/api/config';
import { fuseFromApi, type ApiLive } from '@/lib/api/adapt';
import { subscribe as mockSubscribe } from '@/lib/mock/sseHub';

type Listener = (fuse: FuseResult, eventId: number) => void;

export interface SubscribeOptions {
  /** Called when the stream opens or drops, so the UI can show it honestly. */
  onStatus?: (up: boolean) => void;
}

export function subscribe(venueId: string, fn: Listener, opts: SubscribeOptions = {}): () => void {
  if (!USE_REAL_API) {
    opts.onStatus?.(true);
    return mockSubscribe(venueId, fn);
  }

  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    // Server render, or a browser without SSE. The caller still gets its initial value from
    // the one-shot fetch in useLiveState; it simply will not update on its own.
    return () => {};
  }

  const es = new EventSource(`${API_BASE}/v1/venues/${venueId}/live/stream`, {
    withCredentials: true,
  });

  const handle = (ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data) as ApiLive;
      fn(fuseFromApi(payload), Number(ev.lastEventId) || 0);
    } catch {
      // A malformed frame is not worth tearing the stream down for; the next one will do.
    }
  };

  es.addEventListener('live', handle as EventListener);
  es.addEventListener('open', () => opts.onStatus?.(true));
  es.addEventListener('error', () => opts.onStatus?.(false));

  return () => {
    es.removeEventListener('live', handle as EventListener);
    es.close();
  };
}
