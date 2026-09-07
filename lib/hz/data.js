/* ═══════════════════════════════════════════════════════════════════════════
   HAAZIR — seed data
   ---------------------------------------------------------------------------
   Venue identity (name, area, cuisine, price band, signature dishes) is drawn
   from public listings of real Karachi restaurants. Occupancy, wait times,
   confidence and dish-quality curves are SIMULATED by assets/js/engine.js —
   they are produced by a real estimator running on synthetic sensor input,
   not by Math.random() sprinkled on the view. Every screen that shows a
   simulated signal says so.

   The single regulatory record marked `verified:true` is a real, published
   Sindh Food Authority enforcement action and carries its source URL.

   Card issuers are FICTIONAL on purpose. Venue identity is real public
   information, but a deal-honour rate is an invented negative claim, and
   attaching one to a named bank on a public URL is not something a demo should
   do. Same reasoning drives the on-screen "seeded demo values" labels.
   ═══════════════════════════════════════════════════════════════════════════ */

const HZ = {};

HZ.meta = {
  city: 'Karachi',
  // demo clock — the app runs on this so the story is reproducible on stage
  demoTime: { day: 5 /* 0=Sun .. 5=Fri */, hour: 20, minute: 12 },
  iftarToday: '18:41',
  sources: {
    sfa: 'https://www.facebook.com/SindhFood/posts/1434124435412829/',
    sbp: 'https://www.sbp.org.pk/',
  }
};

/* ── Areas: rough coordinates, used by the stylised city map ─────────────── */
HZ.areas = {
  'Do Darya':          { ur: 'دو دریا',            x: 0.72, y: 0.86 },
  'Clifton':           { ur: 'کلفٹن',              x: 0.40, y: 0.74 },
  'Boat Basin':        { ur: 'بوٹ بیسن',           x: 0.42, y: 0.68 },
  'Zamzama':           { ur: 'زمزمہ',              x: 0.36, y: 0.70 },
  'DHA Phase 6':       { ur: 'ڈی ایچ اے فیز ۶',    x: 0.52, y: 0.74 },
  'DHA Phase 8':       { ur: 'ڈی ایچ اے فیز ۸',    x: 0.63, y: 0.80 },
  'DHA Phase 2':       { ur: 'ڈی ایچ اے فیز ۲',    x: 0.46, y: 0.72 },
  'Tariq Road':        { ur: 'طارق روڈ',           x: 0.46, y: 0.52 },
  'Bahadurabad':       { ur: 'بہادرآباد',          x: 0.49, y: 0.46 },
  'PECHS':             { ur: 'پی ای سی ایچ ایس',   x: 0.44, y: 0.48 },
  'Burns Road':        { ur: 'برنس روڈ',           x: 0.30, y: 0.36 },
  'Saddar':            { ur: 'صدر',                x: 0.28, y: 0.42 },
  'Shahrah-e-Faisal':  { ur: 'شاہراہِ فیصل',       x: 0.58, y: 0.50 },
  'Gulshan-e-Iqbal':   { ur: 'گلشنِ اقبال',        x: 0.66, y: 0.34 },
  'Gulistan-e-Johar':  { ur: 'گلستانِ جوہر',       x: 0.78, y: 0.30 },
  'Federal B Area':    { ur: 'فیڈرل بی ایریا',     x: 0.52, y: 0.24 },
  'North Nazimabad':   { ur: 'نارتھ ناظم آباد',    x: 0.36, y: 0.18 },
  'Nazimabad':         { ur: 'ناظم آباد',          x: 0.34, y: 0.28 },
};

/* ── Demand archetypes → hourly occupancy priors ─────────────────────────
   Each is a 24-length curve, 0..1, of expected occupancy on an average day.
   The estimator perturbs these per-weekday; it never reads them as truth. */
HZ.priors = {
  nihari_morning: [.10,.06,.04,.03,.06,.22,.62,.88,.94,.86,.66,.48,.40,.36,.30,.28,.32,.38,.44,.50,.52,.46,.32,.18],
  bbq_night:      [.30,.16,.07,.03,.02,.02,.03,.05,.08,.10,.13,.20,.34,.40,.33,.28,.32,.44,.58,.74,.88,.94,.86,.60],
  seafood_view:   [.18,.09,.04,.02,.02,.02,.03,.04,.06,.08,.11,.18,.30,.34,.28,.24,.30,.46,.66,.84,.92,.90,.74,.42],
  biryani_lunch:  [.08,.04,.03,.02,.03,.06,.14,.24,.30,.34,.42,.62,.88,.92,.74,.52,.44,.46,.54,.62,.66,.54,.32,.16],
  cafe_day:       [.12,.06,.03,.02,.02,.03,.06,.14,.28,.44,.58,.66,.70,.72,.68,.66,.70,.76,.80,.78,.70,.58,.38,.22],
  bakery_evening: [.10,.05,.03,.02,.02,.03,.08,.18,.28,.34,.38,.42,.46,.48,.50,.56,.66,.78,.86,.88,.80,.66,.44,.22],
  street_late:    [.46,.30,.16,.06,.03,.02,.03,.05,.08,.12,.16,.22,.30,.34,.30,.28,.34,.44,.56,.70,.82,.90,.92,.72],
  fastfood_all:   [.34,.20,.10,.04,.03,.03,.05,.10,.18,.26,.36,.48,.62,.64,.54,.48,.52,.62,.74,.82,.86,.84,.72,.52],
};

/* Weekday multipliers — Fri/Sat are Karachi's peak nights, Mon the trough */
HZ.dayFactor = [1.02, 0.78, 0.83, 0.87, 0.94, 1.12, 1.16]; // Sun..Sat

/* ── Dish quality windows ────────────────────────────────────────────────
   peak: [startHour, endHour] where the dish is at `hi`; outside it decays
   toward `lo` at `decay` points/hour. This is the Dish-Time Graph's
   parameterisation — engine.js fits the 24h curve from it. */

/* ── Venues ─────────────────────────────────────────────────────────────── */
HZ.venues = [
  {
    id: 'kolachi', name: 'Kolachi', nameUr: 'کولاچی', area: 'Do Darya',
    cuisines: ['Pakistani', 'Seafood', 'BBQ'], price: 4, avgTicket: 3600, capacity: 420,
    prior: 'seafood_view', rating: 4.5, reviews: 1323, verifiedRating: 4.3,
    blurb: 'Open-air creekside seating on the Arabian Sea. The city\'s default answer to "somewhere nice".',
    dishes: [
      { id: 'prawn-karahi', name: 'Prawn Karahi', nameUr: 'جھینگا کڑاہی', price: 2450, peak: [19, 23], hi: 9.2, lo: 6.8, decay: .5, n: 1840, sellout: null },
      { id: 'malai-boti',   name: 'Malai Boti',   nameUr: 'ملائی بوٹی',   price: 1250, peak: [20, 23], hi: 8.9, lo: 6.4, decay: .6, n: 2210, sellout: null },
      { id: 'seafood-plat', name: 'Seafood Platter', nameUr: 'سی فوڈ پلیٹر', price: 4200, peak: [19, 22], hi: 8.6, lo: 6.0, decay: .7, n: 940, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .94, n: 22 },
      family_section:  { v: true,  c: .98, n: 41 },
      outdoor_seating: { v: true,  c: .97, n: 38 },
      parking:         { v: 'valet', c: .88, n: 26, note: 'Lot fills ~20:15 Fri/Sat · valet queue 10–14 min' },
      generator_backup:{ v: true,  c: .91, n: 17 },
      high_chairs:     { v: true,  c: .74, n: 9 },
      wheelchair_ramp: { v: true,  c: .68, n: 6 },
      card_accepted:   { v: true,  c: .96, n: 31, reliability: .93 },
      noise_level:     { v: 'lively', c: .8, n: 12 },
      iftar_service:   { v: true,  c: .9, n: 8, seating_from: '18:05' },
    },
    deals: [{ bank: 'Nishan Bank', claimed: '20%', honoured: .84, n: 25 }],
    trust: { score: 82, reviewFlagRate: .07, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'javed-nihari', name: 'Javed Nihari', nameUr: 'جاوید نہاری', area: 'Federal B Area',
    cuisines: ['Nihari', 'Pakistani'], price: 1, avgTicket: 420, capacity: 90,
    prior: 'nihari_morning', rating: 4.6, reviews: 3104, verifiedRating: 4.5,
    blurb: 'Bone-marrow nihari, 7am to 11pm. The morning pot and the evening pot are not the same food.',
    dishes: [
      { id: 'nihari', name: 'Special Nihari', nameUr: 'اسپیشل نہاری', price: 420, peak: [7, 10], hi: 9.4, lo: 5.8, decay: .42, n: 2100, sellout: null },
      { id: 'maghaz', name: 'Maghaz Masala', nameUr: 'مغز مسالہ', price: 560, peak: [7, 11], hi: 8.8, lo: 5.4, decay: .5, n: 640, sellout: '13:20' },
      { id: 'khameeri', name: 'Khameeri Roti', nameUr: 'خمیری روٹی', price: 60, peak: [7, 22], hi: 8.4, lo: 7.6, decay: .2, n: 3300, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .86, n: 14 },
      family_section:  { v: true,  c: .82, n: 19 },
      outdoor_seating: { v: false, c: .9,  n: 11 },
      parking:         { v: 'street', c: .7, n: 12, note: 'Street only — tight after 8pm' },
      generator_backup:{ v: true,  c: .77, n: 8 },
      card_accepted:   { v: false, c: .88, n: 21, reliability: .0, note: 'Cash only. Reported as "machine down" on 6 of 8 attempts before Jan.' },
      high_chairs:     { v: false, c: .6,  n: 4 },
      noise_level:     { v: 'loud', c: .84, n: 15 },
      iftar_service:   { v: true,  c: .82, n: 6, seating_from: '18:20' },
    },
    deals: [],
    trust: { score: 88, reviewFlagRate: .04, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'ghaffar-kabab', name: 'Shaikh Abdul Ghaffar Kabab House', nameUr: 'شیخ عبدالغفار کباب ہاؤس', area: 'Burns Road',
    cuisines: ['BBQ', 'Pakistani'], price: 2, avgTicket: 900, capacity: 70,
    prior: 'street_late', rating: 4.1, reviews: 124, verifiedRating: 4.4,
    blurb: 'Dhaga kabab and bihari boti off a Burns Road charcoal pit. Small, loud, correct.',
    dishes: [
      { id: 'dhaga-kabab', name: 'Dhaga Kabab', nameUr: 'دھاگہ کباب', price: 480, peak: [20, 24], hi: 9.5, lo: 7.0, decay: .55, n: 780, sellout: '00:40' },
      { id: 'bihari-boti', name: 'Bihari Boti', nameUr: 'بہاری بوٹی', price: 620, peak: [20, 24], hi: 9.1, lo: 6.6, decay: .6, n: 690, sellout: null },
      { id: 'paratha', name: 'Roghni Paratha', nameUr: 'روغنی پراٹھا', price: 90, peak: [19, 24], hi: 8.5, lo: 7.2, decay: .3, n: 1100, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .8,  n: 9 },
      family_section:  { v: true,  c: .72, n: 7, note: 'One partitioned row upstairs' },
      outdoor_seating: { v: true,  c: .93, n: 16 },
      parking:         { v: 'street', c: .62, n: 10, note: 'Effectively none Fri/Sat after 21:00' },
      generator_backup:{ v: false, c: .7,  n: 5 },
      card_accepted:   { v: false, c: .92, n: 18, reliability: .0 },
      wheelchair_ramp: { v: false, c: .81, n: 6 },
      noise_level:     { v: 'loud', c: .95, n: 20 },
    },
    deals: [],
    trust: { score: 74, reviewFlagRate: .05, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'bundu-khan', name: 'Al-Haaj Bundu Khan', nameUr: 'الحاج بندو خان', area: 'Tariq Road',
    cuisines: ['BBQ', 'Pakistani'], price: 2, avgTicket: 1400, capacity: 180,
    prior: 'bbq_night', rating: 4.2, reviews: 2870, verifiedRating: 4.0,
    blurb: 'One of the oldest kabab houses in the city. Bihari boti and mutton kabab are the reason.',
    dishes: [
      { id: 'mutton-kabab', name: 'Mutton Kabab', nameUr: 'مٹن کباب', price: 780, peak: [20, 23], hi: 8.8, lo: 6.2, decay: .55, n: 1520, sellout: null },
      { id: 'bihari-boti-bk', name: 'Bihari Boti', nameUr: 'بہاری بوٹی', price: 690, peak: [20, 23], hi: 8.6, lo: 6.4, decay: .5, n: 1330, sellout: null },
      { id: 'chicken-tikka', name: 'Chicken Tikka', nameUr: 'چکن تکہ', price: 520, peak: [19, 23], hi: 7.9, lo: 6.6, decay: .35, n: 1810, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .93, n: 24 },
      family_section:  { v: true,  c: .96, n: 33 },
      outdoor_seating: { v: false, c: .88, n: 14 },
      parking:         { v: 'lot', c: .8, n: 19, note: '~30 cars · fills 20:40 on weekends' },
      generator_backup:{ v: true,  c: .9,  n: 15 },
      high_chairs:     { v: true,  c: .8,  n: 11 },
      wheelchair_ramp: { v: true,  c: .7,  n: 5 },
      card_accepted:   { v: true,  c: .9,  n: 27, reliability: .62, note: 'Machine reported down on 7 of 19 verified visits' },
      noise_level:     { v: 'moderate', c: .78, n: 13 },
      iftar_service:   { v: true,  c: .88, n: 9, seating_from: '18:10' },
    },
    deals: [{ bank: 'Sadaf Bank', claimed: '30%', honoured: .21, n: 19 }],
    trust: { score: 71, reviewFlagRate: .14, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'kiado', name: 'KIADO', nameUr: 'کیادو', area: 'DHA Phase 8',
    cuisines: ['Japanese', 'Asian'], price: 4, avgTicket: 4100, capacity: 110,
    prior: 'cafe_day', rating: 4.4, reviews: 612, verifiedRating: 3.2,
    blurb: 'Sushi and robata in a Phase 8 residential block.',
    dishes: [
      { id: 'ramen', name: 'Tonkotsu-style Ramen', nameUr: 'رامن', price: 1850, peak: [19, 22], hi: 7.8, lo: 6.2, decay: .4, n: 210, sellout: null },
      { id: 'sushi-set', name: 'Sushi Set', nameUr: 'سوشی سیٹ', price: 3200, peak: [19, 22], hi: 7.4, lo: 5.6, decay: .5, n: 180, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .74, n: 5 },
      family_section:  { v: true,  c: .8,  n: 9 },
      parking:         { v: 'street', c: .66, n: 7 },
      card_accepted:   { v: true,  c: .95, n: 14, reliability: .9 },
      generator_backup:{ v: true,  c: .85, n: 6 },
      noise_level:     { v: 'quiet', c: .7, n: 5 },
    },
    deals: [],
    trust: {
      score: 22, reviewFlagRate: .26, kitchenTransparency: false,
      regulatory: [{
        verified: true,
        authority: 'Sindh Food Authority',
        type: 'sealed',
        date: '2026-07-31',
        reason: 'Expired meat and expired sauces, mayonnaise, garlic paste and fruit purée recovered. 15+ violations. No valid SFA licence; no medical fitness records for food handlers; no meat traceability or halal certification produced.',
        fine: null,
        source: 'https://www.facebook.com/SindhFood/posts/1434124435412829/',
        sourceLabel: 'Sindh Food Authority · official release · 31 Jul 2026'
      }]
    }
  },
  {
    id: 'bbq-tonight', name: 'BBQ Tonight', nameUr: 'بار بی کیو ٹونائٹ', area: 'Clifton',
    cuisines: ['BBQ', 'Pakistani'], price: 3, avgTicket: 2400, capacity: 600,
    prior: 'bbq_night', rating: 4.2, reviews: 1148, verifiedRating: 4.1,
    blurb: 'Five floors of grill. The safe choice for a large, mixed, indecisive group.',
    dishes: [
      { id: 'beef-boti', name: 'Beef Boti', nameUr: 'بیف بوٹی', price: 890, peak: [20, 24], hi: 8.4, lo: 6.6, decay: .45, n: 1420, sellout: null },
      { id: 'mutton-chops', name: 'Mutton Chops', nameUr: 'مٹن چاپس', price: 1350, peak: [20, 23], hi: 8.7, lo: 6.4, decay: .5, n: 990, sellout: null },
      { id: 'kata-kat', name: 'Kata Kat', nameUr: 'کٹا کٹ', price: 1100, peak: [21, 24], hi: 8.2, lo: 6.0, decay: .55, n: 760, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .97, n: 44 },
      family_section:  { v: true,  c: .99, n: 61 },
      outdoor_seating: { v: true,  c: .9,  n: 28 },
      parking:         { v: 'valet', c: .92, n: 35, note: 'Large lot · valet 6–9 min at peak' },
      generator_backup:{ v: true,  c: .96, n: 24 },
      high_chairs:     { v: true,  c: .9,  n: 18 },
      wheelchair_ramp: { v: true,  c: .86, n: 12 },
      card_accepted:   { v: true,  c: .97, n: 40, reliability: .95 },
      noise_level:     { v: 'loud', c: .88, n: 22 },
      iftar_service:   { v: true,  c: .95, n: 16, seating_from: '17:55' },
    },
    deals: [{ bank: 'Meridian Bank', claimed: '15%', honoured: .78, n: 23 }],
    trust: { score: 79, reviewFlagRate: .09, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'okra', name: 'Okra', nameUr: 'اوکرا', area: 'Zamzama',
    cuisines: ['Mediterranean', 'Continental'], price: 5, avgTicket: 5800, capacity: 80,
    prior: 'cafe_day', rating: 4.8, reviews: 431, verifiedRating: 4.7,
    blurb: 'Small menu, changed often. The most reliably good plate in the city at this price.',
    dishes: [
      { id: 'lamb-shank', name: 'Braised Lamb Shank', nameUr: 'لیمب شینک', price: 4200, peak: [19, 22], hi: 9.3, lo: 7.4, decay: .4, n: 320, sellout: '22:10' },
      { id: 'burrata', name: 'Burrata & Heirloom', nameUr: 'بوراٹا', price: 2600, peak: [12, 22], hi: 8.9, lo: 7.8, decay: .25, n: 280, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .8,  n: 7 },
      family_section:  { v: true,  c: .84, n: 12 },
      parking:         { v: 'valet', c: .82, n: 14 },
      card_accepted:   { v: true,  c: .98, n: 29, reliability: .97 },
      generator_backup:{ v: true,  c: .93, n: 11 },
      wheelchair_ramp: { v: false, c: .74, n: 6 },
      noise_level:     { v: 'quiet', c: .86, n: 14 },
    },
    deals: [],
    trust: { score: 91, reviewFlagRate: .03, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'johnny-jugnu', name: 'Johnny & Jugnu', nameUr: 'جونی اینڈ جگنو', area: 'DHA Phase 6',
    cuisines: ['Burgers', 'Fast Food'], price: 2, avgTicket: 1370, capacity: 120,
    prior: 'fastfood_all', rating: 4.6, reviews: 2240, verifiedRating: 4.5,
    blurb: 'Smashed patties and a queue that starts at 8. Fast when it is not.',
    dishes: [
      { id: 'og-burger', name: 'The OG Burger', nameUr: 'او جی برگر', price: 890, peak: [12, 24], hi: 8.8, lo: 7.6, decay: .3, n: 3100, sellout: null },
      { id: 'loaded-fries', name: 'Loaded Fries', nameUr: 'لوڈڈ فرائز', price: 620, peak: [18, 24], hi: 8.1, lo: 6.8, decay: .35, n: 1900, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .78, n: 8 },
      family_section:  { v: true,  c: .88, n: 17 },
      outdoor_seating: { v: true,  c: .92, n: 21 },
      parking:         { v: 'street', c: .6, n: 13, note: 'Chaotic 20:00–23:00' },
      card_accepted:   { v: true,  c: .96, n: 32, reliability: .94 },
      generator_backup:{ v: true,  c: .9,  n: 12 },
      high_chairs:     { v: true,  c: .7,  n: 6 },
      noise_level:     { v: 'lively', c: .84, n: 16 },
    },
    deals: [{ bank: 'Nishan Bank', claimed: '10%', honoured: .91, n: 22 }],
    trust: { score: 86, reviewFlagRate: .06, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'student-biryani', name: 'Student Biryani', nameUr: 'اسٹوڈنٹ بریانی', area: 'Saddar',
    cuisines: ['Biryani', 'Pakistani'], price: 1, avgTicket: 480, capacity: 140,
    prior: 'biryani_lunch', rating: 4.0, reviews: 4120, verifiedRating: 3.8,
    blurb: 'The original Saddar branch. Lunch service is a different restaurant to dinner service.',
    dishes: [
      { id: 'beef-biryani', name: 'Beef Biryani', nameUr: 'بیف بریانی', price: 480, peak: [12, 15], hi: 8.9, lo: 6.1, decay: .48, n: 2600, sellout: '21:40' },
      { id: 'chicken-biryani', name: 'Chicken Biryani', nameUr: 'چکن بریانی', price: 420, peak: [12, 15], hi: 8.2, lo: 6.0, decay: .45, n: 3200, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .88, n: 16 },
      family_section:  { v: true,  c: .86, n: 18 },
      parking:         { v: 'street', c: .55, n: 9, note: 'Saddar — assume none' },
      card_accepted:   { v: true,  c: .8,  n: 15, reliability: .55, note: 'Machine down on 6 of 15 verified visits' },
      generator_backup:{ v: true,  c: .74, n: 7 },
      noise_level:     { v: 'loud', c: .9,  n: 17 },
      iftar_service:   { v: true,  c: .8,  n: 5, seating_from: '18:15' },
    },
    deals: [],
    trust: { score: 76, reviewFlagRate: .11, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'kababjees', name: 'Kababjees', nameUr: 'کبابجیز', area: 'Shahrah-e-Faisal',
    cuisines: ['BBQ', 'Pakistani', 'Continental'], price: 3, avgTicket: 2200, capacity: 320,
    prior: 'bbq_night', rating: 4.3, reviews: 1860, verifiedRating: 4.2,
    blurb: 'Dependable buffet-and-grill. The answer when the group cannot agree on a cuisine.',
    dishes: [
      { id: 'malai-tikka', name: 'Malai Tikka', nameUr: 'ملائی تکہ', price: 760, peak: [20, 23], hi: 8.5, lo: 6.8, decay: .4, n: 1240, sellout: null },
      { id: 'buffet', name: 'Dinner Buffet', nameUr: 'ڈنر بوفے', price: 2600, peak: [19, 22], hi: 8.0, lo: 6.2, decay: .5, n: 880, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .95, n: 27 },
      family_section:  { v: true,  c: .97, n: 39 },
      parking:         { v: 'valet', c: .89, n: 24 },
      generator_backup:{ v: true,  c: .94, n: 19 },
      high_chairs:     { v: true,  c: .86, n: 14 },
      wheelchair_ramp: { v: true,  c: .8,  n: 9 },
      card_accepted:   { v: true,  c: .96, n: 30, reliability: .92 },
      noise_level:     { v: 'moderate', c: .8, n: 15 },
      iftar_service:   { v: true,  c: .93, n: 13, seating_from: '18:00' },
    },
    deals: [{ bank: 'Anwar Bank', claimed: '25%', honoured: .64, n: 21 }],
    trust: { score: 80, reviewFlagRate: .08, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'sajjad', name: 'Sajjad Restaurant', nameUr: 'سجاد ریسٹورنٹ', area: 'Gulshan-e-Iqbal',
    cuisines: ['Pakistani', 'BBQ'], price: 2, avgTicket: 1500, capacity: 260,
    prior: 'bbq_night', rating: 4.1, reviews: 1520, verifiedRating: 4.0,
    blurb: 'Large family halls, fast turnaround, and the most forgiving Iftar seating in Gulshan.',
    dishes: [
      { id: 'chicken-karahi', name: 'Chicken Karahi', nameUr: 'چکن کڑاہی', price: 1350, peak: [19, 23], hi: 8.3, lo: 6.5, decay: .42, n: 1180, sellout: null },
      { id: 'mutton-karahi', name: 'Mutton Karahi', nameUr: 'مٹن کڑاہی', price: 2400, peak: [19, 23], hi: 8.6, lo: 6.4, decay: .45, n: 820, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .96, n: 29 },
      family_section:  { v: true,  c: .98, n: 42 },
      parking:         { v: 'lot', c: .84, n: 20, note: '~50 cars, rarely full' },
      generator_backup:{ v: true,  c: .92, n: 16 },
      high_chairs:     { v: true,  c: .82, n: 12 },
      wheelchair_ramp: { v: true,  c: .76, n: 8 },
      card_accepted:   { v: true,  c: .88, n: 22, reliability: .81 },
      noise_level:     { v: 'moderate', c: .76, n: 12 },
      iftar_service:   { v: true,  c: .97, n: 21, seating_from: '17:50', preOrder: true },
    },
    deals: [{ bank: 'Sadaf Bank', claimed: '20%', honoured: .72, n: 18 }],
    trust: { score: 83, reviewFlagRate: .07, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'karachi-broast', name: 'Karachi Broast', nameUr: 'کراچی بروسٹ', area: 'Boat Basin',
    cuisines: ['Fried Chicken', 'Fast Food'], price: 1, avgTicket: 700, capacity: 60,
    prior: 'street_late', rating: 4.0, reviews: 980, verifiedRating: 3.9,
    blurb: 'Boat Basin institution. Nothing here is good before 9pm because nothing here is made before 9pm.',
    dishes: [
      { id: 'broast-half', name: 'Half Broast', nameUr: 'ہاف بروسٹ', price: 640, peak: [21, 26], hi: 8.7, lo: 6.2, decay: .6, n: 1400, sellout: null },
      { id: 'bun-kabab', name: 'Bun Kabab', nameUr: 'بن کباب', price: 180, peak: [21, 26], hi: 8.2, lo: 6.4, decay: .5, n: 2200, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .8,  n: 7 },
      family_section:  { v: false, c: .84, n: 9, note: 'Takeaway / car-side only' },
      outdoor_seating: { v: true,  c: .95, n: 19 },
      parking:         { v: 'street', c: .58, n: 11, note: 'Double-parked after 22:00' },
      card_accepted:   { v: false, c: .9,  n: 16, reliability: .0 },
      generator_backup:{ v: true,  c: .72, n: 6 },
      noise_level:     { v: 'loud', c: .92, n: 18 },
    },
    deals: [],
    trust: { score: 72, reviewFlagRate: .1, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'qasr-nakheel', name: 'Qasr-Al-Nakheel', nameUr: 'قصر النخیل', area: 'Boat Basin',
    cuisines: ['Arabian', 'Mandi'], price: 2, avgTicket: 1600, capacity: 110,
    prior: 'street_late', rating: 4.2, reviews: 740, verifiedRating: 4.1,
    blurb: 'Mandi and mutton haneeth, floor seating, open very late.',
    dishes: [
      { id: 'mutton-mandi', name: 'Mutton Mandi', nameUr: 'مٹن مندی', price: 2100, peak: [20, 25], hi: 8.9, lo: 6.6, decay: .5, n: 620, sellout: '01:15' },
      { id: 'chicken-mandi', name: 'Chicken Mandi', nameUr: 'چکن مندی', price: 1250, peak: [20, 25], hi: 8.4, lo: 6.8, decay: .4, n: 810, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .9,  n: 14 },
      family_section:  { v: true,  c: .92, n: 18 },
      outdoor_seating: { v: true,  c: .88, n: 12 },
      parking:         { v: 'street', c: .6, n: 9 },
      card_accepted:   { v: true,  c: .84, n: 13, reliability: .7 },
      generator_backup:{ v: true,  c: .8,  n: 8 },
      noise_level:     { v: 'moderate', c: .74, n: 10 },
      iftar_service:   { v: true,  c: .86, n: 7, seating_from: '18:10' },
    },
    deals: [],
    trust: { score: 78, reviewFlagRate: .08, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'zahid-nihari', name: 'Zahid Nihari', nameUr: 'زاہد نہاری', area: 'Bahadurabad',
    cuisines: ['Nihari', 'Pakistani'], price: 1, avgTicket: 460, capacity: 80,
    prior: 'nihari_morning', rating: 4.4, reviews: 2210, verifiedRating: 4.3,
    blurb: 'The pot turns over again around 8pm — the one nihari in the city that is good at night.',
    dishes: [
      { id: 'nihari-z', name: 'Nihari', nameUr: 'نہاری', price: 460, peak: [7, 10], hi: 9.0, lo: 6.0, decay: .4, n: 1780, sellout: null, secondPeak: [20, 22], secondHi: 8.4 },
      { id: 'paye', name: 'Paye', nameUr: 'پائے', price: 520, peak: [7, 11], hi: 8.6, lo: 5.6, decay: .5, n: 720, sellout: '12:40' },
    ],
    facts: {
      prayer_area:     { v: true,  c: .84, n: 12 },
      family_section:  { v: true,  c: .88, n: 16 },
      parking:         { v: 'street', c: .66, n: 10 },
      card_accepted:   { v: true,  c: .78, n: 12, reliability: .48, note: 'Machine down on 6 of 12 verified visits' },
      generator_backup:{ v: true,  c: .8,  n: 7 },
      noise_level:     { v: 'loud', c: .86, n: 14 },
      iftar_service:   { v: true,  c: .84, n: 6, seating_from: '18:15' },
    },
    deals: [],
    trust: { score: 85, reviewFlagRate: .05, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'kaybees', name: 'Kaybees', nameUr: 'کے بیز', area: 'Bahadurabad',
    cuisines: ['Desserts', 'Fast Food'], price: 1, avgTicket: 520, capacity: 90,
    prior: 'bakery_evening', rating: 4.3, reviews: 1640, verifiedRating: 4.2,
    blurb: 'Ice cream and burgers on the same counter. Nobody has ever questioned it.',
    dishes: [
      { id: 'kb-shake', name: 'Fresh Fruit Shake', nameUr: 'فریش فروٹ شیک', price: 380, peak: [17, 24], hi: 8.6, lo: 7.2, decay: .3, n: 1500, sellout: null },
      { id: 'kb-burger', name: 'Chicken Burger', nameUr: 'چکن برگر', price: 450, peak: [18, 24], hi: 7.8, lo: 6.8, decay: .3, n: 1100, sellout: null },
    ],
    facts: {
      family_section:  { v: true,  c: .9,  n: 20 },
      outdoor_seating: { v: true,  c: .86, n: 15 },
      parking:         { v: 'street', c: .62, n: 11 },
      card_accepted:   { v: true,  c: .9,  n: 19, reliability: .86 },
      generator_backup:{ v: true,  c: .84, n: 9 },
      high_chairs:     { v: true,  c: .68, n: 5 },
      noise_level:     { v: 'lively', c: .8, n: 12 },
    },
    deals: [],
    trust: { score: 84, reviewFlagRate: .06, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'cafe-flo', name: 'Café Flo', nameUr: 'کیفے فلو', area: 'Clifton',
    cuisines: ['French', 'Continental'], price: 5, avgTicket: 5200, capacity: 70,
    prior: 'cafe_day', rating: 4.5, reviews: 389, verifiedRating: 4.4,
    blurb: 'Long-running French kitchen. Quiet enough to actually hold a conversation.',
    dishes: [
      { id: 'duck', name: 'Duck Confit', nameUr: 'ڈک کونفی', price: 3900, peak: [19, 22], hi: 8.8, lo: 7.2, decay: .35, n: 240, sellout: null },
      { id: 'creme-brulee', name: 'Crème Brûlée', nameUr: 'کریم بروله', price: 1200, peak: [12, 23], hi: 8.9, lo: 8.2, decay: .2, n: 310, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .76, n: 6 },
      family_section:  { v: true,  c: .8,  n: 10 },
      parking:         { v: 'valet', c: .84, n: 12 },
      card_accepted:   { v: true,  c: .97, n: 24, reliability: .96 },
      generator_backup:{ v: true,  c: .92, n: 10 },
      wheelchair_ramp: { v: true,  c: .72, n: 5 },
      noise_level:     { v: 'quiet', c: .9,  n: 13 },
    },
    deals: [{ bank: 'Kiran Bank', claimed: '20%', honoured: .88, n: 16 }],
    trust: { score: 89, reviewFlagRate: .03, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'usmania', name: 'Usmania', nameUr: 'عثمانیہ', area: 'North Nazimabad',
    cuisines: ['Pakistani', 'BBQ'], price: 2, avgTicket: 1300, capacity: 220,
    prior: 'bbq_night', rating: 4.1, reviews: 1290, verifiedRating: 4.0,
    blurb: 'North Nazimabad\'s default family dinner. Enormous halls, generous portions.',
    dishes: [
      { id: 'us-karahi', name: 'White Karahi', nameUr: 'وائٹ کڑاہی', price: 1650, peak: [20, 23], hi: 8.5, lo: 6.4, decay: .45, n: 960, sellout: null },
      { id: 'us-handi', name: 'Chicken Handi', nameUr: 'چکن ہانڈی', price: 1180, peak: [19, 23], hi: 8.0, lo: 6.6, decay: .4, n: 820, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .94, n: 22 },
      family_section:  { v: true,  c: .97, n: 34 },
      parking:         { v: 'lot', c: .86, n: 18 },
      generator_backup:{ v: true,  c: .9,  n: 14 },
      high_chairs:     { v: true,  c: .78, n: 10 },
      wheelchair_ramp: { v: true,  c: .74, n: 7 },
      card_accepted:   { v: true,  c: .86, n: 20, reliability: .79 },
      noise_level:     { v: 'moderate', c: .78, n: 11 },
      iftar_service:   { v: true,  c: .92, n: 12, seating_from: '17:55', preOrder: true },
    },
    deals: [],
    trust: { score: 81, reviewFlagRate: .07, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'ghousia', name: 'Ghousia Kabab House', nameUr: 'غوثیہ کباب ہاؤس', area: 'DHA Phase 2',
    cuisines: ['BBQ', 'Pakistani'], price: 2, avgTicket: 1200, capacity: 100,
    prior: 'street_late', rating: 4.2, reviews: 860, verifiedRating: 4.3,
    blurb: 'Roadside grill near Do Talwar. Chicken tikka off the coal, eaten standing up.',
    dishes: [
      { id: 'gh-tikka', name: 'Chicken Tikka', nameUr: 'چکن تکہ', price: 540, peak: [21, 25], hi: 9.0, lo: 6.8, decay: .55, n: 1120, sellout: null },
      { id: 'gh-kabab', name: 'Seekh Kabab', nameUr: 'سیخ کباب', price: 420, peak: [21, 25], hi: 8.6, lo: 6.6, decay: .5, n: 1340, sellout: null },
    ],
    facts: {
      prayer_area:     { v: false, c: .78, n: 6 },
      family_section:  { v: false, c: .82, n: 8 },
      outdoor_seating: { v: true,  c: .96, n: 22 },
      parking:         { v: 'street', c: .64, n: 12 },
      card_accepted:   { v: false, c: .9,  n: 15, reliability: .0 },
      generator_backup:{ v: false, c: .7,  n: 5 },
      noise_level:     { v: 'loud', c: .9,  n: 16 },
    },
    deals: [],
    trust: { score: 77, reviewFlagRate: .06, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'layers', name: 'Layers Bakeshop', nameUr: 'لیئرز بیک شاپ', area: 'DHA Phase 6',
    cuisines: ['Bakery', 'Café'], price: 1, avgTicket: 620, capacity: 50,
    prior: 'bakery_evening', rating: 4.6, reviews: 1120, verifiedRating: 4.5,
    blurb: 'Brownies and cold coffee. The queue is the review.',
    dishes: [
      { id: 'brownie', name: 'Fudge Brownie', nameUr: 'فج براؤنی', price: 340, peak: [16, 22], hi: 9.1, lo: 7.6, decay: .3, n: 1900, sellout: '22:30' },
      { id: 'cold-coffee', name: 'Cold Coffee', nameUr: 'کولڈ کافی', price: 460, peak: [15, 23], hi: 8.4, lo: 7.4, decay: .25, n: 1600, sellout: null },
    ],
    facts: {
      family_section:  { v: true,  c: .84, n: 12 },
      outdoor_seating: { v: true,  c: .8,  n: 10 },
      parking:         { v: 'street', c: .58, n: 8 },
      card_accepted:   { v: true,  c: .95, n: 21, reliability: .93 },
      generator_backup:{ v: true,  c: .86, n: 8 },
      noise_level:     { v: 'lively', c: .76, n: 9 },
    },
    deals: [],
    trust: { score: 87, reviewFlagRate: .05, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'hanifia', name: 'Hanifia', nameUr: 'حنیفیہ', area: 'PECHS',
    cuisines: ['Biryani', 'Fried Chicken'], price: 1, avgTicket: 540, capacity: 70,
    prior: 'biryani_lunch', rating: 4.0, reviews: 1440, verifiedRating: 3.9,
    blurb: 'Broast and biryani. Cash, queue, no seating worth mentioning.',
    dishes: [
      { id: 'hn-broast', name: 'Broast', nameUr: 'بروسٹ', price: 560, peak: [13, 22], hi: 8.3, lo: 6.8, decay: .35, n: 1500, sellout: null },
      { id: 'hn-biryani', name: 'Chicken Biryani', nameUr: 'چکن بریانی', price: 400, peak: [12, 15], hi: 8.0, lo: 6.2, decay: .45, n: 1700, sellout: '22:00' },
    ],
    facts: {
      prayer_area:     { v: false, c: .74, n: 5 },
      family_section:  { v: false, c: .8,  n: 7 },
      parking:         { v: 'street', c: .56, n: 9 },
      card_accepted:   { v: false, c: .88, n: 14, reliability: .0 },
      generator_backup:{ v: true,  c: .74, n: 6 },
      noise_level:     { v: 'loud', c: .84, n: 11 },
    },
    deals: [],
    trust: { score: 70, reviewFlagRate: .12, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'del-frio', name: 'Del Frio', nameUr: 'ڈیل فریو', area: 'Gulistan-e-Johar',
    cuisines: ['Desserts', 'Café'], price: 1, avgTicket: 480, capacity: 60,
    prior: 'bakery_evening', rating: 4.2, reviews: 760, verifiedRating: 4.1,
    blurb: 'Late-night falooda and ice cream for the Johar crowd.',
    dishes: [
      { id: 'falooda', name: 'Special Falooda', nameUr: 'اسپیشل فالودہ', price: 420, peak: [20, 25], hi: 8.5, lo: 7.0, decay: .3, n: 980, sellout: null },
    ],
    facts: {
      family_section:  { v: true,  c: .86, n: 13 },
      outdoor_seating: { v: true,  c: .82, n: 10 },
      parking:         { v: 'street', c: .7, n: 8 },
      card_accepted:   { v: true,  c: .84, n: 12, reliability: .76 },
      generator_backup:{ v: true,  c: .8,  n: 7 },
      noise_level:     { v: 'moderate', c: .72, n: 8 },
    },
    deals: [],
    trust: { score: 80, reviewFlagRate: .08, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'meerath', name: 'Meerath Kabab House', nameUr: 'میرٹھ کباب ہاؤس', area: 'Nazimabad',
    cuisines: ['BBQ', 'Pakistani'], price: 1, avgTicket: 800, capacity: 80,
    prior: 'street_late', rating: 4.3, reviews: 690, verifiedRating: 4.4,
    blurb: 'Forty-seven reviews per thousand covers and better kababs than places with four thousand.',
    dishes: [
      { id: 'mr-kabab', name: 'Meerath Kabab', nameUr: 'میرٹھی کباب', price: 380, peak: [20, 24], hi: 9.2, lo: 6.9, decay: .5, n: 540, sellout: '23:50' },
    ],
    facts: {
      prayer_area:     { v: true,  c: .8,  n: 8 },
      family_section:  { v: true,  c: .74, n: 7 },
      outdoor_seating: { v: true,  c: .9,  n: 12 },
      parking:         { v: 'street', c: .6, n: 7 },
      card_accepted:   { v: false, c: .86, n: 11, reliability: .0 },
      generator_backup:{ v: false, c: .72, n: 5 },
      noise_level:     { v: 'loud', c: .88, n: 10 },
    },
    deals: [],
    trust: { score: 82, reviewFlagRate: .03, kitchenTransparency: false, regulatory: [] },
    hiddenGem: true
  },
  {
    id: 'charcoal', name: 'Charcoal BBQ & Grill', nameUr: 'چارکول بی بی کیو', area: 'Do Darya',
    cuisines: ['BBQ', 'Pakistani'], price: 3, avgTicket: 2600, capacity: 300,
    prior: 'seafood_view', rating: 4.1, reviews: 940, verifiedRating: 3.9,
    blurb: 'Creek-side grill next door to the busier names. Usually the shorter wait.',
    dishes: [
      { id: 'ch-platter', name: 'Mixed Grill Platter', nameUr: 'مکسڈ گرل پلیٹر', price: 3400, peak: [20, 23], hi: 8.1, lo: 6.4, decay: .45, n: 610, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .9,  n: 15 },
      family_section:  { v: true,  c: .94, n: 24 },
      outdoor_seating: { v: true,  c: .96, n: 26 },
      parking:         { v: 'lot', c: .82, n: 16 },
      generator_backup:{ v: true,  c: .88, n: 12 },
      high_chairs:     { v: true,  c: .72, n: 7 },
      card_accepted:   { v: true,  c: .92, n: 18, reliability: .88 },
      noise_level:     { v: 'moderate', c: .76, n: 10 },
      iftar_service:   { v: true,  c: .88, n: 8, seating_from: '18:05' },
    },
    deals: [{ bank: 'Nishan Bank', claimed: '25%', honoured: .69, n: 16 }],
    trust: { score: 78, reviewFlagRate: .09, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'pompei', name: 'Pompei', nameUr: 'پومپئی', area: 'DHA Phase 6',
    cuisines: ['Italian', 'Continental'], price: 4, avgTicket: 3800, capacity: 90,
    prior: 'cafe_day', rating: 4.4, reviews: 520, verifiedRating: 4.3,
    blurb: 'Wood-fired pizza and a short pasta list. Reliable, unfashionable, good.',
    dishes: [
      { id: 'margherita', name: 'Margherita', nameUr: 'مارگریٹا', price: 1900, peak: [13, 22], hi: 8.6, lo: 7.4, decay: .3, n: 470, sellout: null },
      { id: 'carbonara', name: 'Carbonara', nameUr: 'کاربونارا', price: 2400, peak: [19, 22], hi: 8.2, lo: 7.0, decay: .35, n: 360, sellout: null },
    ],
    facts: {
      family_section:  { v: true,  c: .88, n: 15 },
      parking:         { v: 'valet', c: .8,  n: 12 },
      card_accepted:   { v: true,  c: .96, n: 22, reliability: .94 },
      generator_backup:{ v: true,  c: .9,  n: 10 },
      wheelchair_ramp: { v: true,  c: .7,  n: 5 },
      high_chairs:     { v: true,  c: .76, n: 8 },
      noise_level:     { v: 'quiet', c: .82, n: 11 },
    },
    deals: [],
    trust: { score: 85, reviewFlagRate: .05, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'cafe-piyala', name: 'Café Piyala', nameUr: 'کیفے پیالہ', area: 'Burns Road',
    cuisines: ['Chai', 'Breakfast', 'Pakistani'], price: 1, avgTicket: 320, capacity: 55,
    prior: 'nihari_morning', rating: 4.2, reviews: 1180, verifiedRating: 4.2,
    blurb: 'Halwa puri from six, doodh patti all day, and a room that has not changed in forty years.',
    dishes: [
      { id: 'halwa-puri', name: 'Halwa Puri', nameUr: 'حلوہ پوری', price: 280, peak: [6, 11], hi: 9.0, lo: 5.2, decay: .7, n: 1620, sellout: '11:40' },
      { id: 'doodh-patti', name: 'Doodh Patti', nameUr: 'دودھ پتی', price: 90, peak: [6, 24], hi: 8.4, lo: 7.8, decay: .15, n: 3400, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .8,  n: 9 },
      family_section:  { v: true,  c: .7,  n: 6 },
      outdoor_seating: { v: true,  c: .88, n: 12 },
      parking:         { v: 'street', c: .5, n: 8, note: 'Burns Road — none' },
      card_accepted:   { v: false, c: .92, n: 14, reliability: .0 },
      generator_backup:{ v: false, c: .74, n: 5 },
      noise_level:     { v: 'loud', c: .9,  n: 13 },
    },
    deals: [],
    trust: { score: 79, reviewFlagRate: .04, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'xanders', name: "Xander's", nameUr: 'زینڈرز', area: 'Zamzama',
    cuisines: ['Continental', 'Café'], price: 3, avgTicket: 2900, capacity: 120,
    prior: 'cafe_day', rating: 4.2, reviews: 980, verifiedRating: 4.0,
    blurb: 'All-day café. Where a Zamzama meeting goes when it needs three hours.',
    dishes: [
      { id: 'xn-breakfast', name: 'Big Breakfast', nameUr: 'بگ بریک فاسٹ', price: 1600, peak: [9, 13], hi: 8.4, lo: 6.6, decay: .4, n: 620, sellout: null },
      { id: 'xn-steak', name: 'Ribeye', nameUr: 'رِب آئی', price: 4200, peak: [19, 22], hi: 7.9, lo: 6.4, decay: .4, n: 280, sellout: null },
    ],
    facts: {
      family_section:  { v: true,  c: .9,  n: 18 },
      outdoor_seating: { v: true,  c: .86, n: 14 },
      parking:         { v: 'valet', c: .78, n: 13 },
      card_accepted:   { v: true,  c: .96, n: 25, reliability: .95 },
      generator_backup:{ v: true,  c: .92, n: 12 },
      high_chairs:     { v: true,  c: .8,  n: 9 },
      wheelchair_ramp: { v: true,  c: .76, n: 6 },
      noise_level:     { v: 'moderate', c: .8, n: 12 },
    },
    deals: [{ bank: 'Meridian Bank', claimed: '20%', honoured: .81, n: 17 }],
    trust: { score: 83, reviewFlagRate: .07, kitchenTransparency: true, regulatory: [] }
  },
  {
    id: 'lal-qila', name: 'Lal Qila', nameUr: 'لال قلعہ', area: 'Shahrah-e-Faisal',
    cuisines: ['Mughlai', 'Buffet'], price: 3, avgTicket: 3200, capacity: 500,
    prior: 'bbq_night', rating: 4.0, reviews: 1620, verifiedRating: 3.8,
    blurb: 'A fort-shaped buffet hall. Goes at exactly one speed: full.',
    dishes: [
      { id: 'lq-buffet', name: 'Dinner Buffet', nameUr: 'ڈنر بوفے', price: 3200, peak: [19, 22], hi: 7.6, lo: 5.8, decay: .5, n: 1240, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .96, n: 28 },
      family_section:  { v: true,  c: .98, n: 46 },
      parking:         { v: 'valet', c: .9, n: 26 },
      generator_backup:{ v: true,  c: .95, n: 20 },
      high_chairs:     { v: true,  c: .88, n: 16 },
      wheelchair_ramp: { v: true,  c: .84, n: 11 },
      card_accepted:   { v: true,  c: .95, n: 30, reliability: .91 },
      noise_level:     { v: 'loud', c: .9,  n: 19 },
      iftar_service:   { v: true,  c: .96, n: 18, seating_from: '17:50', preOrder: true },
    },
    deals: [{ bank: 'Anwar Bank', claimed: '30%', honoured: .43, n: 24 }],
    trust: { score: 74, reviewFlagRate: .16, kitchenTransparency: false, regulatory: [] }
  },
  {
    id: 'burns-rabri', name: 'Delhi Rabri House', nameUr: 'دہلی ربڑی ہاؤس', area: 'Burns Road',
    cuisines: ['Desserts'], price: 1, avgTicket: 260, capacity: 40,
    prior: 'street_late', rating: 4.4, reviews: 830, verifiedRating: 4.5,
    blurb: 'Rabri in a clay matka. Go after the Burns Road dinner crowd thins at 11.',
    dishes: [
      { id: 'rabri', name: 'Matka Rabri', nameUr: 'مٹکا ربڑی', price: 260, peak: [21, 25], hi: 9.3, lo: 7.4, decay: .35, n: 720, sellout: '01:30' },
    ],
    facts: {
      outdoor_seating: { v: true,  c: .92, n: 14 },
      family_section:  { v: false, c: .78, n: 6 },
      parking:         { v: 'street', c: .5, n: 7 },
      card_accepted:   { v: false, c: .9,  n: 12, reliability: .0 },
      noise_level:     { v: 'loud', c: .86, n: 9 },
    },
    deals: [],
    trust: { score: 81, reviewFlagRate: .03, kitchenTransparency: false, regulatory: [] },
    hiddenGem: true
  },
  {
    id: 'salt-pepper', name: 'Salt\'n Pepper Village', nameUr: 'سالٹ اینڈ پیپر ولیج', area: 'Shahrah-e-Faisal',
    cuisines: ['Pakistani', 'Buffet'], price: 3, avgTicket: 2900, capacity: 380,
    prior: 'bbq_night', rating: 3.9, reviews: 1310, verifiedRating: 3.7,
    blurb: 'Village-themed buffet. Consistent, in both directions.',
    dishes: [
      { id: 'sp-buffet', name: 'Village Buffet', nameUr: 'ولیج بوفے', price: 2900, peak: [19, 22], hi: 7.4, lo: 5.6, decay: .5, n: 980, sellout: null },
    ],
    facts: {
      prayer_area:     { v: true,  c: .94, n: 21 },
      family_section:  { v: true,  c: .96, n: 32 },
      parking:         { v: 'valet', c: .86, n: 18 },
      generator_backup:{ v: true,  c: .92, n: 14 },
      high_chairs:     { v: true,  c: .84, n: 12 },
      wheelchair_ramp: { v: true,  c: .8,  n: 8 },
      card_accepted:   { v: true,  c: .94, n: 24, reliability: .89 },
      noise_level:     { v: 'moderate', c: .78, n: 13 },
      iftar_service:   { v: true,  c: .94, n: 14, seating_from: '17:55' },
    },
    deals: [],
    trust: { score: 76, reviewFlagRate: .1, kitchenTransparency: false, regulatory: [] }
  },
];

/* ── The demo user ───────────────────────────────────────────────────────── */
HZ.user = {
  name: 'Bilal',
  nameUr: 'بلال',
  homeArea: 'Bahadurabad',
  palate: { spice: 0.86, richness: 0.72, novelty: 0.34, sweet: 0.41, seafood: 0.55 },
  budgetTypical: 2200,
  allergies: [],
  avoid: [],
  visits: 47,
  weight: 1.0,
  // dishes this user has rated 8+; used for the "taste twin" copy
  loved: ['dhaga-kabab', 'nihari', 'malai-boti', 'mr-kabab'],
};

/* ── Group session (private constraints) ─────────────────────────────────── */
HZ.group = {
  title: 'Friday dinner',
  members: [
    { id: 'bilal',  name: 'Bilal',  nameUr: 'بلال',   responded: true,  budget: 2400, diet: [],           maxTravel: 25, mood: 'spicy',   weight: 1.0, regret: 0 },
    { id: 'ayesha', name: 'Ayesha', nameUr: 'عائشہ',  responded: true,  budget: 1400, diet: ['no-beef'],  maxTravel: 20, mood: 'quiet',   weight: 1.4, regret: 2 },
    { id: 'sara',   name: 'Sara',   nameUr: 'سارہ',   responded: true,  budget: 3200, diet: ['nut-allergy'], maxTravel: 35, mood: 'anything', weight: 1.0, regret: 0 },
    { id: 'hamza',  name: 'Hamza',  nameUr: 'حمزہ',   responded: true,  budget: 1800, diet: [],           maxTravel: 30, mood: 'bbq',     weight: 1.0, regret: 0 },
    { id: 'zoya',   name: 'Zoya',   nameUr: 'زویا',   responded: true,  budget: 2600, diet: [],           maxTravel: 22, mood: 'quiet',   weight: 1.1, regret: 1 },
    { id: 'ali',    name: 'Ali',    nameUr: 'علی',    responded: false, budget: 2000, diet: [],           maxTravel: 30, mood: 'bbq',     weight: 1.0, regret: 0 },
  ]
};

/* ── Suggested queries (Roman-Urdu first — this is how Karachi actually types) */
HZ.suggestions = [
  { q: 'Kuch spicy khana hai, 4500 tak, 20 min mein, 6 log hain', en: 'Something spicy, Rs 4,500 for the table, within 20 min, party of 6', tag: 'group' },
  { q: 'Nihari — abhi sahi hai ya subah aaun?',           en: 'Nihari — good now, or come in the morning?',  tag: 'dish-time' },
  { q: 'Family ke saath, prayer area chahiye, 20 min',    en: 'Family dinner, prayer area, within 20 min',   tag: 'facts' },
  { q: 'Sasta aur jaldi — akela hoon',                    en: 'Cheap and fast — eating alone',               tag: 'solo' },
  { q: 'Late night, 11 baje ke baad khula ho',            en: 'Late night, open after 11pm',                 tag: 'late' },
];

/* ── Partner / yield demo numbers ────────────────────────────────────────── */
HZ.partner = {
  venueId: 'sajjad',
  weekCovers: [318, 262, 274, 301, 356, 512, 486],
  utilisation: [.41, .34, .36, .39, .46, .71, .67],
  offPeak: { window: 'Tue 15:00–18:00', utilisation: .19, seatsIdle: 42, marginPct: .71, suggestedDiscount: .22, projectedCovers: 14 },
  attribution: { sent: 9, seatedVerified: 7, revenuePkr: 11400, period: 'today' },
};

export default HZ;
