/* Mock SSE hub — in-process pub/sub that stands in for the real
   GET /v1/venues/{id}/live/stream endpoint. Hooks into engine.onTick so
   every subscribed venue gets a fuse broadcast on the same 900ms cadence
   the ClockProvider drives. Check-ins call engine.dinerCheckin which
   notifies listeners immediately — the fuse reaches subscribers without
   waiting for the next tick.

   Swapping to the real backend: replace subscribe() with an EventSource
   against /v1/venues/{id}/live/stream; the useLiveState hook does not
   change shape. */
import { HZ, engine } from '@/lib/hz';
import type { FuseResult } from '@/lib/hz/types';

type Listener = (fuse: FuseResult, eventId: number) => void;

const subs = new Map<string, Set<Listener>>();
let eid = 0;

function broadcast(venueId: string) {
  const v = HZ.venues.find((x: any) => x.id === venueId);
  if (!v) return;
  const fuse = engine.fuse(v);
  const id = ++eid;
  subs.get(venueId)?.forEach(fn => fn(fuse, id));
}

function broadcastAll() {
  for (const venueId of subs.keys()) broadcast(venueId);
}

/* Hook into the engine's tick cycle — fires after every tick() and
   after every dinerCheckin / staffReport (both call listeners). */
engine.onTick(() => {
  if (subs.size > 0) broadcastAll();
});

export function subscribe(venueId: string, fn: Listener): () => void {
  if (!subs.has(venueId)) subs.set(venueId, new Set());
  subs.get(venueId)!.add(fn);

  /* Send the current state immediately — mirrors SSE sending the initial
     event on connect so the client does not wait for the first tick. */
  const v = HZ.venues.find((x: any) => x.id === venueId);
  if (v) fn(engine.fuse(v), ++eid);

  return () => {
    const s = subs.get(venueId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) subs.delete(venueId);
  };
}

/* ── Check-in ───────────────────────────────────────────────────────────
   Delegates to engine.dinerCheckin which records the observation at
   check-in sigma (0.14) and notifies all engine listeners — the hub's
   onTick handler broadcasts the re-fused state immediately. */
export interface CheckinPayload {
  venueId: string;
  band: 'free' | 'moderate' | 'busy' | 'full';
  partySize: number;
}

export function checkin(payload: CheckinPayload): { ok: boolean; eventId: number } {
  const v = HZ.venues.find((x: any) => x.id === payload.venueId);
  if (!v) return { ok: false, eventId: 0 };

  engine.dinerCheckin(payload.venueId, payload.band);
  return { ok: true, eventId: eid };
}
