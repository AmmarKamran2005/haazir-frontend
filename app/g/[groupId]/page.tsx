'use client';

/* The group lobby: the one page everybody in the group opens.
 *
 * Its URL is the only link anyone shares. Each person taps their own name, answers privately,
 * and comes back here to watch the others arrive. The organiser is just another name on the
 * list. Who has answered is public to the group; what they answered is not, and the database
 * enforces that rather than this page.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { groupStatus, groupSlot, groupToken, joinGroup, USE_REAL_API } from '@/lib/api';
import type { GroupStatusResponse } from '@/lib/api';
import { rememberGroup } from '@/lib/groups';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';

const POLL_MS = 4000;

export default function Page() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <GroupLobby />
    </Suspense>
  );
}

function GroupLobby() {
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.groupId as string) || '';
  const toast = useToast();
  const { t } = useI18n();

  const [status, setStatus] = useState<GroupStatusResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const [mySlot, setMySlot] = useState<number | null>(null);
  const [joining, setJoining] = useState<number | null>(null);

  /* Poll: this is the page the organiser watches while answers come in. */
  useEffect(() => {
    let alive = true;
    const load = () =>
      groupStatus(groupId)
        .then(s => {
          if (!alive) return;
          if (!s.total) { setMissing(true); return; }
          setMissing(false);
          setStatus(s);
          rememberGroup(groupId, s.title);
        })
        .catch(() => alive && setMissing(true));
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, [groupId]);

  useEffect(() => {
    // Only a slot this browser still holds a session for counts as "me".
    setMySlot(!USE_REAL_API || groupToken(groupId) ? groupSlot(groupId) : null);
  }, [groupId]);

  // The origin is only known in the browser; set after mount so server and client markup agree.
  const [shareUrl, setShareUrl] = useState(`/g/${groupId}`);
  useEffect(() => setShareUrl(`${window.location.origin}/g/${groupId}`), [groupId]);

  const pick = useCallback(async (slot: number) => {
    setJoining(slot);
    try {
      await joinGroup(groupId, slot);
      router.push(`/g/${groupId}/me`);
    } catch (err) {
      toast(err instanceof Error ? err.message.replace(/^.*?→ \d+:\s*/, '') : 'Could not join.', 'alert');
      setJoining(null);
    }
  }, [groupId, router, toast]);

  const switchPerson = useCallback(() => {
    try {
      window.localStorage.removeItem('hz-group-token:' + groupId);
      window.localStorage.removeItem('hz-group-slot:' + groupId);
    } catch { /* nothing stored */ }
    setMySlot(null);
  }, [groupId]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast('Group link copied. Send it on WhatsApp — everyone taps their own name.', 'link'))
      .catch(() => toast(shareUrl, 'link'));
  }, [shareUrl, toast]);

  if (missing) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href="/g" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ahead__t">Group not found</div>
            <div className="ahead__s">It may have expired — groups last 36 hours.</div>
          </div>
        </div>
        <div className="ask">
          <Link href="/g" className="btn btn--primary btn--full">Create a new group</Link>
        </div>
      </div>
    );
  }

  const s = status ?? { title: '', responded: 0, total: 0, members: [] };
  const waText = encodeURIComponent(`${s.title || 'Dinner'} — open this, tap your name and answer: ${shareUrl}`);

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">{t('group.lobby')}</h1>
      <div className="ahead">
        <Link href="/g" className="ahead__back" aria-label="Back to groups"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{s.title || 'Loading…'}</div>
          <div className="ahead__s">
            {s.responded} of {s.total} answered · nobody sees anybody&apos;s answers
          </div>
        </div>
      </div>

      <div className="ask">
        <div className="sec__h"><Label>{mySlot ? 'Who is coming' : 'Tap your name to answer'}</Label></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {s.members.map(m => {
            const slot = Number(m.id);
            const me = mySlot === slot;
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)',
                background: me ? 'var(--sunk)' : 'transparent',
              }}>
                <div className="gm__av" style={{ flex: '0 0 auto' }}>{m.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}{me && <span style={{ color: 'var(--jade)', fontWeight: 500 }}> · you</span>}</div>
                  <div style={{ fontSize: 11.5, color: m.responded ? 'var(--jade)' : 'var(--ink-3)' }}>
                    {m.responded ? '✓ answered' : 'waiting'}
                  </div>
                </div>
                {me ? (
                  <Link href={`/g/${groupId}/me`} className="btn btn--sm btn--primary">
                    {m.responded ? 'Edit' : 'Answer'}
                  </Link>
                ) : !mySlot && !m.responded ? (
                  <button type="button" className="btn btn--sm" disabled={joining !== null}
                    onClick={() => pick(slot)}>
                    {joining === slot ? 'Opening…' : 'That’s me'}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {mySlot && (
          <button type="button" onClick={switchPerson}
            style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 0, padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>
            Not you? Pick another name
          </button>
        )}

        <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 8 }}>
          <button className="btn" type="button" style={{ flex: 1 }} onClick={copy}>
            <Icon name="link" /> Copy group link
          </button>
          <a className="btn" style={{ flex: 1, textAlign: 'center' }}
            href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </div>

        <Link href={`/g/${groupId}/solved`}
          className={'btn btn--full' + (s.responded >= 2 ? ' btn--primary' : '')}
          aria-disabled={s.responded < 2}
          onClick={e => { if (s.responded < 2) { e.preventDefault(); toast('The answer needs at least two people to have answered.', 'clock'); } }}
          style={{ marginTop: 8, opacity: s.responded >= 2 ? 1 : 0.55 }}>
          See where we should go
        </Link>

        <div style={{ marginTop: 'var(--sp-4)', padding: 12, border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', background: 'var(--sunk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="lock" />
            <Label>{t('group.dignity')}</Label>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
            Nobody&apos;s budget is shown to anyone else — <b>including the person who made the group.</b>{' '}
            The answer suits the least happy person, not the average.
          </p>
        </div>
      </div>
    </div>
  );
}
