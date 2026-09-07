'use client';

import { engine } from '@/lib/hz';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';

export function PulseStrip() {
  const city = engine.cityState();
  const hot = city.areas.slice().sort((a: any, b: any) => b.occupancy - a.occupancy).slice(0, 5);

  return (
    <div className="pulse-strip">
      <div className="pulse-strip__h">
        <Label>Karachi right now</Label>
      </div>
      {hot.map((a: any) => {
        const b = engine.stateBand(a.occupancy);
        return (
          <div key={a.area} className={'pulse-row s-' + b}>
            <span className="pulse-row__a">{a.area}</span>
            <span className="pulse-row__bar">
              <span className="pulse-row__fill" style={{ width: (a.occupancy * 100).toFixed(0) + '%' }} />
            </span>
            <span className="pulse-row__v">{Math.round(a.occupancy * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}
