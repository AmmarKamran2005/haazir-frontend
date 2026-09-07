/* API client.
 *
 * Two implementations behind one set of signatures. `NEXT_PUBLIC_HAAZIR_API` set routes every
 * call to the real backend (lib/api/rest.ts); unset keeps the in-process mock engine
 * (lib/mock/handlers.ts), which is what makes the prototype open on a laptop with no network.
 *
 * Everything here returns a Promise in both modes. The mock handlers are synchronous, so the
 * mock branch wraps them — a page must not be able to tell which mode it is in, and a page
 * that works only because its data happened to arrive synchronously is a page that breaks the
 * moment the backend is switched on.
 */

import { USE_REAL_API } from './api/config';
import * as rest from './api/rest';
import * as mock from './mock/handlers';
import * as mockHub from './mock/sseHub';
import type { ParsedQuery } from './search';
import type { GroupConstraint, CityStats } from './hz/types';
import type { AuthUser } from './mock/handlers';

export { USE_REAL_API, API_BASE, ApiError } from './api/config';
export { getAccessToken, setAccessToken, getDeviceToken, setDeviceToken } from './api/http';
export { issueDevice, enrolDevice, createGroup, exchangeGroupInvite, groupToken } from './api/rest';
export { venueCard } from './api/rest';
export { neutralFuse } from './api/adapt';

export type { SearchResult, ExcludedVenue, SearchResponse, AuthUser, AuthSession } from './mock/handlers';
export type {
  GroupConstraint,
  GroupStatusResponse,
  GroupSolveResult,
  StaffBand,
  StaffTodayResponse,
  StaffSendResult,
  CityStats,
  PartnerAnalytics,
  PartnerPrices,
  PriceRow,
} from './hz/types';

const ready = <T,>(v: T): Promise<T> => Promise.resolve(v);

/* Diner ------------------------------------------------------------------- */

export const search = (q: ParsedQuery) =>
  USE_REAL_API ? rest.search(q) : ready(mock.search(q) as unknown as Awaited<ReturnType<typeof rest.search>>);

/** Real mode: the server sent the sentence with the result. Mock mode: composed here. */
export const explain = (res: any, q: ParsedQuery): string =>
  USE_REAL_API ? rest.explain(res) : mock.explain(res, q);

export const venueLive = (id: string) =>
  USE_REAL_API ? rest.venueLive(id) : ready(mock.venueLive(id));

/** Everything the city surface renders, in the shape `engine.cityState()` returns. */
export const cityState = () =>
  USE_REAL_API ? rest.cityState() : ready(mock.cityPulse() as CityStats);

/* Group -------------------------------------------------------------------
   Two identifiers because the two modes key on different things: the server knows a group
   and works out who you are from your token, while the mock has no auth and keys on the
   member directly. Passing both is honest about that; passing one and reinterpreting it
   would not be. */

export const groupStatus = (groupId: string) =>
  USE_REAL_API ? rest.groupStatus(groupId) : ready(mock.groupStatus(groupId));

export const submitConstraint = (groupId: string, memberId: string, c: GroupConstraint) =>
  USE_REAL_API ? rest.submitConstraint(groupId, c) : ready(mock.submitConstraint(memberId, c));

export const solveGroupFor = (groupId: string, memberId: string) =>
  USE_REAL_API ? rest.solveGroupFor(groupId) : ready(mock.solveGroupFor(memberId));

/* Staff -------------------------------------------------------------------- */

export const staffSend = (
  venueId: string,
  band: any,
  waitMin: number,
  where?: { lat: number | null; lng: number | null },
) =>
  USE_REAL_API
    ? rest.staffSend(venueId, band, waitMin, where)
    : ready(mock.staffSend(venueId, band, waitMin));

export const staffToday = (venueId: string) =>
  USE_REAL_API ? rest.staffToday(venueId) : ready(mock.staffToday(venueId));

/* Partner ------------------------------------------------------------------ */

export const partnerAnalytics = (venueId: string) =>
  USE_REAL_API ? rest.partnerAnalytics(venueId) : ready(mock.partnerAnalytics(venueId));

export const partnerPrices = (venueId: string) =>
  USE_REAL_API ? rest.partnerPrices(venueId) : ready(mock.partnerPrices(venueId));

/* Auth --------------------------------------------------------------------- */

export const requestMagicLink = (email: string) =>
  USE_REAL_API
    ? rest.requestMagicLink(email)
    : ready({ ...mock.requestMagicLink(email), devLink: null as string | null });

/** Revalidate the cached user against the server. Null when the session is gone. */
export const me = () =>
  USE_REAL_API ? rest.me() : ready(null as AuthUser | null);

export const logout = () =>
  USE_REAL_API ? rest.logout() : ready(undefined);

export const verifyToken = (token: string) =>
  USE_REAL_API ? rest.verifyToken(token) : ready(mock.verifyToken(token));

export const refreshSession = (refreshToken?: string) =>
  USE_REAL_API ? rest.refreshSession(refreshToken) : ready(mock.refreshSession(refreshToken ?? ''));

/* Live --------------------------------------------------------------------- */

/** "We are on our way." Requires a signed-in diner: an unattributed referral would be a
    number that flatters us, which is the opposite of what it is for. */
export const hold = (venueId: string, partySize = 2) =>
  USE_REAL_API ? rest.hold(venueId, partySize) : ready({ ok: true });

export const checkin = (
  payload: mockHub.CheckinPayload & { lat?: number | null; lng?: number | null },
) =>
  USE_REAL_API
    ? rest.checkin(payload)
    : ready({ ...mockHub.checkin(payload), counted: true, note: null as string | null });

export { subscribe } from './live/subscribe';
export type { CheckinPayload } from './mock/sseHub';

/* Hooks are NOT re-exported here, deliberately. `useLiveState` imports from this module, so
   re-exporting it made lib/api.ts and the hook import each other — and in a cycle a `const`
   arrow is still undefined when the other module initialises. The symptom was `me is not a
   function` thrown at render, on a page that had nothing to do with auth, only after a cache
   was cleared. Import hooks from their own modules. */
