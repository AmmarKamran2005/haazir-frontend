/* API shapes → the shapes the components already speak.
 *
 * The components were written against the prototype's HZ objects and they call `engine`
 * helpers with them (`engine.trustBreakdown(v)`, `engine.dishBestWindow(d)`). Adapting the
 * API into those shapes is therefore not laziness about naming — it is what keeps twenty
 * rendering files untouched, and it keeps a single definition of what a venue *is* rather
 * than two that drift.
 *
 * Where the API genuinely has no counterpart the field is null or empty, never invented.
 * `history` and `ticks` are the clear cases: they are simulator state, and the server has
 * no equivalent because nothing simulated the ticks.
 */

import type { FuseResult, FusePart, SourceKey } from '@/lib/hz/types';

export interface ApiLive {
  venue_id: string;
  occupancy: number;
  sd: number;
  confidence: number;
  band: FuseResult['band'];
  trend_per_hour: number;
  wait_p50_min: number;
  wait_p90_min: number;
  // The SSE `live` frame carries a narrower projection than GET /live: it publishes what
  // live_state stores, which has no confidence band on the wait. Optional here so one
  // adapter serves both, rather than two that can disagree about what a fuse is.
  wait_lo_min?: number;
  wait_hi_min?: number;
  source?: string;
  is_live?: boolean;
  updated_at: string;
  sources?: { source: string; label?: string; sub?: string; weight: number }[];
}

const SOURCE_KEYS: SourceKey[] = ['payment', 'staff', 'checkin', 'prior'];

function asSourceKey(s: string): SourceKey {
  return (SOURCE_KEYS as string[]).includes(s) ? (s as SourceKey) : 'prior';
}

export function fuseFromApi(live: ApiLive): FuseResult {
  const staleMin = live.updated_at
    ? Math.max(0, (Date.now() - new Date(live.updated_at).getTime()) / 60000)
    : 0;
  const parts: FusePart[] = (live.sources || []).map(s => ({
    source: asSourceKey(s.source),
    weight: s.weight,
    // The server reports the contribution, not the raw precision or the age in the way the
    // simulator tracked them. Weight is what the UI actually renders; the rest is honest zero.
    precision: s.weight,
    age: 0,
    value: live.occupancy,
  }));

  return {
    occupancy: live.occupancy,
    sd: live.sd,
    confidence: live.confidence,
    trend: live.trend_per_hour,
    parts,
    ticks: [],
    wait: live.wait_p50_min,
    waitLo: live.wait_lo_min ?? live.wait_p50_min,
    waitHi: live.wait_hi_min ?? live.wait_p90_min,
    waitP90: live.wait_p90_min,
    band: live.band,
    staleMin,
    history: [],
  };
}

export interface ApiVenueCard {
  id: string;
  slug: string;
  name: string;
  name_urdu: string | null;
  area: { id: number; name: string; name_urdu: string | null } | null;
  cuisines: string[];
  price_level: number | null;
  avg_ticket_pkr: number | null;
  capacity_covers: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  blurb: string | null;
  attributes: Record<string, unknown>;
  trust_score: number | null;
  trust_components: { key: string; pts: number; max: number; note: string | null }[] | null;
  lat: number;
  lng: number;
  phone: string | null;
  maps_url: string | null;
}

/** The HZ venue object the cards, panels and engine helpers expect. */
export function venueFromCard(card: ApiVenueCard, extra: Partial<HzVenue> = {}): HzVenue {
  return {
    id: card.slug || card.id,
    venueId: card.id,
    name: card.name,
    nameUr: card.name_urdu || '',
    area: card.area?.name || '',
    cuisines: card.cuisines || [],
    price: card.price_level ?? 2,
    avgTicket: card.avg_ticket_pkr ?? 0,
    capacity: card.capacity_covers ?? 0,
    rating: card.google_rating ?? 0,
    reviews: card.google_review_count ?? 0,
    verifiedRating: card.google_rating ?? 0,
    blurb: card.blurb || '',
    lat: card.lat,
    lng: card.lng,
    phone: card.phone,
    mapsUrl: card.maps_url,
    dishes: [],
    facts: (card.attributes || {}) as HzVenue['facts'],
    deals: [],
    trust: {
      score: card.trust_score ?? 0,
      components: card.trust_components || [],
      reviewFlagRate: 0,
      kitchenTransparency: false,
      regulatory: [],
    },
    // Not modelled server-side: the prototype derived it from the simulator's own review set.
    hiddenGem: false,
    ...extra,
  };
}

export interface HzVenue {
  id: string;
  venueId?: string;
  name: string;
  nameUr: string;
  area: string;
  cuisines: string[];
  price: number;
  avgTicket: number;
  capacity: number;
  rating: number;
  reviews: number;
  verifiedRating: number;
  blurb: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  mapsUrl?: string | null;
  dishes: unknown[];
  facts: Record<string, { v: unknown; c: number; n: number; note?: string }>;
  deals: unknown[];
  trust: {
    score: number;
    components?: { key: string; pts: number; max: number; note: string | null }[];
    reviewFlagRate: number;
    kitchenTransparency: boolean;
    /* Shaped like the HZ record so the venue page renders either without branching. Always
       empty for an API venue: the card endpoint does not carry enforcement events, and
       production has ingested none — /v1/venues/{id}/trust is where they will come from. */
    regulatory: {
      date: string;
      verified?: boolean;
      authority?: string;
      type?: string;
      reason?: string;
      fine?: number | null;
      source?: string;
      sourceLabel?: string;
    }[];
  };
  hiddenGem: boolean;
}

export interface ApiSearchResult {
  venue_id: string;
  slug: string;
  name: string;
  name_urdu?: string | null;
  area: string | null;
  score: number;
  factors: { palate: number; live: number; value: number; trust: number; travel: number };
  weights: Record<string, number>;
  live: ApiLive | null;
  travel_min: number | null;
  expected_spend_pkr: number | null;
  trust_score: number | null;
  cuisines?: string[];
  price_level?: number | null;
  avg_ticket_pkr?: number | null;
  why: string | null;
  why_source?: string;
}

/** One ranked row, in the shape `VenueCard` destructures. */
export function resultFromApi(r: ApiSearchResult) {
  const venue: HzVenue = {
    id: r.slug || r.venue_id,
    venueId: r.venue_id,
    name: r.name,
    nameUr: r.name_urdu || '',
    area: r.area || '',
    cuisines: r.cuisines || [],
    price: r.price_level ?? 2,
    /* Zero means "nobody knows", not "free". No scraped venue has an average ticket —
       Google publishes a price level, not a figure — so the card must render the level
       and not a rupee amount it would be making up. */
    avgTicket: r.avg_ticket_pkr ?? 0,
    capacity: 0,
    rating: 0,
    reviews: 0,
    verifiedRating: 0,
    blurb: '',
    dishes: [],
    facts: {},
    deals: [],
    trust: {
      score: r.trust_score ?? 0,
      reviewFlagRate: 0,
      kitchenTransparency: false,
      regulatory: [],
    },
    hiddenGem: false,
  };

  return {
    venue,
    fuse: r.live ? fuseFromApi(r.live) : neutralFuse(),
    total: r.score,
    // The server ranks on a palate factor but does not name a dish, so the card renders
    // without a dish line rather than with a guessed one.
    bestDish: null,
    bestDishQuality: 0,
    travelMin: r.travel_min ?? 0,
    spend: r.expected_spend_pkr ?? 0,
    factors: r.factors,
    why: r.why || '',
  };
}

/** What a venue looks like when the server has no live estimate for it at all. */
export function neutralFuse(): FuseResult {
  return {
    occupancy: 0,
    sd: 0,
    confidence: 0,
    trend: 0,
    parts: [],
    ticks: [],
    wait: 0,
    waitLo: 0,
    waitHi: 0,
    waitP90: 0,
    band: 'free',
    staleMin: 0,
    history: [],
  };
}
