'use client';

import { engine } from '@/lib/hz';
import type { FuseResult } from '@/lib/hz/types';
import { bandLabel } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { Readout } from '@/components/primitives/Readout';
import { Label } from '@/components/primitives/Label';
import { Sparkline } from '@/components/live/Sparkline';
import { SignalStack } from '@/components/live/SignalStack';
import { ConfidenceBar } from '@/components/live/ConfidenceBar';

interface Props {
  venue: any;
  fuse: FuseResult;
  hideSim?: boolean;
}

export function LivePanel({ venue, fuse, hideSim }: Props) {
  const drop = engine.waitDropsBelow(venue, 8);
  const trendUp = fuse.trend > 0.035;
  const trendDn = fuse.trend < -0.035;
  const staff = fuse.parts.find(p => p.source === 'staff');

  return (
    <div className={'panel live s-' + fuse.band}>
      <div className="live__row">
        <div className="live__state">
          <div className="live__band">
            <span className="livedot" />
            {bandLabel[fuse.band]}
          </div>
          {/* `live__wait` is not decoration: `.readout` is inline-flex, so
              without it this lands on the band label's line and the 30px
              figure collides with it. Known trap — do not drop the class. */}
          <Readout
            className="live__wait"
            value={fuse.wait < 1 ? '0' : String(Math.round(fuse.wait))}
            unit="min wait"
            panel
          />
          <div className="live__range">
            {Math.round(fuse.waitLo)}–{Math.round(fuse.waitHi)} min · p90 {Math.round(fuse.waitP90)}
          </div>
          <div className="live__trend">
            <Icon name={trendUp ? 'up' : trendDn ? 'down' : 'minus'} />
            {trendUp ? 'filling' : trendDn ? 'emptying' : 'steady'}
            {' · ' + Math.round(fuse.occupancy * 100) + '% full'}
          </div>
        </div>
        <div className="live__spark">
          <Label panel style={{ marginBottom: 5 }}>Last 90 min</Label>
          <Sparkline history={fuse.history} />
        </div>
      </div>

      <SignalStack fuse={fuse} />

      <ConfidenceBar
        confidence={fuse.confidence}
        note={
          <>
            Inverse-variance fusion of {fuse.parts.length} source{fuse.parts.length === 1 ? '' : 's'}, each decayed by its own staleness.{' '}
            {staff
              ? 'Staff report ' + (staff.age < 1 ? 'just now' : Math.round(staff.age) + ' min old') + '.'
              : 'No staff report yet — prior is carrying the estimate.'}
          </>
        }
      />

      {drop && (
        <div className="live__fore">
          <Icon name="clock" />
          <span>
            Wait drops under 8 min at about <b>{engine.timeString(drop.at)}</b> — in {drop.inMin} minutes.
          </span>
        </div>
      )}

      {!hideSim && (
        <div className="simnote">
          <Icon name="sim" />
          <span>
            Payment ticks and check-ins are <b>simulated</b> (models State Bank Raast QR merchant data, pending partnership). The estimator, weights and confidence are real.
          </span>
        </div>
      )}
    </div>
  );
}
