'use client';

/* Groups: the ones this browser made or joined, and a form to start a new one.
 *
 * No account, deliberately: requiring a sign-up to organise dinner for six would put a login
 * between five other people and the thing they are trying to do. The API agrees — group
 * creation is the one write that takes no identity.
 *
 * Creating a group goes straight to its lobby. There is one link to share, the lobby's own
 * URL; each person opens it and taps their name. What they answer stays private — that is
 * enforced by row-level security, not by this page being careful.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createGroup, USE_REAL_API } from '@/lib/api';
import { DEMO_GROUP_ID } from '@/lib/surface';
import { myGroups, rememberGroup, type RememberedGroup } from '@/lib/groups';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';

const BLANK = ['', '', ''];

function ago(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  return `${Math.round(min / 60)} h ago`;
}

export default function GroupsPage() {
  const router = useRouter();
  const [title, setTitle] = useState('Friday dinner');
  const [names, setNames] = useState<string[]>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // localStorage is not visible to the server render, so the list is read after mount.
  const [mine, setMine] = useState<RememberedGroup[]>([]);
  useEffect(() => setMine(myGroups()), []);

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
      rememberGroup(g.group_id, g.title);
      router.push(`/g/${g.group_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*?→ \d+:\s*/, '') : 'Could not create the group.');
      setBusy(false);
    }
  }, [names, title, router]);

  return (
    <div className="app__scroll scroll">
      <div className="ahead">
        <Link href="/" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">Groups</div>
          <div className="ahead__s">Plan a dinner together. Everyone answers privately.</div>
        </div>
      </div>

      <div className="ask">
        {mine.length > 0 && (
          <>
            <div className="sec__h"><Label>Your groups</Label></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--sp-5)' }}>
              {mine.map(g => (
                <Link key={g.id} href={`/g/${g.id}`} className="btn btn--sm"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                  <span><b>{g.title}</b></span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{ago(g.at)} ›</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="sec__h"><Label>New group</Label></div>
        <input
          className="ask__in"
          style={{ width: '100%' }}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Friday dinner"
          aria-label="Group name"
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
              placeholder={i === 0 ? 'Your name' : `Person ${i + 1}`}
              aria-label={i === 0 ? 'Your name' : `Person ${i + 1}`}
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

        {error && (
          <div className="relax" role="alert" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginTop: 'var(--sp-4)' }}>
          <button className="btn btn--primary btn--full" onClick={create} disabled={busy}>
            {busy ? 'Creating…' : 'Create the group'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 9, lineHeight: 1.5 }}>
          You get one link to share. Each person opens it, taps their name and answers.
        </p>

        {!USE_REAL_API && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 'var(--sp-4)', lineHeight: 1.6 }}>
            This build is on the offline mock, so groups are not saved.
            <Link href={`/g/${DEMO_GROUP_ID}`} style={{ marginLeft: 6 }}>Open the demo group</Link>
          </p>
        )}
      </div>
    </div>
  );
}
