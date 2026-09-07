'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { HZ, engine } from '@/lib/hz';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/en';
import { useLiveState } from '@/lib/hooks/useLiveState';
import { ago } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { staffSend, staffToday, issueDevice, search } from '@/lib/api';
import { EMPTY_STAFF_TODAY } from '@/lib/api/rest';
import { currentPosition } from '@/lib/geo';
import { parseQuery } from '@/lib/search';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { useAsync } from '@/lib/hooks/useAsync';
import type { StaffBand } from '@/lib/api';

const DEVICE_TOKEN_KEY = 'haazir-device-token';
const DEFAULT_VENUE = 'sajjad';

const BANDS: [StaffBand, string][] = [
  ['free', 'Free'],
  ['moderate', 'Steady'],
  ['busy', 'Busy'],
  ['full', 'Full'],
];

export default function Page() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <StaffPage />
    </Suspense>
  );
}


function StaffPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(DEVICE_TOKEN_KEY));
    setChecked(true);
  }, []);

  if (!checked) return <div className="app__scroll scroll" />;
  if (!token) return <EnrolScreen onEnrol={(t) => { localStorage.setItem(DEVICE_TOKEN_KEY, t); setToken(t); }} />;
  return <StaffConsole />;
}

function EnrolScreen({ onEnrol }: { onEnrol: (token: string) => void }) {
  const [label, setLabel] = useState('Counter tablet');
  const [query, setQuery] = useState('');
  const [venues, setVenues] = useState<{ id: string; name: string; area: string }[]>([]);
  const [venueId, setVenueId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  /* Enrolment is an admin action against the real API, not a token minted in the browser.
     The previous version generated a random string locally, so the console "activated" and
     then every request it made returned 401 — an activation that activates nothing is worse
     than a locked door. */
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const findVenues = useCallback(async () => {
    if (!query.trim()) return;
    setError(null);
    try {
      const r = await search({ ...parseQuery(query), maxTravel: 90 });
      setVenues(
        r.results.slice(0, 8).map(x => ({
          id: (x.venue.venueId ?? x.venue.id) as string,
          name: x.venue.name,
          area: x.venue.area,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    }
  }, [query]);

  const handleEnrol = async () => {
    if (!venueId) return;
    setBusy(true);
    setError(null);
    try {
      const issued = await issueDevice(venueId, label.trim() || 'Counter tablet');
      if (!issued) throw new Error('The API did not return a token.');
      onEnrol(issued.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue a device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">Staff console</h1>
      <div className="staff" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--rule-strong)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
          <Icon name="lock" />
        </div>
        <div style={{ fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em' }}>Staff access</div>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 360, marginTop: 8 }}>
          This console belongs to one device at one venue. The token is issued by an admin,
          bound to that venue, geofenced, and expires — so a tap can only ever speak for the
          room the tablet is standing in.
        </p>

        {!isAdmin ? (
          <div style={{ maxWidth: 360, marginTop: 18 }}>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              {isAuthenticated
                ? 'Signed in, but this account is not an admin. Enrolment is an admin action.'
                : 'Sign in as an admin to enrol this device.'}
            </p>
            <Link href="/auth" className="btn btn--primary btn--sm" style={{ marginTop: 12, display: 'inline-block' }}>
              {isAuthenticated ? 'Switch account' : 'Sign in'}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ width: '100%', maxWidth: 360, marginTop: 20, textAlign: 'left' }}>
              <Label>Venue</Label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  className="btn"
                  style={{ flex: 1, textAlign: 'left', cursor: 'text', minHeight: 44 }}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); findVenues(); } }}
                  placeholder="biryani, nihari, a venue name…"
                />
                <button className="btn btn--sm" type="button" onClick={findVenues}>Find</button>
              </div>
              {venues.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {venues.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      className="btn btn--sm"
                      data-active={v.id === venueId ? 1 : 0}
                      style={{
                        textAlign: 'left',
                        borderColor: v.id === venueId ? 'var(--ochre)' : undefined,
                      }}
                      onClick={() => setVenueId(v.id)}
                    >
                      {v.name} · {v.area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '100%', maxWidth: 360, marginTop: 14, textAlign: 'left' }}>
              <Label>Device label</Label>
              <input
                type="text"
                className="btn"
                style={{ width: '100%', marginTop: 6, textAlign: 'left', cursor: 'text', minHeight: 44 }}
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Counter tablet"
              />
            </div>

            <button
              className="btn btn--primary"
              style={{ marginTop: 20, minWidth: 200, minHeight: 50, fontSize: 15 }}
              type="button"
              disabled={!venueId || busy}
              onClick={handleEnrol}
            >
              {busy ? 'Issuing…' : 'Activate this device'}
            </button>
            {!venueId && (
              <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>
                Pick a venue first — a device that is not bound to one cannot report.
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 12.5, color: 'var(--verm)', marginTop: 12, maxWidth: 360 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StaffConsole() {
  /* The venue is whatever the device token is bound to; the server decides and tells us. The
     hardcoded DEFAULT_VENUE was left over from the mock, so an enrolled tablet showed the
     name of a demo restaurant it had nothing to do with. */
  const venueId = DEFAULT_VENUE;
  const venue = HZ.venues.find((v: any) => v.id === venueId);
  useClock();
  const { fuse } = useLiveState(venueId);
  const toast = useToast();
  const { t } = useI18n();
  const [band, setBand] = useState<StaffBand | null>(null);
  const [wait, setWait] = useState(15);

  const liveFuse = fuse ?? engine.fuse(venue);
  const staffPart = liveFuse.parts.find((p: any) => p.source === 'staff');
  /* Bumped after a successful send so the counters below reflect it. The mock got this for
     free because the engine mutated in place and the demo clock re-rendered; over HTTP the
     refetch has to be asked for. */
  const [sent, setSent] = useState(0);
  const { data: statsData } = useAsync(() => staffToday(venueId), [venueId, sent]);
  const stats = statsData ?? EMPTY_STAFF_TODAY;

  const handleSend = useCallback(() => {
    if (!band) {
      toast('Pick a state first — one tap, then send.', 'alert');
      return;
    }
    /* Ask where the tablet is before reporting. A console that cannot prove it is in the
       restaurant gets a 409 and the server says so — which is the geofence working, not the
       app failing, and the message below says which. */
    currentPosition()
      .then(where => staffSend(venueId, band, wait, where))
      .then(
      result => {
        if (!result.ok) return;
        setSent(n => n + 1);
        toast(
          <>
            Sent. {stats.venueName || venue?.name || 'Venue'} confidence is now{' '}
            <b>{Math.round(result.confidence * 100)}%</b> and the staff signal carries{' '}
            <b>{Math.round(result.staffWeight * 100)}%</b> of the estimate.
          </>,
          'store',
        );
      },
      (err: Error) => {
        /* A 409 is the geofence declining a tap sent from outside the restaurant. The server
           writes a full sentence for it, and prefixing that with "Could not send" frames a
           working rule as a broken app. Anything else — no signal, a dead token — genuinely
           did fail, and a tablet whose taps vanish silently is the one failure this console
           cannot afford. */
        const geofenced = err.message.includes('409');
        const detail = err.message.replace(/^.*?→ \d+:\s*/, '');
        toast(geofenced ? detail : 'Could not send: ' + detail, 'alert');
      },
    );
  }, [band, wait, venueId, venue, stats.venueName, toast]);

  if (!venue) return <div className="app__scroll scroll"><div className="staff">Venue not found.</div></div>;

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">{t('staff.title')}</h1>
      <div className="staff">
        <div className="staff__h">
          <div>
            <div className="staff__v">{stats.venueName || venue.name}</div>
            <div className="staff__a">{(stats.venueArea || venue.area)} · staff console</div>
          </div>
          <div className="staff__sync">
            <span className="livedot" style={{ '--sig': 'var(--jade)' } as React.CSSProperties} />
            {staffPart ? 'Last update ' + ago(staffPart.age) : 'No update yet today'}
          </div>
        </div>

        <div>
          <Label style={{ marginBottom: 11 }}>{t('staff.howFull')}</Label>
          <div className="bigbtns" role="group" aria-label="Current state">
            {BANDS.map(([key, label]) => (
              <button
                key={key}
                className={'bigbtn s-' + key}
                aria-pressed={band === key}
                type="button"
                onClick={() => setBand(key)}
              >
                <span className="bigbtn__d" />
                <span className="bigbtn__l">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label style={{ marginBottom: 11 }}>{t('staff.waitFor')}</Label>
          <div className="stepper">
            <button className="stepper__b" type="button" aria-label="Decrease wait" onClick={() => setWait(w => Math.max(0, w - 5))}>
              <Icon name="minus" />
            </button>
            <div className="stepper__v">
              <div className="stepper__n">{wait}</div>
              <Label style={{ marginTop: 3 }}>minutes</Label>
            </div>
            <button className="stepper__b" type="button" aria-label="Increase wait" onClick={() => setWait(w => Math.min(90, w + 5))}>
              <Icon name="plus" />
            </button>
          </div>
        </div>

        <button
          className="btn btn--primary btn--full"
          style={{ minHeight: 56, fontSize: 16 }}
          type="button"
          onClick={handleSend}
        >
          {t('staff.send')}{band ? ' — ' + t(('band.' + band) as TranslationKey) + ', ' + wait + ' ' + t('common.min') : ''}
        </button>

        <div className="rule--tick" />

        <div>
          <Label style={{ marginBottom: 11 }}>{t('staff.today')}</Label>
          {/* A dash where the data does not exist. Covers, idle seats and revenue all need
              a capacity figure, and no scraped venue publishes one — rendering 0 would be a
              claim about an empty restaurant rather than an admission of an unknown. */}
          <div className="staffstats">
            <div className="ss">
              <div className="ss__v">{stats.coversToday ?? '—'}</div>
              <div className="ss__l">covers today</div>
              <div className="ss__d">
                {stats.coversToday == null ? 'capacity not on record' : ''}
              </div>
            </div>
            <div className="ss">
              <div className="ss__v">{Math.round(stats.utilisation * 100)}%</div>
              <div className="ss__l">utilisation right now</div>
              <div className="ss__d">
                {Math.round(stats.weeklyMean * 100)}% weekly mean
              </div>
            </div>
            <div className="ss">
              <div className="ss__v">{stats.staffTapsToday}</div>
              <div className="ss__l">taps from this console today</div>
              <div className="ss__d">{stats.guestsSent == null ? 'referrals on the partner view' : ''}</div>
            </div>
          </div>
        </div>

        <div className="staffhook">
          <b>Why a tired host at 9pm keeps tapping this.</b> The analytics above are free and genuinely useful,
          and &ldquo;we sent you {stats.guestsSent} guests today&rdquo; is a number no other channel gives them.
          That is the whole cold-start strategy — and it is why the staff signal decays out of the estimate if they stop.
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Open this page in a second window (or on a phone at the same address) and tap a state —
          the diner surface updates within a frame, and the staff weight in the fusion jumps. That is the live moment.
        </p>
      </div>
    </div>
  );
}
