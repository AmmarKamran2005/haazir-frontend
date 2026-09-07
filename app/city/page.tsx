'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { HZ, engine } from '@/lib/hz';
import { cityState } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';
import type { CityArea, CityStats } from '@/lib/hz/types';

const LEGEND: [string, string][] = [
  ['free', 'Under 55% — walk in'],
  ['moderate', '55–80% — short wait'],
  ['busy', '80–92% — queue'],
  ['full', 'Over 92% — full'],
];

const EMPTY_CITY: CityStats = {
  areas: [], cityMean: 0, idleSeats: null, venues: 0, weeklyMean: 0,
};

export default function Page() {
  useClock();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();

  /* Tapping an area opens the first venue we hold in it — the prototype's
     `area` action. Areas in the seeded set always have at least one. */
  const openArea = useCallback((area: string) => {
    const first = HZ.venues.find((v: { area: string }) => v.area === area);
    if (first) router.push('/v/' + first.id);
    else toast('No venue in the seeded set sits in ' + area + ' yet.', 'info');
  }, [router, toast]);

  /* Occupancy and the headline numbers come from the API; HZ.areas stays local because it
     is map geometry — where to draw each dot — not data the server has an opinion about. */
  const { data } = useAsync(() => cityState(), []);
  const c = data ?? EMPTY_CITY;
  const areas = HZ.areas as Record<string, { ur: string; x: number; y: number }>;

  const sorted = c.areas.slice().sort((a: CityArea, b: CityArea) => b.occupancy - a.occupancy);
  const busiest = sorted[0];
  const quietest = sorted[sorted.length - 1];
  const weeklyMean = c.weeklyMean;

  return (
    <>
      <h1 className="sr">{t('city.title')}</h1>
      <div className="ahead">
        <div style={{ flex: 1 }}>
          <div className="ahead__t">{t('city.title')}</div>
          <div className="ahead__s">
            {engine.dayName()} {engine.timeString()} · fused occupancy across {c.venues} venues
          </div>
        </div>
      </div>

      <div className="app__scroll scroll">
        <div className="citywrap">
          <div className="citymap">
            <div className="citymap__grid" />
            {c.areas.map((a: CityArea) => {
              const pos = areas[a.area];
              if (!pos) return null;
              const b = engine.stateBand(a.occupancy);
              const size = 10 + a.occupancy * 26;
              return (
                <button
                  key={a.area}
                  className={'cnode s-' + b}
                  style={{ left: (pos.x * 100) + '%', top: (pos.y * 100) + '%' }}
                  aria-label={a.area + ', ' + Math.round(a.occupancy * 100) + '% full, ' + (a.venueCount ?? a.venues.length) + ' venues'}
                  onClick={() => openArea(a.area)}
                >
                  <span
                    className={'cnode__b' + (a.occupancy > 0.88 ? ' pulse' : '')}
                    style={{ width: size + 'px', height: size + 'px', opacity: 0.45 + a.occupancy * 0.55 }}
                  />
                  <span className="cnode__l">{a.area}</span>
                  <span className="cnode__v">{Math.round(a.occupancy * 100)}%</span>
                </button>
              );
            })}
          </div>

          <div className="citylegend">
            {LEGEND.map(([band, label]) => (
              <span key={band} className={'citylegend__i s-' + band}>
                <span className="citylegend__k" style={{ background: 'var(--sig)' }} />
                {label}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="bignum">
              <div className="bignum__v">{Math.round(c.cityMean * 100)}%</div>
              <div className="bignum__l">
                mean utilisation <b>right now</b> — {engine.dayName()} evening is the busiest window of the Karachi week.
              </div>
            </div>

            <div className="rule--tick" />

            <div className="bignum">
              <div className="bignum__v">{Math.round(weeklyMean * 100)}%</div>
              <div className="bignum__l">
                mean utilisation <b>across a full week</b>, averaged over all 168 hours of these venues&apos; demand curves.
                That is the number the business rests on — and it is computed here, not asserted.
              </div>
            </div>

            <div className="rule--tick" />

            {/* "0 seats empty" would read as a full city. What is true is that no venue in
                the set publishes its covers — Google does not carry the figure — so the
                claim is made about what is known instead. */}
            <div className="bignum">
              <div className="bignum__v">
                {c.idleSeats == null ? '—' : c.idleSeats.toLocaleString()}
              </div>
              <div className="bignum__l">
                {c.idleSeats == null
                  ? 'seats empty right now — not yet countable, because no venue in this set publishes its capacity. '
                  : 'seats empty at this moment across the city. '}
                <b>Everyone else monetises attention. We monetise capacity.</b>
              </div>
            </div>

            <div className="rule--tick" />

            <div>
              <div className="lbl" style={{ marginBottom: 9 }}>{t('city.rightNow')}</div>
              {/* Empty until the first response lands, and `sorted[0]` is undefined until
                  then. The sentence is about two named areas, so there is nothing partial
                  worth rendering — it waits. */}
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                {busiest && quietest ? (
                  <>
                    <b style={{ color: 'var(--ink)' }}>{busiest.area}</b> is the tightest area in the city at{' '}
                    {Math.round(busiest.occupancy * 100)}%
                    {busiest.waitAvg > 0 ? ' — average wait ' + Math.round(busiest.waitAvg) + ' minutes' : ''}.{' '}
                    <b style={{ color: 'var(--ink)' }}>{quietest.area}</b> is sitting at {Math.round(quietest.occupancy * 100)}%.{' '}
                    A diner two neighbourhoods away has no way to know either of those facts today.
                  </>
                ) : (
                  'Reading the city…'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
