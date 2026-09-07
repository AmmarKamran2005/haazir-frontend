'use client';

/* The guided demo — nine beats, ported from the prototype's STEPS/director().
   It is the pitch rail: press play in the top bar and each step both narrates
   and navigates. Titles may be functions so a beat can quote a number the
   engine computes now rather than one hard-coded here, which drifts as the
   demo clock moves. */
import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { HZ, engine } from '@/lib/hz';
import { DEMO_GROUP_ID } from '@/lib/surface';
import { Icon } from '@/components/primitives/Icon';

interface Step { t: string | (() => string); s: string; href: () => string }

const STEPS: Step[] = [
  {
    t: 'The hook',
    s: 'Karachi’s restaurants sit near 40% utilisation. Nobody — diner or owner — can see which 60% is empty right now.',
    href: () => '/city',
  },
  {
    t: 'Ask like a Karachi person actually types',
    s: 'Roman-Urdu, mixed script, an implied budget and party size. Watch what gets extracted.',
    href: () => '/',
  },
  {
    t: 'Ranked by dish-moment, not by star rating',
    s: 'The score is a named linear combination and every card shows its own breakdown.',
    href: () => '/results?q=' + encodeURIComponent(HZ.suggestions[0].q),
  },
  {
    t: 'The live estimate, with its uncertainty on show',
    s: 'Four sensors, inverse-variance fused, each decayed by its own staleness. The weights are the filter’s, not a mock.',
    href: () => '/v/kolachi',
  },
  {
    t: 'Now a real human taps a tablet',
    s: 'Open the staff console in a second window and tap BUSY. Confidence jumps, the staff weight rises, the estimate moves.',
    href: () => '/staff',
  },
  {
    t: 'The dish-time graph',
    s: 'Nihari is a 9.4 before 10am and a 5.8 at 8pm. Every Karachi native knows this. No app has ever modelled it.',
    href: () => '/v/javed-nihari',
  },
  {
    t: () => {
      const v = HZ.venues.find((x: { id: string }) => x.id === 'kiado');
      if (!v) return 'The trust gap';
      return v.rating.toFixed(1) + ' stars. Trust ' + engine.trustBreakdown(v).total + '.';
    },
    s: 'A real Sindh Food Authority record, sourced and dated. 370 outlets sealed in six months; not one app told a single diner.',
    href: () => '/v/kiado',
  },
  {
    t: 'Six people, six private budgets, one answer',
    s: 'Max-min fairness, not the mean. Nobody has to say out loud what they can afford.',
    href: () => `/g/${DEMO_GROUP_ID}/solved`,
  },
  {
    t: 'And the business',
    s: 'We do not sell attention. We sell the empty Tuesday, and we only get paid for covers we can prove on a receipt.',
    href: () => `/partner/${HZ.partner.venueId}`,
  },
];

interface DirectorValue { step: number | null; running: boolean; toggle: () => void }

const DirectorCtx = createContext<DirectorValue>({ step: null, running: false, toggle: () => {} });

export function DirectorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);

  const go = useCallback((i: number) => {
    setStep(i);
    router.push(STEPS[i].href());
  }, [router]);

  /* Navigation is a side effect, so it cannot live inside the state updater —
     React runs updaters during render and routing from there warns. */
  const toggle = useCallback(() => {
    if (step !== null) { setStep(null); return; }
    go(0);
  }, [step, go]);

  const value = useMemo(() => ({ step, running: step !== null, toggle }), [step, toggle]);

  return (
    <DirectorCtx.Provider value={value}>
      {children}
      {step !== null && (
        <Bar step={step} onGo={go} onStop={() => setStep(null)} />
      )}
    </DirectorCtx.Provider>
  );
}

function Bar({ step, onGo, onStop }: { step: number; onGo: (i: number) => void; onStop: () => void }) {
  const st = STEPS[step];
  const title = typeof st.t === 'function' ? st.t() : st.t;
  const last = step === STEPS.length - 1;

  return (
    <div className="director" role="region" aria-label="Guided demo">
      <span className="director__n">
        {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
      </span>
      <div className="director__txt">
        <div className="director__t">{title}</div>
        <div className="director__s">{st.s}</div>
      </div>
      <div className="director__acts">
        <button
          className="btn btn--sm"
          type="button"
          disabled={step === 0}
          aria-label="Previous step"
          onClick={() => onGo(step - 1)}
        >
          <Icon name="arrowl" />
        </button>
        {last ? (
          <button className="btn btn--sm btn--primary" type="button" onClick={onStop}>Finish</button>
        ) : (
          <button className="btn btn--sm btn--primary" type="button" onClick={() => onGo(step + 1)}>Next</button>
        )}
        <button className="btn btn--sm" type="button" aria-label="Exit the guided demo" onClick={onStop}>
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}

export const useDirector = () => useContext(DirectorCtx);
