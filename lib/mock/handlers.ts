/* Mock API handlers — seed from HZ data + engine, shaped like the real
   /v1 endpoints from BACKEND-PLAN §7. Swapping to the real backend is a
   base-URL change in lib/api.ts; nothing else moves. */
import { HZ, engine } from '@/lib/hz';
import type { ParsedQuery } from '@/lib/search';
import type { GroupConstraint, GroupStatusResponse, GroupSolveResult, StaffBand, StaffTodayResponse, StaffSendResult, CityStats, PartnerAnalytics, PartnerPrices } from '@/lib/hz/types';

export interface SearchResult {
  venue: any;
  fuse: any;
  total: number;
  bestDish: any;
  bestDishQuality: number;
  travelMin: number;
  spend: number;
  factors: { palate: number; live: number; value: number; trust: number; travel: number };
}

export interface ExcludedVenue { venue: any; reasons: string[] }

export interface SearchResponse {
  results: SearchResult[];
  excluded: ExcludedVenue[];
  relaxed: string | null;
}

/* Never return empty. If nothing matches, relax the weakest constraint
   and say so — a failure becomes a demonstration of the constraint model. */
export function search(q: ParsedQuery): SearchResponse {
  let r = engine.search(q);
  let relaxed: string | null = null;

  if (r.results.length === 0) {
    const q2 = { ...q, maxTravel: q.maxTravel + 15 };
    const r2 = engine.search(q2);
    if (r2.results.length) {
      r = r2;
      relaxed = 'Nothing matched exactly, so travel was relaxed to ' + q2.maxTravel + ' minutes.';
    }
  }
  if (r.results.length === 0) {
    const q3 = { ...q, needsPrayer: false, needsFamily: false, needsRamp: false, needsCard: false };
    const r3 = engine.search(q3);
    if (r3.results.length) {
      r = r3;
      relaxed = 'No venue met every hard constraint. Soft constraints were dropped; hard ones are listed below.';
    }
  }

  return { results: r.results, excluded: r.excluded, relaxed };
}

export function venueLive(id: string) {
  const v = HZ.venues.find((x: any) => x.id === id);
  if (!v) return null;
  return engine.fuse(v);
}

export function cityPulse() {
  return engine.cityState();
}

/* ── Group handlers ────────────────────────────────────────────────────────
   Privacy invariant: no return value from any function here contains another
   member's constraint payload. groupStatus returns names + responded only.
   solveGroupFor returns the solution (derived utility values), never inputs. */

const submittedConstraints = new Map<string, GroupConstraint>();

export function groupStatus(groupId: string): GroupStatusResponse {
  const g = (HZ as any).group;
  if (!g) return { title: '', responded: 0, total: 0, members: [] };
  return {
    title: g.title,
    responded: g.members.filter((m: any) => m.responded || submittedConstraints.has(m.id)).length,
    total: g.members.length,
    members: g.members.map((m: any) => ({
      id: m.id, name: m.name, nameUr: m.nameUr,
      responded: m.responded || submittedConstraints.has(m.id),
    })),
  };
}

export function submitConstraint(memberId: string, constraint: GroupConstraint): { ok: boolean } {
  submittedConstraints.set(memberId, constraint);
  const g = (HZ as any).group;
  if (g) {
    const m = g.members.find((x: any) => x.id === memberId);
    if (m) {
      m.responded = true;
      m.budget = constraint.budget;
      m.maxTravel = constraint.maxTravel;
      m.mood = constraint.mood;
      m.diet = constraint.diet;
    }
  }
  return { ok: true };
}

export function solveGroupFor(memberId: string): GroupSolveResult | null {
  const g = (HZ as any).group;
  if (!g) return null;
  const c = submittedConstraints.get(memberId);
  if (c) {
    const m = g.members.find((x: any) => x.id === memberId);
    if (m) {
      m.budget = c.budget;
      m.maxTravel = c.maxTravel;
      m.mood = c.mood;
      m.diet = c.diet;
      m.responded = true;
    }
  }
  const result = engine.solveGroup(g);
  return result as GroupSolveResult;
}

/* Explanation assembled from the score's own components — a read-out of
   the ranking, not a story generated about it. */
export function explain(res: SearchResult, q: ParsedQuery): string {
  const v = res.venue;
  const f = res.fuse;
  const parts: string[] = [];

  if (res.bestDish && res.bestDishQuality >= 7.6) {
    parts.push(res.bestDish.name + ' scores ' + res.bestDishQuality.toFixed(1) + ' right now — its window is ' + engine.dishBestWindow(res.bestDish) + '.');
  } else if (res.bestDish) {
    parts.push(res.bestDish.name + ' is a ' + res.bestDishQuality.toFixed(1) + ' at this hour, below its ' + engine.dishBestWindow(res.bestDish) + ' peak.');
  }

  if (f.wait < 6) parts.push('Seated on arrival at ' + Math.round(f.occupancy * 100) + '% full.');
  else parts.push(Math.round(f.wait) + ' min wait, ' + Math.round(f.confidence * 100) + '% confident.');

  parts.push('Rs ' + (v.avgTicket * q.party).toLocaleString('en-PK') + ' for ' + q.party + ', ' + res.travelMin + ' min from ' + q.from + '.');
  return parts.join(' ');
}

/* ── Staff console ────────────────────────────────────────────────────────
   POST /staff/state — a one-tap report from the venue's counter tablet.
   Calls engine.staffReport which inserts a high-trust observation (σ=0.05,
   τ=42 min) and notifies all SSE subscribers within the same tick. */

export function staffSend(venueId: string, band: StaffBand, waitMin: number): StaffSendResult {
  const v = HZ.venues.find((x: any) => x.id === venueId);
  if (!v) return { ok: false, confidence: 0, staffWeight: 0 };

  engine.staffReport(venueId, band, waitMin);
  const fuse = engine.fuse(v);
  const staffPart = fuse.parts.find((p: any) => p.source === 'staff');
  return {
    ok: true,
    confidence: fuse.confidence,
    staffWeight: staffPart?.weight ?? 0,
  };
}

export function staffToday(venueId: string): StaffTodayResponse {
  const v = HZ.venues.find((x: any) => x.id === venueId) || HZ.venues[0];
  const r = engine.staffReport(v);
  const capacity = v.capacity ?? null;
  return {
    venueName: v.name,
    venueArea: v.area,
    utilisation: r.utilisation,
    weeklyMean: engine.weeklyMeanUtilisation(),
    staffTapsToday: r.staffTaps ?? 0,
    // The mock's venues do have a capacity, so unlike the API path these are real numbers.
    coversToday: capacity == null ? null : Math.round(capacity * r.utilisation),
    seatsIdle: capacity == null ? null : Math.round(capacity * (1 - r.utilisation)),
    guestsSent: r.guestsSent ?? null,
    revenuePkr: r.revenuePkr ?? null,
  };
}

export function cityStats(): CityStats {
  const cs = engine.cityState();
  const p = (HZ as any).partner;
  const weeklyMean = p ? p.utilisation.reduce((s: number, u: number) => s + u, 0) / p.utilisation.length : cs.cityMean;
  return {
    areas: cs.areas,
    cityMean: cs.cityMean,
    idleSeats: cs.idleSeats,
    venues: cs.venues,
    weeklyMean,
  };
}

/* ── Partner dashboard ─────────────────────────────────────────────────────
   GET /v1/owner/venues/{id}/analytics */

export function partnerAnalytics(venueId: string): PartnerAnalytics | null {
  const v = HZ.venues.find((x: any) => x.id === venueId);
  const p = (HZ as any).partner;
  if (!v || !p || p.venueId !== venueId) return null;
  return {
    venue: v,
    fuse: engine.fuse(v),
    weekCovers: p.weekCovers,
    utilisation: p.utilisation,
    offPeak: p.offPeak,
    attribution: p.attribution,
  };
}

/* ── Price position ────────────────────────────────────────────────────────
   GET /v1/owner/venues/{id}/prices — your price vs area median per dish. */

export function partnerPrices(venueId: string): PartnerPrices | null {
  const v = HZ.venues.find((x: any) => x.id === venueId);
  if (!v) return null;

  const areaVenues = HZ.venues.filter((x: any) => x.area === v.area && x.id !== v.id);
  const rows = (v.dishes || []).map((d: any) => {
    const areaPricesForDish: number[] = [];
    for (const av of areaVenues) {
      for (const ad of (av.dishes || [])) {
        if (ad.name === d.name || ad.id === d.id) {
          areaPricesForDish.push(ad.price);
        }
      }
    }
    const areaMedian = areaPricesForDish.length > 0
      ? areaPricesForDish.sort((a: number, b: number) => a - b)[Math.floor(areaPricesForDish.length / 2)]
      : d.price;
    const gap = d.price - areaMedian;
    const gapPct = areaMedian > 0 ? gap / areaMedian : 0;
    return {
      dish: d.name,
      dishUr: d.nameUr || '',
      yourPrice: d.price,
      areaMedian,
      gap,
      gapPct,
    };
  });

  rows.sort((a: any, b: any) => Math.abs(b.gap) - Math.abs(a.gap));

  return { rows, venueName: v.name, area: v.area };
}

/* ── Auth ──────────────────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  // The database enum is diner | owner | admin. Leaving admin out of the type made the
  // client map it to 'diner', so an admin signed in as one and every admin-only control
  // stayed hidden from the only person allowed to use it.
  role: 'diner' | 'owner' | 'admin';
  name?: string;
  venueId?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

const MOCK_USERS: Record<string, AuthUser> = {
  'diner-token': { id: 'u-diner-1', email: 'amina@example.com', role: 'diner', name: 'Amina' },
  'owner-token': { id: 'u-owner-1', email: 'sajjad@example.com', role: 'owner', name: 'Sajjad', venueId: 'sajjad' },
};

export function requestMagicLink(email: string): { ok: true; message: string } {
  return { ok: true, message: `Magic link sent to ${email}. Check your inbox.` };
}

export function verifyToken(token: string): AuthSession | null {
  const user = MOCK_USERS[token];
  if (!user) return null;
  return {
    user,
    accessToken: 'at-' + Math.random().toString(36).slice(2, 10),
    expiresAt: Date.now() + 3600_000,
  };
}

export function refreshSession(_refreshToken: string): AuthSession | null {
  return {
    user: MOCK_USERS['diner-token'],
    accessToken: 'at-' + Math.random().toString(36).slice(2, 10),
    expiresAt: Date.now() + 3600_000,
  };
}
