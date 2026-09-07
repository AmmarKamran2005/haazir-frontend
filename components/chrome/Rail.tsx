'use client';

import { usePathname, useRouter } from 'next/navigation';
import { HZ, engine } from '@/lib/hz';
import { surfaceFromPath, DEMO_GROUP_ID } from '@/lib/surface';
import { useClock } from '@/lib/hooks/useDemoClock';
import { cityState } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';

type NavItem = [key: string, label: string, href: string];

export function Rail() {
  const pathname = usePathname();
  const router = useRouter();
  useClock();

  const surface = surfaceFromPath(pathname);
  /* The rail sits in the chrome on every surface, so it shows the same city numbers the
     city page does and from the same place. */
  const { data: cityData } = useAsync(() => cityState(), []);
  const city = cityData ?? { cityMean: 0, weeklyMean: 0, idleSeats: null as number | null };
  const sealed = HZ.venues.filter((v: any) =>
    v.trust.regulatory.some((r: any) => r.type === 'sealed')).length;

  const g = `/g/${DEMO_GROUP_ID}`;
  const nav: NavItem[] = {
    diner: [
      ['home', 'Ask', '/'],
      ['results', 'Ranked results', '/results'],
      ['venue', 'Venue truth card', '/v/kolachi'],
    ],
    group: [
      ['lobby', 'Group lobby', g],
      ['private', 'Private constraints', `${g}/me`],
      ['solved', 'Fair solution', `${g}/solved`],
    ],
    staff: [
      ['console', 'One-tap state', '/staff'],
      ['payback', 'What the venue gets', '/staff'],
    ],
    city: [
      ['map', 'Karachi Tonight', '/city'],
      ['idle', 'The empty 60%', '/city'],
    ],
    partner: [
      ['yield', 'Yield engine', `/partner/${HZ.partner.venueId}`],
      ['attrib', 'Verified attribution', `/partner/${HZ.partner.venueId}`],
    ],
  }[surface] as NavItem[];

  const isCurrent = (key: string) => {
    if (surface === 'diner') {
      if (key === 'home') return pathname === '/';
      if (key === 'results') return pathname.startsWith('/results');
      if (key === 'venue') return pathname.startsWith('/v/');
    }
    if (surface === 'group') {
      if (key === 'lobby') return pathname === g;
      if (key === 'private') return pathname === `${g}/me`;
      if (key === 'solved') return pathname === `${g}/solved`;
    }
    return false;
  };

  return (
    <aside className="rail scroll" aria-label="Surface navigation and city stats">
      <div className="rail__sec">
        <div className="rail__h"><span className="lbl">This surface</span></div>
        <div className="rail__list">
          {nav.map((n, i) => (
            <button
              key={n[0]}
              className="rail__i"
              aria-current={isCurrent(n[0]) ? 'true' : undefined}
              onClick={() => router.push(n[2])}
            >
              <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
              {n[1]}
            </button>
          ))}
        </div>
      </div>
      <div className="rail__sec">
        <div className="rail__h"><span className="lbl">Karachi, live</span></div>
        <div className="railstat">
          <div className="railstat__v">{Math.round(city.cityMean * 100)}%</div>
          <div className="railstat__l">
            utilisation now · <b>{Math.round(city.weeklyMean * 100)}%</b> averaged over a full week
          </div>
        </div>
        <div className="railstat">
          {/* Null, not zero, when no venue publishes its capacity. An em dash says that;
              "0" would claim the city is full. */}
          <div className="railstat__v">
            {city.idleSeats == null ? '—' : city.idleSeats.toLocaleString()}
          </div>
          <div className="railstat__l">
            {city.idleSeats == null
              ? 'seats sitting empty right now — not countable until venues publish capacity'
              : 'seats sitting empty right now — the inventory we sell'}
          </div>
        </div>
        <div className="railstat">
          <div className="railstat__v">{sealed}</div>
          <div className="railstat__l">venue here carries a published enforcement record no other app shows</div>
        </div>
      </div>
      <div className="rail__sec">
        <div className="rail__h"><span className="lbl">Honesty</span></div>
        <p style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--ink-3)' }}>
          Venue names, areas, cuisines and dishes are real.{' '}
          Occupancy is a real estimator running on <b style={{ color: 'var(--ink-2)' }}>simulated</b> sensor input.{' '}
          Trust, review and deal figures are <b style={{ color: 'var(--ink-2)' }}>seeded</b> — except one regulatory
          record, which is real and linked to its source. Every screen says which is which.
        </p>
      </div>
    </aside>
  );
}
