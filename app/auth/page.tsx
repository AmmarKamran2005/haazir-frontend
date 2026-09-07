'use client';

/* Sign in.
 *
 * A magic link and nothing else — no password to choose, forget, or leak, and no field on
 * this page that a stranger could fill in to learn whether an address is registered. The API
 * answers identically either way and this page repeats that silence.
 *
 * Outside production the API also returns the link itself, because there is usually no mail
 * provider configured and the alternative is asking somebody to read a server log. That is
 * the `devLink` branch below; in production it is null and the page just says to check the
 * inbox.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { requestMagicLink, USE_REAL_API } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';

type Stage = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; devLink: string | null };

export default function SignInPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setStage({ kind: 'sending' });
      setError(null);
      try {
        const r = await requestMagicLink(email.trim());
        setStage({ kind: 'sent', devLink: r.devLink });
      } catch (err) {
        setStage({ kind: 'idle' });
        // Rate limiting is the one failure worth naming: it is the only one a person can do
        // something about, by waiting.
        setError(err instanceof Error ? err.message : 'Could not send the link.');
      }
    },
    [email],
  );

  if (isAuthenticated && user) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ahead__t">Signed in</div>
            <div className="ahead__s">{user.email}</div>
          </div>
        </div>
        <div className="ask">
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            You are signed in as <b style={{ color: 'var(--ink)' }}>{user.name || user.email}</b>
            {user.role !== 'diner' && <> ({user.role})</>}. Check-ins and holds are recorded
            against this account, which is what makes them worth counting.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--sp-4)' }}>
            <button className="btn btn--primary btn--sm" onClick={() => router.push('/')}>
              Back to search
            </button>
            <button
              className="btn btn--sm"
              onClick={async () => {
                await logout();
                setStage({ kind: 'idle' });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app__scroll scroll">
      <div className="ahead">
        <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">Sign in</div>
          <div className="ahead__s">One link. No password.</div>
        </div>
      </div>

      <div className="ask">
        <form onSubmit={send}>
          <div className="sec__h"><Label>Email</Label></div>
          <input
            className="ask__in"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%' }}
          />
          <button
            className="btn btn--primary btn--sm"
            type="submit"
            disabled={stage.kind === 'sending'}
            style={{ marginTop: 'var(--sp-3)' }}
          >
            {stage.kind === 'sending' ? 'Sending…' : 'Send me a link'}
          </button>
        </form>

        {error && (
          <p role="alert" style={{ fontSize: 13, marginTop: 'var(--sp-3)', color: 'var(--verm)' }}>
            {error}
          </p>
        )}

        {stage.kind === 'sent' && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              If that address is registered, a link is on its way. It works once and expires in
              fifteen minutes.
            </p>
            {stage.devLink && (
              <>
                <div className="sec__h" style={{ marginTop: 'var(--sp-4)' }}>
                  <Label>Development</Label>
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
                  This API is not running in production, so it returned the link rather than
                  relying on a mailbox. It would be null in production.
                </p>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ marginTop: 'var(--sp-2)' }}
                  onClick={() => {
                    // Same-origin path, so route internally rather than reloading the app.
                    const url = new URL(stage.devLink as string, window.location.origin);
                    router.push(url.pathname + url.search);
                  }}
                >
                  Open the link
                </button>
              </>
            )}
          </div>
        )}

        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-3)', marginTop: 'var(--sp-5)' }}>
          Browsing never needs an account. Signing in is only for the things that have to
          belong to somebody: a check-in, a table hold, a venue you own.
          {!USE_REAL_API && ' This build is running on the offline mock, so any address works.'}
        </p>
      </div>
    </div>
  );
}
