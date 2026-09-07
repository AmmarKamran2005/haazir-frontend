'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { groupStatus } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';

export default function Page() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <GroupLobby />
    </Suspense>
  );
}

function GroupLobby() {
  const params = useParams();
  const groupId = (params?.groupId as string) || '';
  useClock();
  const { data } = useAsync(() => groupStatus(groupId), [groupId]);
  /* The lobby is a waiting room: rendering it empty for one frame is right, and
     is what it already looked like before anybody had responded. */
  const status = data ?? { title: '', responded: 0, total: 0, members: [] };
  const toast = useToast();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const url = typeof window !== 'undefined'
      ? window.location.origin + '/g/' + groupId + '/me'
      : '/g/' + groupId + '/me';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast(
        'Link copied. Members open it in WhatsApp — no install, no account. That is the only flow a six-person group ever finishes.',
        'link',
      );
    });
  }, [groupId, toast]);

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">{t('group.lobby')}</h1>
      <div className="ahead">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{status.title}</div>
          <div className="ahead__s">
            {status.responded} of {status.total} responded · nobody can see anyone&apos;s inputs
          </div>
        </div>
      </div>

      <div className="ask">
        <div className="gmembers">
          {status.members.map(m => (
            <div key={m.id} className={'gm' + (m.responded ? ' gm--in' : '')}>
              <div className="gm__av">{m.name[0]}</div>
              <div className="gm__n">{m.name}</div>
              <div className="gm__s">{m.responded ? 'submitted' : 'waiting'}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'var(--sp-4)', padding: 13, border: '1px solid var(--rule)', borderRadius: 'var(--r-sm)', background: 'var(--sunk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <Icon name="lock" />
            <Label>{t('group.dignity')}</Label>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
            Saying <i>&quot;main sirf 1,200 kharch kar sakta hoon&quot;</i> in front of five friends is humiliating.
            So no member&apos;s budget is ever returned to any other member — <b>including the person who created the group.</b>
            It is enforced at the row level, not by a UI that merely hides it.
          </p>
        </div>

        <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 8 }}>
          <Link href={'/g/' + groupId + '/me'} className="btn btn--primary" style={{ flex: 1, textAlign: 'center' }}>
            {t('group.enterMine')}
          </Link>
          <button className="btn" type="button" onClick={handleCopyLink}>
            {copied ? t('common.copied') : t('common.copyLink')}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 9, lineHeight: 1.45 }}>
          Members open a WhatsApp link — no install, no account. That is the only way a six-person Karachi group ever completes a flow.
        </p>
      </div>
    </div>
  );
}
