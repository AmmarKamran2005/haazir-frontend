export interface HistoryPoint { t: number; x: number }

export type SourceKey = 'payment' | 'staff' | 'checkin' | 'prior';

export interface FusePart {
  source: SourceKey;
  precision: number;
  age: number;
  value: number;
  weight: number;
}

export interface FuseResult {
  occupancy: number;
  sd: number;
  confidence: number;
  trend: number;
  parts: FusePart[];
  ticks: unknown[];
  wait: number;
  waitLo: number;
  waitHi: number;
  waitP90: number;
  band: 'free' | 'moderate' | 'busy' | 'full';
  staleMin: number;
  history: HistoryPoint[];
}

export interface Dish {
  id: string;
  name: string;
  nameUr: string;
  price: number;
  peak: [number, number];
  hi: number;
  lo: number;
  decay: number;
  n: number;
  sellout: string | null;
}

export interface GroupMember {
  id: string;
  name: string;
  nameUr: string;
  responded: boolean;
  budget: number;
  diet: string[];
  maxTravel: number;
  mood: string;
  weight: number;
  regret: number;
}

export interface GroupSession {
  title: string;
  members: GroupMember[];
}

export interface GroupConstraint {
  budget: number;
  maxTravel: number;
  mood: string;
  diet: string[];
}

export interface GroupMemberSatisfaction {
  id: string;
  name: string;
  u: number;
  weighted: number;
}

export interface GroupSolveBest {
  venue: any;
  utils: GroupMemberSatisfaction[];
  travelMin: number;
  objective: number;
  minSat: number;
  meanSat: number;
  fuse: FuseResult;
}

export interface GroupSolveResult {
  best: GroupSolveBest;
  runnerUp: GroupSolveBest | null;
  all: GroupSolveBest[];
  infeasible: { venue: any; feasible: false; failed: string[] }[];
  hardConstraints: string[];
  responded: number;
  total: number;
  weighted: { name: string; weight: number; regret: number }[];
}

export interface GroupStatusResponse {
  title: string;
  responded: number;
  total: number;
  members: { id: string; name: string; nameUr: string; responded: boolean }[];
}

export interface CityArea {
  area: string;
  occupancy: number;
  waitAvg: number;
  venues: { v: any; f: any }[];
  /** Set by the API client, which sends a count rather than the venues themselves. */
  venueCount?: number;
}

export interface CityStats {
  areas: CityArea[];
  cityMean: number;
  /** Null when no venue publishes its capacity, which is not the same as zero seats free. */
  idleSeats: number | null;
  venues: number;
  weeklyMean: number;
}

export interface PartnerAnalytics {
  venue: any;
  fuse: any;
  weekCovers: number[];
  utilisation: number[];
  offPeak: {
    window: string;
    utilisation: number;
    seatsIdle: number;
    marginPct: number;
    suggestedDiscount: number;
    projectedCovers: number;
  };
  attribution: {
    sent: number;
    seatedVerified: number;
    revenuePkr: number;
    period: string;
  };
}

export interface PriceRow {
  dish: string;
  dishUr: string;
  yourPrice: number;
  areaMedian: number;
  gap: number;
  gapPct: number;
}

export interface PartnerPrices {
  rows: PriceRow[];
  venueName: string;
  area: string;
}

export type StaffBand = 'free' | 'moderate' | 'busy' | 'full';

export interface StaffStatePayload {
  venueId: string;
  band: StaffBand;
  waitMin: number;
}

export interface StaffTodayResponse {
  venueName: string;
  venueArea: string;
  utilisation: number;
  weeklyMean: number;
  staffTapsToday: number;
  /** Null when the venue's capacity is unknown, which is every scraped venue. Not zero. */
  coversToday: number | null;
  seatsIdle: number | null;
  guestsSent: number | null;
  revenuePkr: number | null;
}

export interface StaffSendResult {
  ok: boolean;
  confidence: number;
  staffWeight: number;
}
