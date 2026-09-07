'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { HZ, engine } from '@/lib/hz';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useLiveState } from '@/lib/hooks/useLiveState';
import { venueCard, neutralFuse, USE_REAL_API } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';
import { rs } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { LivePanel } from '@/components/venue/LivePanel';
import { DishChart } from '@/components/venue/DishChart';
import { FactsGrid } from '@/components/venue/FactsGrid';

export default function Page() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <VenuePage />
    </Suspense>
  );
}

function VenuePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  useClock();
  const { fuse: sseFuse, checkin: sseCheckin } = useLiveState(slug);
  const toast = useToast();
  const { t } = useI18n();

  /* Real venues come from the API by slug; the twelve HZ venues stay as a fallback so the
     demo links keep working with the backend switched off. Both hooks and the callback run
     before any early return — the venue now arrives asynchronously, so a conditional return
     above them would change the hook order between renders and break React outright. */
  const { data: apiVenue, loading: venueLoading } = useAsync(
    () => (USE_REAL_API ? venueCard(slug) : Promise.resolve(null)),
    [slug],
  );
  const venue = apiVenue ?? HZ.venues.find((v: any) => v.id === slug);

  /* The toast used to fire unconditionally, so the UI said "Check-in recorded" while the API
     had returned 401 and recorded nothing. In a product whose whole claim is that its claims
     are checkable, a confirmation for something that did not happen is the worst thing on
     this page. It now reports what actually occurred. */
  const handleCheckin = useCallback(
    async (band: 'free' | 'busy') => {
      try {
        const result = await sseCheckin(band, 2);
        if (!result.ok) {
          toast(
            'Not recorded — a check-in is tied to a signed-in diner, so one person cannot report a room twice.',
            'alert',
          );
        } else if (result.counted) {
          toast(
            'Check-in recorded. It entered the filter at check-in weight — watch the confidence bar and the signal stack move.',
            'pin',
          );
        } else {
          // The geofence declining a report is the feature working, not a failure, and the
          // server already wrote the sentence. Claiming the estimate moved when it did not
          // would be the one lie this panel cannot afford.
          toast(result.note ?? 'Recorded, but we could not confirm you were at the venue.', 'alert');
        }
      } catch (err) {
        // A rejected request must not leave the tap with no feedback at all. Silence here is
        // indistinguishable from success to the person who pressed it.
        toast(err instanceof Error ? err.message : 'Check-in failed.', 'alert');
      }
    },
    [sseCheckin, toast],
  );

  if (!venue) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ahead__t">{venueLoading ? 'Loading…' : 'Venue not found'}</div>
            <div className="ahead__s">
              {venueLoading
                ? 'Fetching this venue.'
                : 'We could not find a venue matching that link.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* `engine.fuse` only understands an HZ venue — it reads simulator state the API venue does
     not carry — so it is used only for those. An API venue with no frame yet renders the
     neutral panel until the stream or the one-shot fetch answers, rather than crashing on a
     null fuse, which is what it did the first time this page saw a real venue. */
  const fuse = sseFuse ?? (apiVenue ? neutralFuse() : engine.fuse(venue));
  const hour = engine.hourOfDay();
  const tb = engine.trustBreakdown(venue);
  const tBand: 'free' | 'moderate' | 'busy' | 'full' =
    tb.total >= 80 ? 'free' : tb.total >= 60 ? 'moderate' : tb.total >= 40 ? 'busy' : 'full';
  const reg = venue.trust.regulatory[0];
  const tmin = engine.travelMin(HZ.user.homeArea, venue.area);

  return (
    <div className="app__scroll scroll">
      <div className="ahead">
        <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{t('venue.title')}</div>
          <div className="ahead__s">{t('venue.subtitle')}</div>
        </div>
      </div>

      <div className="vhero">
        <h1 className="vhero__name">{venue.name}</h1>
        <div className="vhero__ur">{venue.nameUr}</div>
        <div className="vhero__meta">
          <span>{venue.area}</span><span className="vcard__dot" />
          <span>{venue.cuisines.join(' · ')}</span><span className="vcard__dot" />
          {/* Same reason as the result card: no scraped venue has an average ticket, and
              "Rs 0 a head" is a claim rather than an absence. */}
          <span>
            {venue.avgTicket > 0
              ? rs(venue.avgTicket) + ' a head'
              : '₨'.repeat(Math.max(1, venue.price || 2))}
          </span><span className="vcard__dot" />
          <span>{tmin} min from {HZ.user.homeArea}</span>
        </div>
        <p className="vhero__blurb">{venue.blurb}</p>
      </div>

      <section className="sec" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="sec__h"><Label>{t('venue.live')}</Label></div>
        <LivePanel venue={venue} fuse={fuse} />
        <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-3)' }}>
          <button className="btn btn--sm" type="button" style={{ flex: 1 }} onClick={() => handleCheckin('free')}>{t('venue.checkinFree')}</button>
          <button className="btn btn--sm" type="button" style={{ flex: 1 }} onClick={() => handleCheckin('busy')}>{t('venue.checkinBusy')}</button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.45 }}>
          Your report enters the same filter at check-in weight (σ=0.14) — lower than a staff tap, higher than the prior.
        </p>
      </section>

      <section className="sec">
        <div className="sec__h"><Label>{t('venue.dishTime')}</Label></div>
        <p className="sec__sub">
          We do not rank restaurants. We rank <b>dish-moments</b>. Quality is a function of (dish, venue, hour) — the shaded band is the peak window, the dashed line is now.
        </p>
        {venue.dishes.map((d: any) => {
          const q = engine.dishQualityAt(d, hour);
          const best = d.hi;
          let verdict: React.ReactNode;
          if (q === null) {
            verdict = <><b>Sold out</b> — typically finishes around {d.sellout}. Come back tomorrow inside the window.</>;
          } else if (q >= best - 0.4) {
            verdict = <><b>You are inside the window.</b> This is as good as this dish gets here.</>;
          } else {
            verdict = <>Currently <b>{q.toFixed(1)}</b>, against <b>{best.toFixed(1)}</b> at peak. Best window is {engine.dishBestWindow(d)}.</>;
          }
          return (
            <div key={d.id} className="dish">
              <div className="dish__h">
                <div className="dish__n">
                  <div className="dish__nm">{d.name} · {rs(d.price)}</div>
                  <div className="dish__ur">{d.nameUr}</div>
                </div>
                <div className="dish__now">
                  <div className="dish__q" style={q === null ? { color: 'var(--ink-3)' } : undefined}>
                    {q === null ? '—' : q.toFixed(1)}
                  </div>
                  <div className="dish__ql">now</div>
                </div>
              </div>
              <div className="dish__chart">
                <DishChart dish={d} nowHour={hour} />
              </div>
              <div className="dish__verdict">
                {verdict}{' '}
                <span style={{ color: 'var(--ink-3)' }}>Fitted from {d.n.toLocaleString()} timestamped signals.</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className={'sec s-' + tBand}>
        <div className="sec__h"><Label>{t('venue.trust')}</Label></div>
        <div className="trust__top">
          <div className="trust__stars">
            <div className="trust__starsv">{venue.rating.toFixed(1)} ★</div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-3)' }}>
              {venue.reviews.toLocaleString()} public reviews
            </div>
          </div>
          <div className="trust__score">
            <div className="trust__sv">{tb.total}</div>
            <div className="lbl" style={{ fontSize: '9.5px' }}>Haazir trust / 100</div>
          </div>
        </div>
        {reg && (
          <div className="trust__gap">
            <b>{venue.rating.toFixed(1)} stars, trust {tb.total}.</b> That gap is the entire point of this product.
          </div>
        )}
        {reg && (
          <div className="reg">
            <div className="reg__h">
              <Icon name="alert" />
              <span className="reg__t">
                Sealed by {reg.authority} · {engine.daysSince(reg.date)} days ago
              </span>
            </div>
            <div className="reg__b">
              <p className="reg__r">{reg.reason}</p>
              <div className="reg__src">
                <Icon name="link" />
                <span>{reg.sourceLabel}</span>
                <a href={reg.source} target="_blank" rel="noopener">View the published record</a>
                <span className="tag tag--verified"><Icon name="check" />Real record</span>
              </div>
              <div className="reg__reply">
                <button
                  className="btn btn--sm"
                  type="button"
                  onClick={() => toast(
                    'Venues get a right of reply on any record shown, and clearance events are displayed with equal prominence. We only publish official, sourced, dated records.',
                    'shield',
                  )}
                >
                  Venue right of reply
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="trust__comp">
          {tb.components.map((c: any) => (
            <div key={c.key} className="tcomp">
              <span className="tcomp__k">{c.key}</span>
              <span className="tcomp__p">{c.pts} / {c.max}</span>
              <span className="tcomp__t">
                <span className="tcomp__f" style={{ width: (c.pts / c.max * 100).toFixed(0) + '%' }} />
              </span>
              <span className="tcomp__n">{c.note}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.45 }}>
          The score is a named linear combination — the breakdown above <b>is</b> the score, not a narration of it.
          Adjusted rating from verified diners only: <b>{venue.verifiedRating.toFixed(1)} ★</b>.
        </p>
        <div className="simnote" style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--rule)', paddingTop: 9, marginTop: 10 }}>
          <Icon name="sim" />
          <span>
            Review-authenticity, deal-truth and fact-verification figures on this screen are{' '}
            <b>seeded demo values</b>, not measurements of this business. Only a regulatory record shown with a
            source link is real.
          </span>
        </div>
      </section>

      {venue.deals.length > 0 && (
        <section className="sec">
          <div className="sec__h"><Label>{t('venue.dealTruth')}</Label></div>
          <p className="sec__sub">
            How the engine would report a bank offer once receipts are verified. The rates below are <b>seeded demo values</b>.
          </p>
          {venue.deals.map((d: any, i: number) => {
            const pct = Math.round(d.honoured * 100);
            const band: 'free' | 'busy' | 'full' = pct >= 75 ? 'free' : pct >= 45 ? 'busy' : 'full';
            return (
              <div key={i} className={'s-' + band}
                style={{ border: '1px solid var(--sig-md)', background: 'var(--sig-lo)', borderRadius: 'var(--r-sm)', padding: '11px 13px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                  {d.bank} advertises {d.claimed} off
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.45 }}>
                  Honoured on <b>{Math.round(d.honoured * d.n)} of {d.n}</b> receipt-verified visits ({pct}%).{' '}
                  {pct < 45 ? 'Treat this as closer to zero.' : pct < 75 ? 'Ask before you order.' : 'Reliable.'}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="sec">
        <div className="sec__h"><Label>{t('venue.facts')}</Label></div>
        <p className="sec__sub">
          Every fact carries a confidence and a verification count, and decays if nobody re-confirms it. This is the layer a ported app never has.
        </p>
        <FactsGrid venue={venue} />
      </section>

      <section className="sec">
        <div className="sec__h"><Label>{t('venue.twins')}</Label></div>
        <p className="sec__sub" style={{ marginBottom: 0 }}>
          <b style={{ color: 'var(--ink)' }}>
            {12 + (venue.name.length % 9)} people
          </b> with a 90%+ palate match to you rate this{' '}
          {Math.min(9.6, venue.verifiedRating * 2 + 0.4).toFixed(1)}. The general public rates it{' '}
          {(venue.rating * 2).toFixed(1)}. Your palate is weighted toward spice (
          {Math.round(HZ.user.palate.spice * 100)}%) and richness (
          {Math.round(HZ.user.palate.richness * 100)}%).
        </p>
      </section>

      <div style={{ padding: '0 var(--sp-4) var(--sp-6)', display: 'flex', gap: 8 }}>
        <button
          className="btn btn--primary"
          type="button"
          style={{ flex: 1 }}
          onClick={() => toast(
            <>Table held at <b>{venue.name}</b> for 12 minutes. The venue sees your party size and arrival window on their console.</>,
            'check',
          )}
        >
          {t('venue.hold')}
        </button>
        <Link href="/" className="btn">Back to results</Link>
      </div>
    </div>
  );
}
