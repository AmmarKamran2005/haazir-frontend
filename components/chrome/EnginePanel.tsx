'use client';

import { usePathname } from 'next/navigation';
import { HZ, engine } from '@/lib/hz';
import { USE_REAL_API } from '@/lib/api';
import { focusVenueFromPath } from '@/lib/surface';
import { useClock } from '@/lib/hooks/useDemoClock';
import { Fragment } from 'react';

const NAMES: Record<string, string> = {
  payment: 'Payment velocity',
  staff: 'Staff console',
  checkin: 'Diner check-ins',
  prior: 'Historical prior',
};
const KEYC: Record<string, string> = {
  payment: 'var(--teal)',
  staff: 'var(--saffron)',
  checkin: 'var(--jade)',
  prior: 'var(--ink-4)',
};

export function EnginePanel() {
  const pathname = usePathname();
  useClock();

  const focus = focusVenueFromPath(pathname);
  const v = HZ.venues.find((x: any) => x.id === focus) || HZ.venues[0];
  const f = engine.fuse(v);
  const truth = engine.truthAt(v, engine.clock);

  return (
    <aside className="engine">
      <div className="engine__h">
        <div className="engine__t">
          <span className="lbl">The estimator</span>
          <span className="livedot" style={{ '--sig': 'var(--teal)' } as React.CSSProperties} />
        </div>
        {/* Against the real API this panel is the one thing on screen that is NOT reading
            it. It runs the simulator, because what it shows — the tick stream and the error
            against a hidden ground truth — has no server equivalent: nothing simulated the
            ticks, so there is no truth to be measured against. Saying so is the only honest
            option, given the rest of the screen is live. */}
        <p className="engine__d">
          {USE_REAL_API ? (
            <>
              The same estimator, run against the <b style={{ color: 'var(--ink)' }}>simulator</b>{' '}
              on <b style={{ color: 'var(--ink)' }}>{v.name}</b> — the one place a hidden ground
              truth exists to check the error against. The venues and live estimates elsewhere on
              this screen come from the API.
            </>
          ) : (
            <>
              What the system is computing for <b style={{ color: 'var(--ink)' }}>{v.name}</b> right
              now. Judges: this panel is the model&#39;s own internals, not a mock.
            </>
          )}
        </p>
      </div>
      <div className="engine__body scroll" tabIndex={0}>

        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Fusion step</div>
          <div className="eq"><div className="eq__f">
            <span className="c">x̂ =</span>{' '}
            {f.parts.map((p: any, i: number) => (
              <Fragment key={p.source}>
                {i > 0 && <span className="c"> + </span>}
                <b>{p.weight.toFixed(2)}</b>·{p.source.slice(0, 4)}
                <span className="c">({p.value.toFixed(2)})</span>
              </Fragment>
            ))}
            <br />
            <span className="c">= </span><b>{f.occupancy.toFixed(3)}</b>{' '}
            <span className="c">occupancy · σ = {f.sd.toFixed(3)}</span><br />
            <span className="c">wait = turn · x̂⁴ / (1 − x̂) = </span>
            <b>{f.wait.toFixed(1)}</b><span className="c"> min</span><br />
            <span className="c">conf = 1 − σ/σ₀ = </span><b>{(f.confidence * 100).toFixed(1)}%</b>
          </div></div>
        </div>

        <div>
          <div className="lbl" style={{ marginBottom: 9 }}>Sources &amp; staleness</div>
          <div className="sourcekey">
            {f.parts.map((p: any) => (
              <div className="sk" key={p.source}>
                <span className="sk__k" style={{ background: KEYC[p.source] }} />
                <div>
                  <div className="sk__n">{NAMES[p.source]}</div>
                  <div className="sk__s">
                    {engine.SOURCES[p.source].sub}
                    {engine.SOURCES[p.source].sim ? ' · simulated input' : ''}
                  </div>
                </div>
                <div className="sk__m">
                  w {(p.weight * 100).toFixed(0)}%<br />
                  {p.source === 'prior'
                    ? 'never stale'
                    : `τ=${engine.SOURCES[p.source].tau}m · ${Math.round(p.age)}m old`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="lbl" style={{ marginBottom: 9 }}>Observation stream</div>
          <div className="elog">
            {engine.log.length ? (
              engine.log.slice(0, 11).map((l: any, i: number) => (
                <div key={i} className={'elog__i' + (l.source === 'staff' ? ' elog__i--staff' : '')}>
                  <span className="elog__t">{engine.timeString(l.t)}</span>
                  <span className="elog__m"><b>{l.venueName}</b> · {NAMES[l.source].toLowerCase()}</span>
                  <span className="elog__v">{l.value.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Waiting for the first observation…</p>
            )}
          </div>
        </div>

        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Estimator error</div>
          <div className="eq"><div className="eq__f">
            <span className="c">hidden truth </span><b>{truth.toFixed(3)}</b><br />
            <span className="c">estimate    </span><b>{f.occupancy.toFixed(3)}</b><br />
            <span className="c">|error|     </span><b>{Math.abs(truth - f.occupancy).toFixed(3)}</b>
          </div></div>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.45 }}>
            The simulator knows the true occupancy; the filter never sees it. Shown here so you can
            check the estimator honestly.
          </p>
        </div>

      </div>
    </aside>
  );
}
