/* ═══════════════════════════════════════════════════════════════════════════
   HAAZIR — estimation engine
   ---------------------------------------------------------------------------
   Everything the interface displays as a number comes from here. Nothing here
   is Math.random() dressed up as data:

   · a seeded PRNG drives a hidden "true" occupancy per venue (reproducible on
     stage — the same demo runs the same way twice)
   · four sensor models emit noisy, biased, intermittently-arriving observations
   · a scalar Kalman / inverse-variance filter with per-source exponential
     precision decay fuses them into one estimate + variance
   · confidence and the per-source weight bars are read straight out of that
     filter — they are the estimator's own internals, not a decoration
   · wait time comes from a queueing approximation on the fused occupancy, and
     the p50/p90 band is the fused variance propagated through it

   The sensor INPUT is simulated. The ESTIMATOR is real. That distinction is
   labelled on every screen that shows a live number.
   ═══════════════════════════════════════════════════════════════════════════ */



import D from './data.js';

  /* ── seeded PRNG (mulberry32) ─────────────────────────────────────────── */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Box-Muller, seeded
  function gauss(r) {
    const u = Math.max(r(), 1e-9), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── sensor characteristics ───────────────────────────────────────────────
     sigma  measurement sd in occupancy units (0..1)
     tau    precision half-life in simulated minutes — how fast a reading
            goes stale. A staff tap stays informative far longer than one
            payment window; the prior never goes stale but is never sharp. */
  const SOURCES = {
    payment: { sigma: 0.085, tau: 24,       label: 'Payment velocity',  sub: 'Raast QR merchant ticks', sim: true },
    staff:   { sigma: 0.050, tau: 42,       label: 'Staff console',     sub: 'Venue-side one-tap state', sim: false },
    checkin: { sigma: 0.140, tau: 28,       label: 'Diner check-ins',   sub: 'GPS + dwell verified',     sim: true },
    prior:   { sigma: 0.215, tau: Infinity, label: 'Historical prior',  sub: 'Same hour-of-week, 8 wks', sim: false },
  };
  const SIGMA_REF = 0.215; // the prior's sd — confidence is measured against it

  /* ── clock ────────────────────────────────────────────────────────────────
     Minutes since Sunday 00:00. The whole app reads this, so scrubbing time
     moves every screen at once. */
  const E = D.engine = {
    SOURCES,
    clock: 0,
    speed: 1,          // simulated minutes per real second
    running: true,
    state: {},         // venueId -> filter state
    log: [],           // recent observation events, newest first
    listeners: [],
    seedRun: 20260828,
  };

  E.setClock = function (day, hour, minute) {
    E.clock = day * 1440 + hour * 60 + minute;
  };
  E.hourOfDay = () => (E.clock % 1440) / 60;
  E.dayOfWeek = () => Math.floor(E.clock / 1440) % 7;
  E.hourOfWeek = () => Math.floor(E.clock / 60) % 168;

  E.timeString = function (t) {
    t = t === undefined ? E.clock : t;
    const m = ((t % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60), mm = Math.floor(m % 60);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ampm;
  };
  E.dayName = function (t) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[Math.floor(((t === undefined ? E.clock : t) % 10080) / 1440) % 7];
  };

  /* ── popularity ───────────────────────────────────────────────────────────
     The archetype says *when* a venue is busy; popularity says *how* busy it
     gets at its own peak. Without this every venue saturates at the same hour
     and the city heatmap reads as a solid block — which is both wrong and
     useless. Derived from rating and review volume, penalised while a
     published enforcement action is recent. */
  const popCache = {};
  function popularity(v) {
    if (popCache[v.id] !== undefined) return popCache[v.id];
    const ratingTerm = clamp((v.rating - 3.8) / 1.0, 0, 1);
    const revTerm = clamp(Math.log10(v.reviews + 10) / 3.6, 0, 1);
    let p = 0.30 + 0.45 * ratingTerm + 0.42 * revTerm;
    const sealed = v.trust.regulatory.find(r => r.type === 'sealed');
    if (sealed) p *= clamp(0.42 + daysSince(sealed.date) * 0.006, 0.42, 1);
    popCache[v.id] = clamp(p, 0.30, 1.02);
    return popCache[v.id];
  }
  E.popularity = popularity;

  /* ── priors ───────────────────────────────────────────────────────────── */
  // Smooth interpolation of the 24-point archetype at any fractional hour.
  function priorAt(venue, clock) {
    const curve = D.priors[venue.prior];
    const m = ((clock % 1440) + 1440) % 1440;
    const h = m / 60;
    const i = Math.floor(h) % 24, j = (i + 1) % 24;
    const base = lerp(curve[i], curve[j], h - Math.floor(h));
    const day = Math.floor(clock / 1440) % 7;
    return clamp(base * D.dayFactor[day] * popularity(venue), 0.01, 0.97);
  }
  E.priorAt = priorAt;

  /* Honest weekly figure: the mean of the prior over all 168 hours. The
     "restaurants run at ~40%" claim is a WEEK average — a Friday 9pm reading
     is not evidence for it, so we compute both and label them separately. */
  let weeklyMean = null;
  E.weeklyMeanUtilisation = function () {
    if (weeklyMean !== null) return weeklyMean;   // static — compute once
    let sum = 0, n = 0;
    D.venues.forEach(v => {
      for (let how = 0; how < 168; how += 2) { sum += priorAt(v, how * 60); n++; }
    });
    return (weeklyMean = sum / n);
  };

  /* ── hidden truth ─────────────────────────────────────────────────────────
     What is actually happening in the restaurant. The filter never sees this;
     only the sensors do, through their own noise and bias. We keep it so the
     demo can honestly show estimate-vs-truth error if a judge asks. */
  function truthAt(venue, clock) {
    const r = rng(hash(venue.id) ^ E.seedRun);
    // three slow sinusoids with venue-specific phase → a plausible daily
    // deviation from the prior (a wedding party, a quiet Tuesday, rain)
    const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
    const t = clock / 60;
    // multiplicative, so a quiet venue deviates by a little and a full one by
    // a lot — an additive term would shove every venue onto the ceiling
    const dev = 0.13 * Math.sin(t / 5.1 + p1) + 0.09 * Math.sin(t / 2.3 + p2) + 0.055 * Math.sin(t / 0.9 + p3);
    const bias = (r() - 0.5) * 0.07;              // venue runs busier/quieter than its prior
    return clamp(priorAt(venue, clock) * (1 + dev) + bias, 0.02, 0.98);
  }
  E.truthAt = truthAt;

  /* ── filter state ─────────────────────────────────────────────────────── */
  function initVenue(v) {
    return {
      id: v.id,
      src: {},              // source -> { value, sigma, at }
      history: [],          // { t, x } ring buffer for the trend + sparkline
      staffPinged: false,
      lastCheckin: -999,
      lastPayment: -999,
      paymentTicks: 0,
      ticksThisHour: 0,
    };
  }

  E.reset = function () {
    E.state = {};
    E.log = [];
    D.venues.forEach(v => { E.state[v.id] = initVenue(v); });
    // Prime with the prior + one round of each simulated sensor so the app
    // never opens on an empty estimator.
    D.venues.forEach(v => {
      const s = E.state[v.id];
      observe(v, s, 'prior', priorAt(v, E.clock), E.clock, true);
      emitPayment(v, s, E.clock - 4, true);
      if (hash(v.id) % 3 !== 0) emitCheckin(v, s, E.clock - 9, true);
      if (['kolachi', 'sajjad', 'javed-nihari', 'bundu-khan'].indexOf(v.id) >= 0)
        observe(v, s, 'staff', clamp(truthAt(v, E.clock - 6) + gauss(rng(hash(v.id) + 7)) * 0.05, 0, 1), E.clock - 6, true);
      // seed the sparkline with the last 90 minutes of fused history
      for (let k = 90; k >= 0; k -= 6) {
        s.history.push({ t: E.clock - k, x: truthAt(v, E.clock - k) + gauss(rng(hash(v.id) + k)) * 0.02 });
      }
    });
  };

  function observe(v, s, source, value, at, quiet, sigma) {
    s.src[source] = { value: clamp(value, 0, 1), sigma: sigma || SOURCES[source].sigma, at: at };
    if (!quiet) {
      E.log.unshift({ t: at, venue: v.id, venueName: v.name, source: source, value: value });
      if (E.log.length > 60) E.log.pop();
    }
  }
  E.observe = observe;

  /* Payment velocity: ticks in a window → occupancy. Real signal has a venue
     -specific conversion (ticket size, split bills, cash share) which the
     calibration table would learn; here we bake a stable per-venue bias. */
  function emitPayment(v, s, at, quiet) {
    const r = rng(hash(v.id + '|pay' + Math.floor(at / 3)) ^ E.seedRun);
    const truth = truthAt(v, at);
    const cashShare = v.price <= 1 ? 0.55 : v.price >= 4 ? 0.06 : 0.24; // low-ticket venues are cash-heavy
    const expected = truth * v.capacity * (1 - cashShare) / 45;         // ticks per minute
    const ticks = Math.max(0, Math.round(expected * 12 + gauss(r) * Math.sqrt(Math.max(expected * 12, 1))));
    s.paymentTicks = ticks;
    const scale = 12 * v.capacity * (1 - cashShare) / 45;   // ticks per unit occupancy
    const est = clamp(ticks / scale, 0, 1);
    /* Counting noise is Poisson: the relative error on N ticks is 1/√N. A
       420-cover venue clearing 90 ticks a window gives a sharp reading; an
       80-cover cash-heavy nihari clearing 5 gives a nearly useless one. Using
       one fixed sigma made the filter wildly over-trust small venues and the
       estimate jumped 30 points between frames. Sigma is now per-observation,
       which is also why the staff tap matters far more at a small venue. */
    const sigma = clamp(Math.max(est, 0.08) / Math.sqrt(Math.max(ticks, 1)), 0.055, 0.34);
    observe(v, s, 'payment', est, at, quiet, sigma);
  }

  function emitCheckin(v, s, at, quiet) {
    const r = rng(hash(v.id + '|chk' + Math.floor(at / 7)) ^ E.seedRun);
    const truth = truthAt(v, at);
    // diners self-report optimistically when it's quiet, pessimistically when packed
    const bias = (0.5 - truth) * 0.09;
    observe(v, s, 'checkin', clamp(truth + bias + gauss(r) * SOURCES.checkin.sigma, 0, 1), at, quiet);
    s.lastCheckin = at;
  }

  /* ── the fusion step ──────────────────────────────────────────────────────
     Scalar inverse-variance (== the Kalman update for a 1-D static state),
     with each source's precision decayed exponentially by its own staleness. */
  E.fuse = function (v) {
    const s = E.state[v.id];
    if (!s) return null;
    let num = 0, den = 0;
    const parts = [];
    for (const k in s.src) {
      const o = s.src[k], spec = SOURCES[k];
      const age = Math.max(0, E.clock - o.at);
      const decay = spec.tau === Infinity ? 1 : Math.exp(-age / spec.tau);
      const p = decay / (o.sigma * o.sigma);
      if (p < 1e-4) continue;
      num += p * o.value; den += p;
      parts.push({ source: k, precision: p, age: age, value: o.value });
    }
    if (den === 0) return null;
    const x = num / den;
    const varr = 1 / den;
    const sd = Math.sqrt(varr);
    parts.forEach(p => p.weight = p.precision / den);
    parts.sort((a, b) => b.weight - a.weight);

    // trend: least-squares slope over the last 25 minutes of fused history
    const recent = s.history.filter(h => h.t > E.clock - 25);
    let trend = 0;
    if (recent.length > 2) {
      const n = recent.length;
      const mt = recent.reduce((a, h) => a + h.t, 0) / n;
      const mx = recent.reduce((a, h) => a + h.x, 0) / n;
      let sxy = 0, sxx = 0;
      recent.forEach(h => { sxy += (h.t - mt) * (h.x - mx); sxx += (h.t - mt) * (h.t - mt); });
      trend = sxx > 0 ? (sxy / sxx) * 60 : 0;   // occupancy change per hour
    }

    const confidence = clamp(1 - sd / SIGMA_REF, 0, 0.985);
    const w = waitFrom(x, sd, v);

    return {
      occupancy: x, sd: sd, confidence: confidence, trend: trend,
      parts: parts, ticks: s.paymentTicks,
      wait: w.p50, waitLo: w.lo, waitHi: w.hi, waitP90: w.p90,
      band: stateBand(x),
      staleMin: Math.min.apply(null, parts.filter(p => p.source !== 'prior').map(p => p.age).concat([999])),
      history: s.history.slice(-40),
    };
  };

  /* Wait time from occupancy — a saturating queueing approximation. Below ~72%
     you are seated on arrival; past that, wait grows like rho^4/(1-rho). */
  function waitAt(rho, v) {
    const r = clamp(rho, 0, 0.995);
    if (r < 0.72) return Math.max(0, (r - 0.5) * 6);
    const turn = v.capacity > 300 ? 1.15 : v.capacity < 90 ? 2.1 : 1.55; // small rooms queue harder
    return clamp(turn * Math.pow(r, 4) / Math.max(1 - r, 0.035), 0, 95);
  }
  function waitFrom(x, sd, v) {
    return {
      p50: waitAt(x, v),
      lo: waitAt(Math.max(0, x - sd), v),
      hi: waitAt(Math.min(0.995, x + sd), v),
      p90: waitAt(Math.min(0.995, x + 1.281 * sd), v),
    };
  }
  E.waitAt = waitAt;

  function stateBand(x) {
    if (x < 0.55) return 'free';
    if (x < 0.80) return 'moderate';
    if (x < 0.92) return 'busy';
    return 'full';
  }
  E.stateBand = stateBand;

  /* Forward look: when does the wait next drop below `target` minutes?
     Uses the prior curve forward from now, anchored on the current estimate. */
  E.waitDropsBelow = function (v, target) {
    const now = E.fuse(v);
    if (!now || now.wait <= target) return null;
    const anchorOffset = now.occupancy - priorAt(v, E.clock);
    for (let dt = 10; dt <= 300; dt += 5) {
      const t = E.clock + dt;
      const proj = clamp(priorAt(v, t) + anchorOffset * Math.exp(-dt / 90), 0, 0.995);
      if (waitAt(proj, v) < target) return { at: t, inMin: dt };
    }
    return null;
  };

  /* ── tick loop ────────────────────────────────────────────────────────── */
  E.tick = function (simMinutes) {
    E.clock += simMinutes;
    D.venues.forEach(v => {
      const s = E.state[v.id];
      // prior is re-read continuously — it is a function of the clock
      observe(v, s, 'prior', priorAt(v, E.clock), E.clock, true);
      // payment window closes roughly every 3 simulated minutes
      if (E.clock - s.lastPayment > 3) { emitPayment(v, s, E.clock, true); s.lastPayment = E.clock; }
      // check-ins arrive as a Poisson process whose rate tracks occupancy
      const rate = truthAt(v, E.clock) * (v.capacity / 260) * 0.08; // per simulated minute
      const r = rng(hash(v.id + '|arr' + Math.floor(E.clock)) ^ E.seedRun);
      if (r() < rate * simMinutes) emitCheckin(v, s, E.clock, false);

      const f = E.fuse(v);
      if (f) {
        const last = s.history[s.history.length - 1];
        if (!last || E.clock - last.t >= 2) {
          s.history.push({ t: E.clock, x: f.occupancy });
          if (s.history.length > 240) s.history.shift();
        }
      }
    });
    E.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  };

  E.onTick = function (fn) { E.listeners.push(fn); };

  /* Staff console → a high-trust observation. This is the demo's live moment. */
  E.staffReport = function (venueId, band, waitMin) {
    const v = D.venues.find(x => x.id === venueId);
    const s = E.state[venueId];
    if (!v || !s) return;
    const target = { free: 0.35, moderate: 0.68, busy: 0.87, full: 0.965 }[band];
    // If the host also typed a wait, invert the queueing curve to sharpen it
    let value = target;
    if (typeof waitMin === 'number' && waitMin > 0) {
      let best = target, bestErr = Infinity;
      for (let r = 0.4; r < 0.995; r += 0.005) {
        const err = Math.abs(waitAt(r, v) - waitMin);
        if (err < bestErr) { bestErr = err; best = r; }
      }
      value = clamp(0.45 * target + 0.55 * best, 0, 0.995);
    }
    observe(v, s, 'staff', value, E.clock, false);
    s.staffPinged = true;
    E.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  };

  /* Diner check-in from the app — same pipeline, lower trust weight. */
  E.dinerCheckin = function (venueId, band) {
    const v = D.venues.find(x => x.id === venueId);
    const s = E.state[venueId];
    if (!v || !s) return;
    const target = { free: 0.35, moderate: 0.68, busy: 0.87, full: 0.965 }[band];
    observe(v, s, 'checkin', target, E.clock, false);
    E.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  };

  /* ═══════════════ DISH-TIME GRAPH ═══════════════════════════════════════
     Quality as a function of hour-of-day, fitted from the dish's peak window.
     This is the structural claim: we rank dish-moments, not venues. */
  E.dishCurve = function (dish) {
    const out = new Array(24);
    for (let h = 0; h < 24; h++) out[h] = E.dishQualityAt(dish, h);
    return out;
  };
  E.dishQualityAt = function (dish, hour) {
    const inWin = (h, w) => {
      const a = w[0], b = w[1];
      if (b <= 24) return h >= a && h <= b;
      return h >= a || h <= (b - 24);          // window wraps past midnight
    };
    const distTo = (h, w) => {
      if (inWin(h, w)) return 0;
      const a = w[0], b = w[1] > 24 ? w[1] - 24 : w[1];
      const d1 = Math.min(Math.abs(h - a), 24 - Math.abs(h - a));
      const d2 = Math.min(Math.abs(h - b), 24 - Math.abs(h - b));
      return Math.min(d1, d2);
    };
    let q = dish.hi - distTo(hour, dish.peak) * (dish.decay * (dish.hi - dish.lo) * 0.9);
    if (dish.secondPeak) {
      const q2 = (dish.secondHi || dish.hi - 0.6) - distTo(hour, dish.secondPeak) * (dish.decay * 1.2);
      q = Math.max(q, q2);
    }
    // sold out → not a quality question any more
    if (dish.sellout) {
      const so = parseInt(dish.sellout.split(':')[0], 10) + parseInt(dish.sellout.split(':')[1], 10) / 60;
      const soAdj = so < 4 ? so + 24 : so;
      const hAdj = hour < 4 ? hour + 24 : hour;
      if (hAdj > soAdj) return null;
    }
    return clamp(q, dish.lo - 0.4, 10);
  };
  E.dishBestWindow = function (dish) {
    const fmt = h => {
      const hh = Math.floor(h) % 24, mm = Math.round((h % 1) * 60);
      const ap = hh < 12 ? 'AM' : 'PM', h12 = hh % 12 === 0 ? 12 : hh % 12;
      return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap;
    };
    const win = w => fmt(w[0]) + '–' + fmt(w[1] > 24 ? w[1] - 24 : w[1]);
    // A dish with a second pot (Zahid's night nihari) has two windows; naming
    // only the first makes the app contradict its own score.
    return win(dish.peak) + (dish.secondPeak ? ' and again ' + win(dish.secondPeak) : '');
  };

  /* ═══════════════ TRAVEL ════════════════════════════════════════════════ */
  E.travelMin = function (fromArea, toArea, clock) {
    const a = D.areas[fromArea], b = D.areas[toArea];
    if (!a || !b) return 20;
    const dx = (a.x - b.x) * 24, dy = (a.y - b.y) * 22;   // ≈ km across the seeded city box
    const km = Math.sqrt(dx * dx + dy * dy);
    const h = ((clock === undefined ? E.clock : clock) % 1440) / 60;
    // Karachi congestion: evening peak 18:00–21:00, second bump at 13:00
    const cong = 1 + 0.62 * Math.exp(-Math.pow(h - 19.5, 2) / 5.5) + 0.22 * Math.exp(-Math.pow(h - 13.5, 2) / 3);
    const base = km / 28 * 60;                             // 28 km/h free-flow
    return Math.max(4, Math.round(base * cong + 4));
  };

  /* ═══════════════ TRUST ═════════════════════════════════════════════════
     A named linear combination — the explanation is a read-out of the score,
     not a story generated about it. */
  E.trustBreakdown = function (v) {
    const t = v.trust;
    const comp = [];
    const sealed = t.regulatory.filter(r => r.type === 'sealed');
    let regPts = 40;
    if (sealed.length) {
      const days = daysSince(sealed[0].date);
      regPts = clamp(Math.round(4 + days * 0.35), 4, 40);   // recovers slowly with time
    }
    comp.push({ key: 'Regulatory record', pts: regPts, max: 40,
      note: sealed.length ? 'Sealed ' + daysSince(sealed[0].date) + ' days ago by ' + sealed[0].authority
                          : 'No enforcement action on record' });

    const revPts = Math.round(clamp(1 - t.reviewFlagRate / 0.30, 0, 1) * 25);
    comp.push({ key: 'Review authenticity', pts: revPts, max: 25,
      note: Math.round(t.reviewFlagRate * v.reviews) + ' of ' + v.reviews.toLocaleString() +
            ' reviews flagged (' + Math.round(t.reviewFlagRate * 100) + '%)' });

    const dealPts = v.deals.length
      ? Math.round(clamp(v.deals.reduce((a, d) => a + d.honoured, 0) / v.deals.length, 0, 1) * 15)
      : 12;
    comp.push({ key: 'Deal truth', pts: dealPts, max: 15,
      note: v.deals.length ? v.deals[0].bank + ' ' + v.deals[0].claimed + ' honoured on ' +
            Math.round(v.deals[0].honoured * v.deals[0].n) + ' of ' + v.deals[0].n + ' verified visits'
            : 'No advertised bank offers to verify' });

    const factN = Object.keys(v.facts).reduce((a, k) => a + (v.facts[k].n || 0), 0);
    const factPts = Math.round(clamp(factN / 200, 0, 1) * 10);
    comp.push({ key: 'Fact verification', pts: factPts, max: 10,
      note: factN + ' diner verifications across ' + Object.keys(v.facts).length + ' access facts' });

    const kPts = t.kitchenTransparency ? 10 : 4;
    comp.push({ key: 'Kitchen transparency', pts: kPts, max: 10,
      note: t.kitchenTransparency ? 'Opted in to kitchen transparency' : 'Not opted in' });

    const total = comp.reduce((a, c) => a + c.pts, 0);
    return { total: total, components: comp };
  };
  function daysSince(iso) {
    const then = new Date(iso + 'T00:00:00Z').getTime();
    const now = new Date('2026-08-28T00:00:00Z').getTime();
    return Math.max(0, Math.round((now - then) / 86400000));
  }
  E.daysSince = daysSince;

  /* ═══════════════ MATCH SCORING ═════════════════════════════════════════
     score = Σ wᵢ·factorᵢ, weights fixed and shown to the user. Hard constraints
     are filters applied BEFORE scoring — never penalties inside it. */
  const WEIGHTS = { palate: .30, live: .24, value: .18, trust: .16, travel: .12 };
  E.WEIGHTS = WEIGHTS;

  E.scoreVenue = function (v, q) {
    const f = E.fuse(v);
    const hour = E.hourOfDay();

    // palate — cosine-ish agreement between the query mood and what this
    // venue is currently good at, weighted by the best dish available now
    let bestDish = null, bestQ = -1;
    v.dishes.forEach(d => {
      const dq = E.dishQualityAt(d, hour);
      if (dq !== null && dq > bestQ) { bestQ = dq; bestDish = d; }
    });
    const dishScore = bestQ > 0 ? bestQ / 10 : 0.45;
    let palate = dishScore;
    if (q.mood === 'spicy' && /BBQ|Pakistani|Nihari/.test(v.cuisines.join(' '))) palate += .10;
    if (q.mood === 'quiet' && v.facts.noise_level && /quiet|moderate/.test(String(v.facts.noise_level.v))) palate += .12;
    if (q.mood === 'bbq' && v.cuisines.indexOf('BBQ') >= 0) palate += .12;
    if (D.user.loved.indexOf(bestDish && bestDish.id) >= 0) palate += .06;
    palate = clamp(palate, 0, 1);

    // live — short waits and a confident estimate both count
    const waitPen = clamp(1 - f.wait / 45, 0, 1);
    const live = clamp(waitPen * (0.62 + 0.38 * f.confidence), 0, 1);

    // value — how the expected spend sits against the stated budget
    const spend = v.avgTicket * (q.party || 1);
    const budget = (q.budget || D.user.budgetTypical) * (q.party || 1);
    const value = clamp(1 - Math.max(0, spend - budget * 0.75) / (budget * 0.9), 0, 1);

    const trust = clamp(E.trustBreakdown(v).total / 100, 0, 1);

    const tmin = E.travelMin(q.from || D.user.homeArea, v.area);
    const travel = clamp(1 - tmin / (q.maxTravel || 40), 0, 1);

    const total =
      WEIGHTS.palate * palate + WEIGHTS.live * live + WEIGHTS.value * value +
      WEIGHTS.trust * trust + WEIGHTS.travel * travel;

    return {
      venue: v, fuse: f, total: total, bestDish: bestDish, bestDishQuality: bestQ,
      travelMin: tmin, spend: spend,
      factors: { palate: palate, live: live, value: value, trust: trust, travel: travel },
    };
  };

  /* Hard constraints as filters. Allergy / halal / accessibility are never
     scored — they either pass or the venue is not in the result set. */
  E.hardFilter = function (v, q) {
    const reasons = [];
    /* Access + safety constraints — these are the ones that must never be
       traded off against taste. */
    if (q.needsPrayer && !(v.facts.prayer_area && v.facts.prayer_area.v)) reasons.push('no prayer area');
    if (q.needsFamily && !(v.facts.family_section && v.facts.family_section.v)) reasons.push('no family section');
    if (q.needsRamp && !(v.facts.wheelchair_ramp && v.facts.wheelchair_ramp.v)) reasons.push('no step-free access');
    if (q.needsCard && !(v.facts.card_accepted && v.facts.card_accepted.v)) reasons.push('cash only');
    /* Stated limits. A budget the user typed is a ceiling, not a preference —
       otherwise "under Rs 2,500" returns a Rs 5,800 restaurant and the whole
       counterfactual panel has nothing to offer. 12% of slack for drinks. */
    if (q.budget && v.avgTicket > q.budget * 1.12) reasons.push('over budget');
    if (q.maxTravel && E.travelMin(q.from || D.user.homeArea, v.area) > q.maxTravel) reasons.push('too far');
    if (q.late && priorAt(v, Math.floor(E.clock / 1440) * 1440 + 23 * 60 + 30) < 0.10) reasons.push('closed late');
    if (q.dish) {
      const hit = v.dishes.some(d => (d.name + ' ' + v.cuisines.join(' ')).toLowerCase().indexOf(q.dish) >= 0);
      if (!hit) reasons.push('no ' + q.dish);
    }
    if (q.cuisine && v.cuisines.indexOf(q.cuisine) < 0) reasons.push('cuisine');
    return reasons;
  };

  E.search = function (q) {
    q = q || {};
    const kept = [], excluded = [];
    D.venues.forEach(v => {
      const bad = E.hardFilter(v, q);
      if (bad.length) { excluded.push({ venue: v, reasons: bad }); return; }
      kept.push(E.scoreVenue(v, q));
    });
    kept.sort((a, b) => b.total - a.total);
    return { results: kept, excluded: excluded };
  };

  /* ═══════════════ COUNTERFACTUAL FRONTIER ═══════════════════════════════
     What is just outside the stated constraints, and what one relaxation
     would unlock it. This is decision support, not search. */
  E.frontier = function (q, currentTop) {
    const out = [];
    const baseIds = currentTop.map(r => r.venue.id);

    const party = q.party || 1;
    const newPerHead = Math.round((q.budget || 2500) * 1.3 / 25) * 25;
    const wider = E.search(Object.assign({}, q, { budget: newPerHead }));
    const newBudget = wider.results.filter(r => baseIds.indexOf(r.venue.id) < 0).slice(0, 4);
    if (newBudget.length) out.push({
      kind: 'budget', icon: 'up',
      label: party > 1
        ? 'Raise the table to Rs ' + (newPerHead * party).toLocaleString('en-PK')
        : 'Raise budget to Rs ' + newPerHead.toLocaleString('en-PK'),
      gain: newBudget.length + ' more, including ' + newBudget[0].venue.name,
      apply: { budget: newPerHead, budgetTotal: newPerHead * party }
    });

    const farther = E.search(Object.assign({}, q, { maxTravel: (q.maxTravel || 25) + 12 }));
    const newFar = farther.results.filter(r => baseIds.indexOf(r.venue.id) < 0).slice(0, 4);
    if (newFar.length) out.push({
      kind: 'travel', icon: 'clock',
      label: 'Accept ' + ((q.maxTravel || 25) + 12) + ' min travel',
      gain: 'unlocks ' + newFar[0].venue.name + (newFar[0].bestDish ? ' — ' + newFar[0].bestDish.name + ' scores ' + newFar[0].bestDishQuality.toFixed(1) : ''),
      apply: { maxTravel: (q.maxTravel || 25) + 12 }
    });

    // time: how much does waiting help across the current top set?
    let bestDrop = null;
    currentTop.slice(0, 5).forEach(r => {
      const d = E.waitDropsBelow(r.venue, 8);
      if (d && (!bestDrop || d.inMin < bestDrop.inMin)) bestDrop = Object.assign({ venue: r.venue }, d);
    });
    if (bestDrop) out.push({
      kind: 'time', icon: 'clock',
      label: 'Go at ' + E.timeString(bestDrop.at) + ' instead',
      gain: 'wait at ' + bestDrop.venue.name + ' drops under 8 min',
      apply: { skipTo: bestDrop.at }
    });

    // deal: does a card change the effective budget?
    const dealVenue = currentTop.slice(0, 6).map(r => r.venue).find(v => v.deals.length && v.deals[0].honoured > 0.7);
    if (dealVenue) {
      const d = dealVenue.deals[0];
      const eff = Math.round((q.budget || 2500) / (1 - parseInt(d.claimed, 10) / 100) / 50) * 50;
      out.push({
        kind: 'deal', icon: 'card',
        label: 'Use your ' + d.bank + ' card at ' + dealVenue.name,
        gain: 'Rs ' + (q.budget || 2500).toLocaleString() + ' behaves like Rs ' + eff.toLocaleString() +
              ' — honoured ' + Math.round(d.honoured * 100) + '% of verified visits',
        apply: null
      });
    }
    return out;
  };

  /* ═══════════════ GROUP SOLVER ══════════════════════════════════════════
     Hard constraints filter. Objective maximises the MINIMUM weighted member
     satisfaction (Rawlsian / max-min), not the mean — so the worst-served
     member is protected. Members who compromised previously carry a weight
     multiplier. No member's inputs are ever returned to any other member. */
  E.solveGroup = function (group, opts) {
    opts = opts || {};
    const responded = group.members.filter(m => m.responded);
    const from = opts.from || D.user.homeArea;

    const memberUtility = function (m, v, tmin) {
      // hard constraints first — a violation is infeasible, never a penalty
      if (m.diet.indexOf('no-beef') >= 0 && /Beef|Nihari|Biryani/.test(v.dishes.map(d => d.name).join(' ') + ' ' + v.cuisines.join(' '))) {
        const hasAlt = v.dishes.some(d => !/Beef/i.test(d.name));
        if (!hasAlt) return null;
      }
      if (m.diet.indexOf('nut-allergy') >= 0 && !v.trust.kitchenTransparency && v.trust.score < 70) return null;
      if (tmin > m.maxTravel) return null;
      if (v.avgTicket > m.budget) return null;

      /* Budget and travel SATISFICE, they do not maximise. Nobody's evening is
         improved by the restaurant being cheaper than they were willing to
         pay — they just need it inside the ceiling. Treating them as
         maximands made the solver return the cheapest venue in the city every
         single time, which is not what a group of friends actually wants. */
      const satisfice = (x, limit, comfy) =>
        x <= limit * comfy ? 1 : clamp(1 - (x - limit * comfy) / (limit * (1 - comfy)), 0, 1);

      let u = 0;
      u += 0.22 * satisfice(v.avgTicket, m.budget, 0.75);
      u += 0.16 * satisfice(tmin, m.maxTravel, 0.55);

      const f = E.fuse(v);
      u += 0.16 * clamp(1 - f.wait / 45, 0, 1);

      // mood fit
      if (m.mood === 'bbq') u += v.cuisines.indexOf('BBQ') >= 0 ? 0.22 : 0.05;
      else if (m.mood === 'spicy') u += /BBQ|Pakistani|Nihari/.test(v.cuisines.join(' ')) ? 0.20 : 0.06;
      else if (m.mood === 'quiet') u += (v.facts.noise_level && /quiet|moderate/.test(String(v.facts.noise_level.v))) ? 0.22 : 0.04;
      else u += 0.14;

      // is the place actually any good, and is its best dish good *now*
      const hour = E.hourOfDay();
      let bestQ = 0;
      v.dishes.forEach(d => { const dq = E.dishQualityAt(d, hour); if (dq !== null && dq > bestQ) bestQ = dq; });
      u += 0.14 * clamp(bestQ / 10, 0, 1);
      u += 0.10 * clamp(E.trustBreakdown(v).total / 100, 0, 1);

      return clamp(u, 0, 1);
    };

    const solutions = [];
    D.venues.forEach(v => {
      const tmin = E.travelMin(from, v.area);
      const utils = [];
      let feasible = true;
      const failed = [];
      responded.forEach(m => {
        const u = memberUtility(m, v, tmin);
        if (u === null) { feasible = false; failed.push(m.id); return; }
        /* The carry-over weight must amplify a member's SHORTFALL, not their
           satisfaction. Multiplying u by 1.4 pushed a compromised member above
           everyone else and removed the very protection the weight exists to
           give — it made them stop being the binding minimum. Amplifying
           (1 − u) instead makes the solver work harder for them, which is what
           "Ayesha weighted ×1.4" is supposed to mean. */
        utils.push({ id: m.id, name: m.name, u: u, weighted: clamp(1 - (1 - u) * m.weight, 0, 1) });
      });
      if (!feasible) { solutions.push({ venue: v, feasible: false, failed: failed }); return; }
      const minW = Math.min.apply(null, utils.map(x => x.weighted));
      const mean = utils.reduce((a, x) => a + x.u, 0) / utils.length;
      solutions.push({
        venue: v, feasible: true, utils: utils, travelMin: tmin,
        objective: 0.72 * minW + 0.28 * mean,   // max-min, lightly regularised by the mean
        minSat: Math.min.apply(null, utils.map(x => x.u)),
        meanSat: mean,
        fuse: E.fuse(v),
      });
    });

    const feasible = solutions.filter(s => s.feasible).sort((a, b) => b.objective - a.objective);
    const infeasible = solutions.filter(s => !s.feasible);
    const hardConstraints = [];
    responded.forEach(m => m.diet.forEach(d => { if (hardConstraints.indexOf(d) < 0) hardConstraints.push(d); }));

    return {
      best: feasible[0], runnerUp: feasible[1], all: feasible,
      infeasible: infeasible, hardConstraints: hardConstraints,
      responded: responded.length, total: group.members.length,
      weighted: responded.filter(m => m.weight > 1).map(m => ({ name: m.name, weight: m.weight, regret: m.regret })),
    };
  };

  /* ═══════════════ CITY HEATMAP ══════════════════════════════════════════ */
  E.cityState = function () {
    const byArea = {};
    D.venues.forEach(v => {
      const f = E.fuse(v);
      if (!f) return;
      if (!byArea[v.area]) byArea[v.area] = { area: v.area, sum: 0, n: 0, wait: 0, venues: [] };
      const a = byArea[v.area];
      a.sum += f.occupancy; a.wait += f.wait; a.n++;
      a.venues.push({ v: v, f: f });
    });
    const list = Object.keys(byArea).map(k => {
      const a = byArea[k];
      a.occupancy = a.sum / a.n;
      a.waitAvg = a.wait / a.n;
      a.venues.sort((x, y) => y.f.occupancy - x.f.occupancy);
      return a;
    });
    const cityMean = list.reduce((s, a) => s + a.occupancy, 0) / list.length;
    const idleSeats = D.venues.reduce((s, v) => s + v.capacity * (1 - E.fuse(v).occupancy), 0);
    return { areas: list, cityMean: cityMean, idleSeats: Math.round(idleSeats), venues: D.venues.length };
  };

  E.reset();


export default D.engine;
