'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import { submitConstraint, solveGroupFor, exchangeGroupInvite } from '@/lib/api';
import { rs } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useI18n } from '@/lib/i18n';

const DEMO_MEMBER = 'bilal';

const MOODS = [['spicy', 'Spicy'], ['bbq', 'BBQ'], ['quiet', 'Quiet'], ['anything', 'Anything']] as const;
const DIETS = [['nut-allergy', 'Nuts'], ['no-beef', 'Beef'], ['vegetarian', 'Meat']] as const;

export default function Page() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const groupId = (params?.groupId as string) || '';

  /* The `?t=` on an invite link is redeemed once, for a guest session scoped to this group
     and this member's slot. Redeeming it here rather than on a separate landing page means
     the link a person was sent opens the form they were asked to fill in — which is the
     whole point of sending them a link. */
  const invite = search?.get('t') ?? null;
  const redeemed = useRef<string | null>(null);
  const [joining, setJoining] = useState(Boolean(invite));
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!invite || redeemed.current === invite) return;
    redeemed.current = invite;
    exchangeGroupInvite(groupId, invite)
      .then(r => {
        setJoining(false);
        if (!r) setJoinError('This invite has expired or has already been used.');
        else router.replace(`/g/${groupId}/me`);
      })
      .catch((err: Error) => {
        setJoining(false);
        setJoinError(err.message);
      });
  }, [invite, groupId, router]);
  useClock();
  const { t } = useI18n();

  const [budget, setBudget] = useState(2400);
  const [maxTravel, setMaxTravel] = useState(25);
  const [mood, setMood] = useState('spicy');
  const [diet, setDiet] = useState<string[]>([]);

  const toggleDiet = useCallback((d: string) => {
    setDiet(prev => prev.indexOf(d) >= 0 ? prev.filter(x => x !== d) : [...prev, d]);
  }, []);

  /* Await the submit before navigating. The solved page reads the solution, and against a
     real API navigating first is a race it loses often enough to matter. The solve itself is
     not awaited: the solved page asks for it again on arrival, and blocking the button on a
     second round trip buys nothing. */
  const handleSolve = useCallback(async () => {
    await submitConstraint(groupId, DEMO_MEMBER, { budget, maxTravel, mood, diet });
    void solveGroupFor(groupId, DEMO_MEMBER);
    router.push('/g/' + groupId + '/solved');
  }, [budget, maxTravel, mood, diet, groupId, router]);

  if (joining || joinError) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href={'/g/' + groupId} className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ahead__t">{joining ? 'Joining…' : 'Invite not valid'}</div>
            <div className="ahead__s">
              {joining ? 'Redeeming your invite.' : joinError}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">{t('group.mine')}</h1>
      <div className="ahead">
        <Link href={'/g/' + groupId} className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{t('group.mine')}</div>
          <div className="ahead__s">{t('group.private')}</div>
        </div>
      </div>

      <div className="ask">
        <div className="privbox">
          <div className="privbox__h">
            <Icon name="lock" />
            <span>{t('group.onlyYou')}</span>
          </div>
          <div className="privbox__b">
            <div className="field">
              <div className="field__l">
                <span className="field__ll">{t('group.budget')}</span>
                <span className="field__v">{rs(budget)}</span>
              </div>
              <input type="range" min={500} max={6000} step={100} value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                aria-label="Maximum spend per person" />
            </div>
            <div className="field">
              <div className="field__l">
                <span className="field__ll">{t('group.travel')}</span>
                <span className="field__v">{maxTravel} {t('common.min')}</span>
              </div>
              <input type="range" min={5} max={60} step={5} value={maxTravel}
                onChange={e => setMaxTravel(Number(e.target.value))}
                aria-label="Maximum travel minutes" />
            </div>
            <div className="field">
              <div className="field__l"><span className="field__ll">{t('group.mood')}</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {MOODS.map(([val, label]) => (
                  <button key={val} type="button" className="chip"
                    aria-pressed={mood === val}
                    onClick={() => setMood(val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field__l"><span className="field__ll">{t('group.diet')}</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {DIETS.map(([val, label]) => (
                  <button key={val} type="button" className="chip"
                    aria-pressed={diet.indexOf(val) >= 0}
                    onClick={() => toggleDiet(val)}>
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.45 }}>
                Allergies are enforced as a filter in the query, never as a preference weight the optimiser can trade away.
              </p>
            </div>
          </div>
          <div className="privbox__foot">
            <Icon name="shield" />
            <span>Submitted encrypted. The solver reads it; no other member — and no group creator — ever receives it back.</span>
          </div>
        </div>
        <button className="btn btn--primary btn--full" type="button" style={{ marginTop: 'var(--sp-4)' }} onClick={handleSolve}>
          Submit &amp; solve for 6
        </button>
      </div>
    </div>
  );
}
