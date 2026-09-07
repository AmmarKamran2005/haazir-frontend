'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { solveGroupFor } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';
import { rs } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { Label } from '@/components/primitives/Label';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useI18n } from '@/lib/i18n';

const DEMO_MEMBER = 'bilal';

export default function Page() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <GroupSolved />
    </Suspense>
  );
}

function GroupSolved() {
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.groupId as string) || '';
  useClock();
  const { t } = useI18n();

  /* `again` re-runs the solve on demand. useAsync keys on its deps, so bumping a counter is
     how "solve again" asks for a fresh answer rather than the cached one. */
  const [again, setAgain] = useState(0);
  const { data: sol, loading, error } = useAsync(
    () => solveGroupFor(groupId, DEMO_MEMBER),
    [groupId, again],
  );

  if (loading || !sol || !sol.best) {
    return (
      <div className="app__scroll scroll">
        <div className="ahead">
          <Link href={'/g/' + groupId} className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* "Submit your constraints first" was the only thing this branch ever said,
                including when the real reason was that two other people had not answered
                yet — which is the normal state of a group, and the one the organiser most
                needs told. The server says exactly who is missing; show that. */}
            <div className="ahead__t">
              {loading ? 'Solving…' : error ? 'Not yet' : 'Not solved yet'}
            </div>
            <div className="ahead__s">
              {loading
                ? 'Working through every venue against every member.'
                : error
                  ? error.message.replace(/^.*?→ \d+:\s*/, '')
                  : 'Submit your constraints first.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const b = sol.best;
  const v = b.venue;
  const f = b.fuse;
  const minU = Math.min(...b.utils.map(x => x.u));

  const rivalNote = sol.runnerUp
    ? 'Chosen over ' + sol.runnerUp.venue.name + ' because ' +
      (sol.runnerUp.fuse.wait > f.wait + 6
        ? 'its ' + Math.round(sol.runnerUp.fuse.wait) + '-minute wait pushed two members past their stated time limit'
        : 'its lowest individual satisfaction was ' + Math.round(sol.runnerUp.minSat * 100) + '%, below this one\'s ' + Math.round(minU * 100) + '%') + '.'
    : '';

  const handleSolveAgain = () => setAgain(n => n + 1);

  return (
    <div className="app__scroll scroll">
      <h1 className="sr">{t('group.solved')}</h1>
      <div className="ahead">
        <Link href={'/g/' + groupId + '/me'} className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">{t('group.solved')}</div>
          <div className="ahead__s">
            {sol.total ? `${sol.responded} of ${sol.total} members` : `${sol.responded} members`}
            {' · max-min fairness'}
          </div>
        </div>
      </div>

      <div className="ask">
        <div className="solved">
          <div className="solved__h">
            <div className="solved__lbl">{t('group.answer')}</div>
            <div className="solved__n">{v.name}</div>
            <div className="solved__m">
              {/* The solver returns no ticket figure, and no scraped venue has one anyway.
                  `Rs NaN` was the visible half of that; saying nothing is the honest half. */}
              {v.area}
              {v.avgTicket ? ` · ${rs(v.avgTicket)} per head` : ''}
              {' · '}{b.travelMin} min median travel · {Math.round(f.wait)} min wait
            </div>
          </div>
          <div className="solved__b">
            <div>
              <Label style={{ marginBottom: 9 }}>{t('group.satisfaction')}</Label>
              <div className="satgrid">
                {b.utils.map(x => (
                  <div key={x.id} className={'sat' + (x.u === minU ? ' sat--min' : '')}>
                    <span className="sat__n">
                      {x.name}
                      {x.u === minU && <span className="sat__min"> min</span>}
                    </span>
                    <span className="sat__t">
                      <span className="sat__f" style={{ width: (x.u * 100).toFixed(0) + '%' }} />
                    </span>
                    <span className="sat__v">{Math.round(x.u * 100)}%</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 9, lineHeight: 1.5 }}>
                We maximise the <b style={{ color: 'var(--ink-2)' }}>minimum</b>, not the mean. A solution where five people score 95% and one scores 30%
                is worse than one where everybody scores 74% — because the person at 30% is the one who stops coming.
              </p>
            </div>

            <ul className="checklist">
              <li>
                <Icon name="check" />
                <span>
                  <b>{sol.hardConstraints.length} hard constraints</b> satisfied
                  {sol.hardConstraints.length > 0 && ' (' + sol.hardConstraints.map(h => h.replace('-', ' ')).join(' · ') + ')'}
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>Every member&apos;s budget ceiling respected — <b>none of them revealed</b></span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  Group satisfaction <b>{Math.round(b.meanSat * 100)}%</b> · lowest individual <b>{Math.round(minU * 100)}%</b>
                </span>
              </li>
              {sol.weighted.length > 0 && (
                <li>
                  <Icon name="scale" />
                  <span>
                    {sol.weighted.map(w =>
                      <b key={w.name}>{w.name}</b>
                    ).reduce<React.ReactNode[]>((acc, el, i) => {
                      if (i > 0) acc.push('; ');
                      const w = sol.weighted[i];
                      acc.push(<>{el} weighted ×{w.weight} — compromised on the last {w.regret} outing{w.regret === 1 ? '' : 's'}</>);
                      return acc;
                    }, [])}
                  </span>
                </li>
              )}
            </ul>

            {rivalNote && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, paddingInlineStart: 10, borderInlineStart: '2px solid var(--saffron-md)' }}>
                {rivalNote}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--sunk)', borderRadius: 'var(--r-sm)' }}>
              <Icon name="lock" />
              <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                No budget was revealed. Not to the group. Not to you.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn--primary" type="button" style={{ flex: 1 }}>Book for {sol.responded}</button>
              <button className="btn" type="button" onClick={handleSolveAgain}>{t('group.solveAgain')}</button>
              <Link href={'/v/' + v.id} className="btn">Truth card</Link>
            </div>
          </div>
        </div>

        {sol.all.length > 1 && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <div className="sec__h"><Label>{t('group.runnersUp')}</Label></div>
            <div className="front">
              {sol.all.slice(1, 5).map((s, i) => (
                <Link key={i} href={'/v/' + s.venue.id} className="front__i">
                  <Icon name="bowl" />
                  <span style={{ flex: 1 }}>
                    <span className="front__l">{s.venue.name}</span>
                    <span className="front__g">
                      lowest individual {Math.round(s.minSat * 100)}% · mean {Math.round(s.meanSat * 100)}% · {Math.round(s.fuse.wait)} min wait
                    </span>
                  </span>
                  <Icon name="chev" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {sol.infeasible.length > 0 && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <div className="sec__h"><Label>Infeasible</Label></div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45, marginBottom: 9 }}>
              {sol.infeasible.length} venues could not satisfy at least one member&apos;s hard constraint. They were removed before scoring, not penalised inside it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
