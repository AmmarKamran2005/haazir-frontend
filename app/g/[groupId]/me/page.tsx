'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  submitConstraint, exchangeGroupInvite, groupStatus, groupToken, groupSlot, myGroupConstraint,
  USE_REAL_API,
} from '@/lib/api';
import { rememberGroup } from '@/lib/groups';
import { useToast } from '@/components/chrome/Toasts';
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

  /* Old per-person invite links (`?t=`) still work: redeem, then show the form. If one is
     spent or broken, the lobby is where to go — pick your name there. */
  const invite = search?.get('t') ?? null;
  const redeemed = useRef<string | null>(null);
  const [joining, setJoining] = useState(Boolean(invite));
  useClock();
  const { t } = useI18n();
  const toast = useToast();

  useEffect(() => {
    if (!invite || redeemed.current === invite) return;
    redeemed.current = invite;
    const toForm = () => { setJoining(false); router.replace(`/g/${groupId}/me`); };
    const toLobby = () => {
      toast('That link was already used. Tap your name in the group instead.', 'link');
      router.replace(`/g/${groupId}`);
    };
    exchangeGroupInvite(groupId, invite)
      .then(r => (r || groupToken(groupId) ? toForm() : toLobby()))
      .catch(() => (groupToken(groupId) ? toForm() : toLobby()));
  }, [invite, groupId, router, toast]);

  const [budget, setBudget] = useState(2400);
  const [maxTravel, setMaxTravel] = useState(25);
  const [mood, setMood] = useState('spicy');
  const [diet, setDiet] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState<string>('');

  /* No session for this group in this browser: the lobby is where you say who you are. */
  useEffect(() => {
    if (joining) return;
    if (USE_REAL_API && !groupToken(groupId)) {
      router.replace(`/g/${groupId}`);
      return;
    }
    const slot = groupSlot(groupId);
    groupStatus(groupId)
      .then(s => {
        rememberGroup(groupId, s.title);
        const m = s.members.find(x => Number(x.id) === slot);
        if (m) setWho(m.name);
      })
      .catch(() => undefined);
    // Editing: start from what you said last time.
    myGroupConstraint(groupId)
      .then(c => {
        if (!c) return;
        setBudget(c.budget ?? 2400);
        setMaxTravel(c.maxTravel ?? 25);
        setMood(c.mood ?? 'anything');
        setDiet(c.diet ?? []);
      })
      .catch(() => undefined);
  }, [groupId, joining, router]);

  const toggleDiet = useCallback((d: string) => {
    setDiet(prev => prev.indexOf(d) >= 0 ? prev.filter(x => x !== d) : [...prev, d]);
  }, []);

  /* Save, then go back to the group: that is where everyone's progress and the result are. */
  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitConstraint(groupId, DEMO_MEMBER, { budget, maxTravel, mood, diet });
    } catch (err) {
      const msg = (err as { status?: number })?.status === 401
        ? 'Your session for this group has ended. Go back to the group and tap your name again.'
        : err instanceof Error ? err.message.replace(/^.*?→ \d+:\s*/, '') : 'Could not save your answer.';
      setError(msg);
      toast(msg, 'alert');
      setBusy(false);
      return;
    }
    toast('Saved. Only you can see what you answered.', 'check');
    router.push(`/g/${groupId}`);
  }, [busy, budget, maxTravel, mood, diet, groupId, router, toast]);

  if (joining) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href={'/g/' + groupId} className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ahead__t">Opening…</div>
            <div className="ahead__s">Getting your answer sheet.</div>
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
          <div className="ahead__t">{who ? `Your answer, ${who}` : t('group.mine')}</div>
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
        {error && (
          <div className="relax" role="alert" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        <button className="btn btn--primary btn--full" type="button" disabled={busy}
          style={{ marginTop: 'var(--sp-4)' }} onClick={handleSave}>
          {busy ? 'Saving…' : 'Save my answer'}
        </button>
      </div>
    </div>
  );
}
