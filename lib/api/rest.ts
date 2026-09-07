/* The real backend. One function per mock handler, same signature, same return shape.
 *
 * Every function here is async; the mock ones were synchronous. That difference is the only
 * thing the pages had to learn, and `useAsync` in lib/hooks absorbs it.
 */

import type { ParsedQuery } from '@/lib/search';
import type {
  GroupConstraint,
  GroupStatusResponse,
  GroupSolveResult,
  StaffBand,
  StaffTodayResponse,
  StaffSendResult,
  CityStats,
  PartnerAnalytics,
  PartnerPrices,
  FuseResult,
} from '@/lib/hz/types';
import { DEFAULT_ORIGIN } from './config';
import { call, getAccessToken, setAccessToken, setDeviceToken } from './http';
import type { AuthSession, AuthUser } from '@/lib/mock/handlers';
import {
  fuseFromApi,
  neutralFuse,
  resultFromApi,
  venueFromCard,
  type ApiLive,
  type ApiSearchResult,
  type ApiVenueCard,
} from './adapt';

/* Search ------------------------------------------------------------------ */

function searchBody(q: ParsedQuery) {
  return {
    text: q.raw,
    from_lat: DEFAULT_ORIGIN.lat,
    from_lng: DEFAULT_ORIGIN.lng,
    party: q.party,
    budget: q.budget,
    max_travel: q.maxTravel,
    mood: q.mood,
    cuisine: q.cuisine ?? null,
    dish: q.dish ?? null,
    needs_prayer: !!q.needsPrayer,
    needs_family: !!q.needsFamily,
    needs_ramp: !!q.needsRamp,
    needs_card: !!q.needsCard,
    limit: 20,
  };
}

export async function search(q: ParsedQuery) {
  const r = await call<{
    results: ApiSearchResult[];
    relaxed: boolean;
    relaxed_note: string | null;
    empty_reason: string | null;
  }>('/v1/search', { method: 'POST', body: searchBody(q) });

  return {
    results: (r?.results ?? []).map(resultFromApi),
    /* Always empty against the real API, and deliberately so.
     *
     * The prototype could list what it ruled out because it scored every venue in memory.
     * The server applies hard constraints as SQL predicates, so a venue that fails one is
     * never selected and there is nothing to report. Reconstructing the list would mean
     * running a second, unconstrained query on every search — slowing the hottest endpoint
     * in the product to populate a diagnostic panel. If it is wanted, it belongs behind an
     * explicit `explain_exclusions` flag, not on the default path. */
    excluded: [] as { venue: { id: string; name: string }; reasons: string[] }[],
    // The server relaxes and explains in one sentence; the prototype did the same thing
    // client side. empty_reason covers the case where even relaxing found nothing.
    relaxed: r?.relaxed_note ?? r?.empty_reason ?? null,
  };
}

/** The server already wrote the sentence, from the score's own components. */
export function explain(res: { why?: string }): string {
  return res.why ?? '';
}

/* Venue ------------------------------------------------------------------- */

export async function venueLive(id: string) {
  const live = await call<ApiLive>('/v1/venues/' + id + '/live', { nullable: true });
  return live ? fuseFromApi(live) : null;
}

export async function venueCard(ident: string) {
  const card = await call<ApiVenueCard>('/v1/venues/' + ident, { nullable: true });
  return card ? venueFromCard(card) : null;
}

/* City -------------------------------------------------------------------- */

/* The city surface reads one object, the shape `engine.cityState()` returns. The API splits
 * it across /city/pulse (per-area occupancy) and /city/stats (the three headline numbers), so
 * they are fetched together and joined here rather than making the page know that. */
export async function cityState(): Promise<CityStats> {
  const [pulse, stats] = await Promise.all([
    call<{
      areas: {
        area_id: number;
        name: string;
        name_urdu: string;
        occupancy_mean: number;
        band: string;
        venue_count: number;
        live_venue_count: number;
      }[];
      live_fraction: number;
    }>('/v1/city/pulse'),
    call<{
      venue_count: number;
      utilisation_now: number;
      weekly_mean_utilisation: number;
      idle_seats_now: number | null;
    }>('/v1/city/stats'),
  ]);

  return {
    areas: (pulse?.areas ?? []).map((a) => ({
      area: a.name,
      occupancy: a.occupancy_mean,
      waitAvg: 0,
      // The per-area venue list is not sent — the map only needs the count, and shipping
      // every venue in the city to draw eighteen dots would be absurd.
      venues: [],
      venueCount: a.venue_count,
    })),
    cityMean: stats?.utilisation_now ?? 0,
    weeklyMean: stats?.weekly_mean_utilisation ?? 0,
    venues: stats?.venue_count ?? 0,
    // Null when no venue reports its capacity, which is every scraped venue: Google does not
    // publish covers. Zero would read as "the city is full", so the null is passed through
    // and the surface says it does not know.
    idleSeats: stats?.idle_seats_now ?? null,
  };
}

/* Group ------------------------------------------------------------------- */

const GROUP_KEY_PREFIX = 'hz-group-token:';

/** Anonymous. Requiring an account to organise dinner for six would put a sign-up between
 *  five other people and the thing they are trying to do — so the API does not, and neither
 *  does this. The invite links come back once, to the creator, to distribute. */
export async function createGroup(title: string, members: string[]) {
  return await call<{
    group_id: string;
    title: string;
    invites: { slot: number; link: string }[];
  }>('/v1/groups', {
    method: 'POST',
    body: { title, members, from_lat: DEFAULT_ORIGIN.lat, from_lng: DEFAULT_ORIGIN.lng },
  });
}

/** Invite link to guest token. The guest can write its own slot and read it back; there is no
 *  path, for any role, to another member's answer — which is the whole promise of the
 *  surface, so the token is stored per group rather than globally. */
export async function exchangeGroupInvite(groupId: string, inviteToken: string) {
  const r = await call<{ access_token: string; slot: number; group_id: string }>(
    '/v1/auth/group/exchange',
    { method: 'POST', body: { token: inviteToken }, nullable: true },
  );
  if (!r) return null;
  try {
    window.localStorage.setItem(GROUP_KEY_PREFIX + r.group_id, r.access_token);
  } catch {
    /* private mode: the session lasts as long as the tab */
  }
  return r;
}

export function groupToken(groupId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(GROUP_KEY_PREFIX + groupId);
  } catch {
    return null;
  }
}

export async function groupStatus(groupId: string): Promise<GroupStatusResponse> {
  const g = await call<{
    title: string;
    responded: number;
    total: number;
    members: { id: string; name: string; responded: boolean }[];
  }>('/v1/groups/' + groupId, { nullable: true, bearer: groupToken(groupId) });

  if (!g) return { title: '', responded: 0, total: 0, members: [] };
  return {
    title: g.title,
    responded: g.responded,
    total: g.total,
    members: g.members.map((m) => ({
      id: m.id,
      name: m.name,
      nameUr: '',
      responded: m.responded,
    })),
  };
}

export async function submitConstraint(groupId: string, c: GroupConstraint) {
  await call('/v1/groups/' + groupId + '/constraint', {
    method: 'POST',
    bearer: groupToken(groupId),
    body: {
      budget_pkr: c.budget,
      max_travel_min: c.maxTravel,
      diet: c.diet ?? [],
      mood: c.mood ?? null,
    },
  });
  return { ok: true };
}

interface SolveCandidateRaw {
  venue_id: string;
  venue_name: string;
  area: string;
  objective: number;
  min_satisfaction: number;
  mean_satisfaction: number;
  satisfaction: { slot: number; name: string; u: number }[];
  travel_min: number;
  live: { occupancy: number; band: FuseResult['band']; wait_p50_min: number } | null;
}

function solveCandidate(c: SolveCandidateRaw) {
  return {
    venue: { id: c.venue_id, venueId: c.venue_id, name: c.venue_name, area: c.area },
    // `id` because the list keys on it. The slot is the member's stable identity within
    // a group, and it is deliberately not a user id — a guest need not have an account.
    utils: c.satisfaction.map(x => ({ id: String(x.slot), slot: x.slot, name: x.name, u: x.u })),
    travelMin: c.travel_min,
    objective: c.objective,
    minSat: c.min_satisfaction,
    meanSat: c.mean_satisfaction,
    fuse: c.live
      ? { ...neutralFuse(), occupancy: c.live.occupancy, band: c.live.band, wait: c.live.wait_p50_min }
      : neutralFuse(),
  };
}

export async function solveGroupFor(groupId: string): Promise<GroupSolveResult | null> {
  const r = await call<{
    solved: boolean;
    best: SolveCandidateRaw | null;
    runner_up: SolveCandidateRaw | null;
    alternatives: SolveCandidateRaw[];
    diagnostics: { responded: number; ruled_out: number; dietary_constraints: number };
  }>('/v1/groups/' + groupId + '/solve', {
    method: 'POST',
    body: {},
    nullable: true,
    bearer: groupToken(groupId),
  });
  if (!r?.best) return null;

  const status = await groupStatus(groupId);
  return {
    best: solveCandidate(r.best),
    runnerUp: r.runner_up ? solveCandidate(r.runner_up) : null,
    all: (r.alternatives ?? []).map(solveCandidate),
    // The server rules venues out in SQL and reports only how many, never which — the same
    // reason /v1/search cannot list exclusions. A count is what there is.
    infeasible: [],
    /* A count, not a list. The API returns `dietary_constraints` as a number on purpose: the
       organiser learning that somebody in the group has a nut allergy is the leak the whole
       private-constraint design exists to prevent. */
    hardConstraints:
      r.diagnostics?.dietary_constraints > 0
        ? [`${r.diagnostics.dietary_constraints} dietary constraint(s) applied as filters`]
        : [],
    responded: r.diagnostics?.responded ?? status.responded,
    total: status.total,
    weighted: [],
  } as unknown as GroupSolveResult;
}

/* Staff ------------------------------------------------------------------- */

export async function staffSend(
  _venueId: string,
  band: StaffBand,
  waitMin: number,
  where?: { lat: number | null; lng: number | null },
): Promise<StaffSendResult> {
  // The venue is identified by the device token, not by the body: a tablet may only speak
  // for the venue it was issued to. Passing an id here would be a claim the server ignores.
  const r = await call<{ occupancy: number; confidence: number; band: string; geo_ok: boolean }>(
    '/v1/staff/state',
    {
      method: 'POST',
      // The tablet's own position. The server will not let a tap change the estimate unless
      // it can place it in the restaurant, which is the entire reason a staff tap outweighs
      // a diner check-in.
      body: { band, wait_min: waitMin, lat: where?.lat ?? null, lng: where?.lng ?? null },
      asDevice: true,
    },
  );
  return { ok: true, ...(r ?? {}) } as unknown as StaffSendResult;
}

interface StaffTodayRaw {
  venue: { id: string; name: string; area: string; capacity_covers: number | null };
  now: { occupancy: number; band: string; confidence: number; wait_p50_min: number };
  weekly_mean_utilisation: number;
  hours: { hour: string; observed: number | null; expected: number; staff_taps: number }[];
}

/** The console's own numbers, and nulls where the data does not exist.
 *
 *  The prototype's shape assumed covers, idle seats and revenue, because its twelve venues
 *  had a capacity. No scraped venue does — Google does not publish covers — so those are null
 *  rather than zero, and the panel renders a dash. An invented "0 covers today" would be the
 *  same lie as "0 seats empty" on the city map. */
export async function staffToday(_venueId: string): Promise<StaffTodayResponse> {
  const r = await call<StaffTodayRaw>('/v1/staff/today', { nullable: true, asDevice: true });
  if (!r) return EMPTY_STAFF_TODAY;

  const capacity = r.venue?.capacity_covers ?? null;
  const utilisation = r.now?.occupancy ?? 0;

  return {
    venueName: r.venue?.name ?? '',
    venueArea: r.venue?.area ?? '',
    utilisation,
    weeklyMean: r.weekly_mean_utilisation ?? 0,
    staffTapsToday: (r.hours ?? []).reduce((n, h) => n + (h.staff_taps || 0), 0),
    coversToday: capacity == null ? null : Math.round(capacity * utilisation),
    seatsIdle: capacity == null ? null : Math.round(capacity * (1 - utilisation)),
    // Attribution lives on the owner endpoints, not here, so this console does not claim it.
    guestsSent: null,
    revenuePkr: null,
  };
}

export const EMPTY_STAFF_TODAY: StaffTodayResponse = {
  venueName: '',
  venueArea: '',
  utilisation: 0,
  weeklyMean: 0,
  staffTapsToday: 0,
  coversToday: null,
  seatsIdle: null,
  guestsSent: null,
  revenuePkr: null,
};

/** Admin only. Mints a device token bound to one venue, which is what a staff tablet runs on.
 *  The token is returned once and never listed again — `/v1/admin/venues/{id}/devices` (GET)
 *  returns metadata only, deliberately. */
export async function issueDevice(venueId: string, label: string) {
  const r = await call<{
    device_id: string;
    venue_id: string;
    token: string;
    setup_url: string;
    geofence_m: number;
  }>('/v1/admin/venues/' + venueId + '/devices', {
    method: 'POST',
    body: { label, geofence_m: 150 },
  });
  return r;
}

export function enrolDevice(token: string) {
  setDeviceToken(token);
}

/* Partner ----------------------------------------------------------------- */

export async function partnerAnalytics(venueId: string): Promise<PartnerAnalytics | null> {
  return await call<PartnerAnalytics>('/v1/owner/venues/' + venueId + '/analytics', {
    nullable: true,
  });
}

export async function partnerPrices(venueId: string): Promise<PartnerPrices | null> {
  return await call<PartnerPrices>('/v1/owner/venues/' + venueId + '/prices', {
    nullable: true,
  });
}

/* Auth -------------------------------------------------------------------- */

export async function requestMagicLink(email: string) {
  const r = await call<{ message: string; dev_link: string | null }>(
    '/v1/auth/request-link',
    { method: 'POST', body: { email } },
  );
  // Deliberately the same words whether or not the address exists. The API says nothing
  // either, and repeating its silence here keeps the UI from leaking what it hides.
  //
  // `dev_link` is present only when the API is not running in production, where there is
  // usually no mail provider and the alternative is reading a server log. It is null in
  // production and the UI simply has nothing to show.
  return {
    ok: true as const,
    message: r?.message ?? 'If that address is registered, a link is on its way.',
    devLink: r?.dev_link ?? null,
  };
}

/** Who the server thinks we are. The local copy is a cache and can be wrong — a role granted
 *  or revoked server-side would otherwise never reach a browser that already signed in. */
export async function me(): Promise<AuthUser | null> {
  // No token, no question to ask. Without this every signed-out page load fired a request
  // that could only ever 401, and left one in the console of a browser that was behaving
  // perfectly normally.
  if (!getAccessToken()) return null;
  const u = await call<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
  }>('/v1/auth/me', { nullable: true });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    role: (['diner', 'owner', 'admin'].includes(u.role) ? u.role : 'diner') as AuthUser['role'],
    name: u.display_name ?? u.email.split('@')[0],
  };
}

export async function logout() {
  await call('/v1/auth/logout', { method: 'POST', nullable: true });
  setAccessToken(null);
}

/* The API returns a flat TokenOut; the app speaks AuthSession. Converting here rather than
   in the pages keeps one definition of what a session is, and it is the client's job to
   honour the contract it is standing in for. */
interface TokenOut {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: string;
  user_id: string;
  email: string | null;
}

function session(t: TokenOut | null): AuthSession | null {
  if (!t) return null;
  setAccessToken(t.access_token);
  return {
    user: {
      id: t.user_id,
      email: t.email ?? '',
      role: (['diner', 'owner', 'admin'].includes(t.role)
        ? t.role
        : 'diner') as AuthUser['role'],
      name: (t.email ?? '').split('@')[0] || undefined,
    },
    accessToken: t.access_token,
    expiresAt: Date.now() + t.expires_in * 1000,
  };
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  return session(
    await call<TokenOut>('/v1/auth/verify', {
      method: 'POST',
      body: { token },
      nullable: true,
    }),
  );
}

export async function refreshSession(_refreshToken?: string): Promise<AuthSession | null> {
  // The refresh token is an httpOnly cookie; the browser sends it, we never hold it.
  return session(await call<TokenOut>('/v1/auth/refresh', { method: 'POST', nullable: true }));
}

/* Hold ------------------------------------------------------------------- */

export async function hold(venueId: string, partySize = 2) {
  const r = await call<{ hold_id: string }>('/v1/venues/' + venueId + '/hold', {
    method: 'POST',
    body: { party_size: partySize },
    nullable: true,
  });
  return { ok: !!r };
}

/* Check-in ---------------------------------------------------------------- */

export async function checkin(payload: {
  venueId: string;
  band: string;
  partySize?: number;
  lat?: number | null;
  lng?: number | null;
}) {
  const r = await call<{ counted: boolean; note: string | null }>('/v1/checkin', {
    method: 'POST',
    body: {
      venue_id: payload.venueId,
      band: payload.band,
      party_size: payload.partySize ?? null,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
    },
    nullable: true,
  });
  // `counted` is the honest half. A report from outside the geofence is stored for the audit
  // trail and deliberately does not move the estimate, and the API says so — dropping that
  // and returning a bare `ok` would turn a designed refusal into a silent success.
  return { ok: !!r, counted: r?.counted ?? false, note: r?.note ?? null, eventId: 0 };
}
