'use client';

/* Phase 2 acceptance gallery — renders each primitive and chart against the
   engine's live output so it can be compared with prototype screenshots.
   Not part of the product; not linked from any navigation. */

import { HZ, engine } from '@/lib/hz';
import type { Dish, FuseResult } from '@/lib/hz/types';
import { useClock } from '@/lib/hooks/useDemoClock';
import { Icon, ICON_NAMES } from '@/components/primitives/Icon';
import { Readout } from '@/components/primitives/Readout';
import { Label } from '@/components/primitives/Label';
import { Sparkline } from '@/components/live/Sparkline';
import { SignalStack } from '@/components/live/SignalStack';
import { ConfidenceBar } from '@/components/live/ConfidenceBar';
import { DishTimeChart } from '@/components/dish/DishTimeChart';
import { rs, mins, ago, bandLabel } from '@/lib/format';

export default function DevGallery() {
  useClock();
  const kolachi = HZ.venues.find((v: { id: string }) => v.id === 'kolachi');
  const javed = HZ.venues.find((v: { id: string }) => v.id === 'javed-nihari');
  if (!kolachi || !javed) throw new Error('seed venues missing');
  const fuse = engine.fuse(kolachi) as FuseResult | null;
  const hour = engine.hourOfDay() as number;
  const nihari = javed.dishes[0] as Dish;
  const maghaz = javed.dishes[1] as Dish;
  const staff = fuse?.parts.find(p => p.source === 'staff');

  return (
    <div className="app__scroll scroll" data-sk="dev">
      <div style={{ padding: '16px 16px 28px', display: 'grid', gap: 20 }}>

        <section>
          <Label style={{ marginBottom: 8 }}>Icons — 1.7px stroke, 24 viewBox, .hz-i</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 18 }}>
            {ICON_NAMES.map(n => <span key={n} title={n}><Icon name={n} /></span>)}
          </div>
        </section>

        <section>
          <Label style={{ marginBottom: 8 }}>Readout — value and unit separated</Label>
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            <Readout value={fuse ? mins(fuse.wait) : '—'} unit="min wait" />
            <Readout value={rs(2450).replace('Rs ', '')} unit="Rs" />
            <Readout value={fuse ? String(Math.round(fuse.confidence * 100)) : '—'} unit="% conf" />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
            {rs(4500)} · {mins(0.4)} min · {ago(7)} · {fuse ? bandLabel[fuse.band] : ''}
          </div>
        </section>

        {fuse && (
          <section>
            <Label style={{ marginBottom: 8 }}>Sparkline + SignalStack + ConfidenceBar — live, on the instrument panel</Label>
            <div className={'panel live s-' + fuse.band} style={{ padding: 14 }}>
              <div className="live__row">
                <div className="live__state">
                  <div className="live__band"><span className="livedot" />{bandLabel[fuse.band]}</div>
                  <Readout className="live__wait" panel value={fuse.wait < 1 ? '0' : String(Math.round(fuse.wait))} unit="min wait" />
                  <div className="live__range">{Math.round(fuse.waitLo)}–{Math.round(fuse.waitHi)} min · p90 {Math.round(fuse.waitP90)}</div>
                </div>
                <div className="live__spark">
                  <div className="lbl lbl--panel" style={{ marginBottom: 5 }}>Last 90 min</div>
                  <Sparkline history={fuse.history} />
                </div>
              </div>
              <SignalStack fuse={fuse} />
              <ConfidenceBar
                confidence={fuse.confidence}
                note={
                  <>Inverse-variance fusion of {fuse.parts.length} sources, each decayed by its own staleness.{' '}
                    {staff
                      ? `Staff report ${staff.age < 1 ? 'just now' : Math.round(staff.age) + ' min old'}.`
                      : 'No staff report yet — prior is carrying the estimate.'}</>
                }
              />
            </div>
          </section>
        )}

        <section>
          <Label style={{ marginBottom: 8 }}>DishTimeChart — {nihari.name}, peak {nihari.peak[0]}–{nihari.peak[1]}h</Label>
          <div className="card" style={{ padding: 12 }}>
            <DishTimeChart dish={nihari} nowHour={hour} />
          </div>
        </section>

        <section>
          <Label style={{ marginBottom: 8 }}>DishTimeChart — {maghaz.name}, sold out from {maghaz.sellout}</Label>
          <div className="card" style={{ padding: 12 }}>
            <DishTimeChart dish={maghaz} nowHour={hour} />
          </div>
        </section>

      </div>
    </div>
  );
}
