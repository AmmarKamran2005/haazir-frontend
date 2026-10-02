'use client';

/* Start a group.
 *
 * No account, deliberately: requiring a sign-up to organise dinner for six would put a login
 * between five other people and the thing they are trying to do. The API agrees — group
 * creation is the one write that takes no identity.
 *
 * What comes back is one invite link per person, once. Each link carries a token that buys a
 * guest session scoped to a single slot, so a member can write their own constraint and read
 * it back, and there is no path from it to anybody else's answer. That is the promise the
 * whole surface rests on, and it is enforced by row-level security rather than by this page
 * being careful.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createGroup, USE_REAL_API } from '@/lib/api';
import { DEMO_GROUP_ID } from '@/lib/surface';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { useToast } from '@/components/chrome/Toasts';

const BLANK = ['', '', ''];

export default function NewGroupPage() {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('Friday dinner');
  const [names, setNames] = useState<string[]>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ slot: number; link: string }[] | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  const setName = (i: number, v: string) =>
    setNames(prev => prev.map((n, k) => (k === i ? v : n)));

  const create = useCallback(async () => {
    const members = names.map(n => n.trim()).filter(Boolean);
    if (members.length < 2) {
      setError('A group needs at least two people.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const g = await createGroup(title.trim() || 'Dinner', members);
      if (!g) throw new Error('The API did not return a group.');
      setGroupId(g.group_id);
      setInvites(g.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the group.');
    } finally {
      setBusy(false);
    }
  }, [names, title]);

  return (
    <div className="app__scroll scroll">
      <div className="ahead">
        <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{invites ? 'Send these out' : 'New group'}</div>
          <div className="ahead__s">
            {invites
              ? 'One link each. Nobody sees anybody else’s answer.'
              : 'No account needed. Everyone answers privately.'}
          </div>
        </div>
      </div>

      <div className="ask">
        {!invites ? (
          <>
            <div className="sec__h"><Label>What is it</Label></div>
            <input
              className="ask__in"
              style={{ width: '100%' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Friday dinner"
            />

            <div className="sec__h" style={{ marginTop: 'var(--sp-4)' }}><Label>Who is coming</Label></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {names.map((n, i) => (
                <input
                  key={i}
                  className="ask__in"
                  style={{ width: '100%' }}
                  value={n}
                  onChange={e => setName(i, e.target.value)}
                  placeholder={`Person ${i + 1}`}
                />
              ))}
            </div>
            <button
              className="btn btn--sm"
              style={{ marginTop: 8 }}
              type="button"
              onClick={() => setNames(prev => [...prev, ''])}
              disabled={names.length >= 12}
            >
              Add another
            </button>

            <div style={{ marginTop: 'var(--sp-4)' }}>
              <button className="btn btn--primary btn--sm" onClick={create} disabled={busy}>
                {busy ? 'Creating…' : 'Create the group'}
              </button>
            </div>

            {!USE_REAL_API && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 'var(--sp-4)', lineHeight: 1.6 }}>
                This build is on the offline mock, so the links point at the seeded demo group.
                <Link href={`/g/${DEMO_GROUP_ID}`} style={{ marginLeft: 6 }}>Open it</Link>
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Send one link to each person. A link keeps working until that person has answered, and only opens
              their own slot — the organiser cannot read the answers either, only how many have come
              back.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'var(--sp-4)' }}>
              {invites.map(({ slot, link }) => {
                const who = names.map(n => n.trim()).filter(Boolean)[slot - 1] ?? `Person ${slot}`;
                const url = new URL(link, window.location.origin).toString();
                return (
                  <button
                    key={slot}
                    type="button"
                    className="btn btn--sm"
                    style={{ textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        toast(`Link for ${who} copied.`, 'check');
                      } catch {
                        // Clipboard permission is not guaranteed; the link is on screen anyway.
                        toast(url, 'card');
                      }
                    }}
                  >
                    {who} — copy link
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--sp-4)' }}>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => router.push(`/g/${groupId}`)}
              >
                Open the lobby
              </button>
              <button
                className="btn btn--sm"
                onClick={() => {
                  // The organiser is usually one of the members, so opening their own link
                  // here is the shortest path to a group that actually has answers in it.
                  const first = invites[0];
                  const url = new URL(first.link, window.location.origin);
                  router.push(url.pathname + url.search);
                }}
              >
                Answer as {names.map(n => n.trim()).filter(Boolean)[0]}
              </button>
            </div>
          </>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 13, marginTop: 'var(--sp-3)', color: 'var(--verm)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
