'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { HZ, engine } from '@/lib/hz';
import { parseQuery } from '@/lib/search';
import { search, explain } from '@/lib/api';
import { useAsync } from '@/lib/hooks/useAsync';
import { Icon } from '@/components/primitives/Icon';
import { VenueCard } from '@/components/venue/VenueCard';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';
import type { ParsedQuery } from '@/lib/search';

const EMPTY_RESPONSE = { results: [], excluded: [], relaxed: null } as Awaited<
  ReturnType<typeof search>
>;

function ResultsInner() {
  const { bump } = useClock();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const raw = params.get('q') || HZ.suggestions[0].q;

  /* Relaxations from the frontier panel are applied on top of the parsed
     query rather than rewritten into the URL — the raw text the user typed
     stays visible in the header, which is the point of the trust moment. */
  const [relaxations, setRelaxations] = useState<Partial<ParsedQuery>>({});

  const parsed = useMemo(() => parseQuery(raw), [raw]);
  const query = useMemo(() => ({ ...parsed, ...relaxations }), [parsed, relaxations]);
  /* Against the real API this is a fetch, so the page renders once before the answer
     arrives. `empty` is what it renders with — the same shape, so nothing below has to
     ask whether the data is there yet. */
  const { data, error, loading } = useAsync(() => search(query), [query]);
  const response = data ?? EMPTY_RESPONSE;
  const top = response.results.slice(0, 6);
  const frontier = useMemo(() => engine.frontier(query, top), [query, top]);

  /* Mirrors the prototype's `relax` action: a time relaxation moves the demo
     clock (every surface moves with it); anything else merges into the query
     and re-ranks; a deal has nothing to apply and just explains itself. */
  const applyRelaxation = useCallback((f: any) => {
    if (f.apply && f.apply.skipTo != null) {
      engine.clock = f.apply.skipTo;
      bump();
      toast(<>Clock moved to <b>{engine.timeString()}</b>. Every surface moved with it.</>, 'clock');
      return;
    }
    if (f.apply) {
      setRelaxations(prev => ({ ...prev, ...f.apply }));
      toast('Constraint relaxed. Re-ranked.', 'check');
      return;
    }
    toast(f.gain, 'card');
  }, [bump, toast]);

  return (
    <>
      <h1 className="sr">{t('results.title')}</h1>
      <div className="ahead">
        <button className="ahead__back" onClick={() => router.push('/')} aria-label={t('common.back')}>
          <Icon name="arrowl" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">
            {loading
              ? t('results.searching')
              : response.results.length === 1
                ? t('results.match')
                : t('results.matches', { n: response.results.length })}
          </div>
          <div className="ahead__s">{raw}</div>
        </div>
      </div>

      <div className="app__scroll scroll">
        {/* An unreachable API is a different problem from an empty result and must not be
            rendered as one. Saying which failed is the difference between "nothing matched"
            and "the backend is down". */}
        {error && (
          <div className="relax" role="alert">
            <Icon name="alert" />
            <span>
              Could not reach the live data. {error.message}
            </span>
          </div>
        )}
        {query.extracted.length > 0 && (
          <div style={{ padding: 'var(--sp-3) var(--sp-4) 0', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {query.extracted.map((x, i) => (
              <span key={i} className="tag">{x.k}: {x.v}</span>
            ))}
          </div>
        )}

        {Object.keys(relaxations).length > 0 && (
          <div className="relaxnote" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="info" />
            <span style={{ flex: 1 }}>
              {t('results.relaxedNote')}
            </span>
            <button
              className="btn btn--sm"
              type="button"
              onClick={() => { setRelaxations({}); toast('Back to your original constraints.', 'reset'); }}
            >
              {t('common.undo')}
            </button>
          </div>
        )}

        {response.relaxed && (
          <div className="relaxnote" style={{ marginTop: 'var(--sp-3)' }}>
            <Icon name="info" />
            <span>{response.relaxed}</span>
          </div>
        )}

        <div className="vlist">
          {top.map((r, i) => (
            <VenueCard
              key={r.venue.id}
              result={r}
              index={i}
              query={query}
              explanation={explain(r, query)}
            />
          ))}
        </div>

        {frontier.length > 0 && (
          <div className="sec">
            <div className="sec__h"><span className="lbl">{t('results.missing')}</span></div>
            <p className="sec__sub">{t('results.missingSub')}</p>
            <div className="front">
              {frontier.map((f: any, i: number) => (
                <button key={i} className="front__i" type="button" onClick={() => applyRelaxation(f)}>
                  <Icon name={f.icon} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="front__l">{f.label}</span>
                    <span className="front__g">{f.gain}</span>
                  </span>
                  <Icon name="chev" />
                </button>
              ))}
            </div>
          </div>
        )}

        {response.excluded.length > 0 && (
          <div className="sec">
            <div className="sec__h"><span className="lbl">{t('results.excluded')}</span></div>
            <p className="sec__sub">
              Hard constraints — allergy, halal, prayer, accessibility — are SQL filters applied before scoring. They are never traded off against taste.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {response.excluded.slice(0, 8).map((x) => (
                <span
                  key={x.venue.id}
                  className="tag"
                  style={{ '--sig-lo': 'var(--sunk)', '--sig-md': 'var(--rule-strong)', '--sig': 'var(--ink-3)' } as React.CSSProperties}
                >
                  {x.venue.name} — {x.reasons[0]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="app__scroll scroll" />}>
      <ResultsInner />
    </Suspense>
  );
}
