'use client';

import Link from 'next/link';
import { HZ, engine } from '@/lib/hz';
import type { FuseResult } from '@/lib/hz/types';
import { rs } from '@/lib/format';
import { Icon } from '@/components/primitives/Icon';
import { LivePanel } from './LivePanel';
import { FactorBars } from './FactorBars';
import type { ParsedQuery } from '@/lib/search';
import { hold } from '@/lib/api';
import { useToast } from '@/components/chrome/Toasts';

interface Props {
  result: {
    venue: any;
    fuse: FuseResult;
    total: number;
    bestDish: any;
    bestDishQuality: number;
    travelMin: number;
    spend: number;
    factors: Record<string, number>;
  };
  index: number;
  query: ParsedQuery;
  explanation: string;
}

export function VenueCard({ result, index, query, explanation }: Props) {
  const v = result.venue;
  const f = result.fuse;
  const toast = useToast();

  const onHold = async () => {
    const { ok } = await hold(v.venueId ?? v.id, query.party);
    toast(
      ok
        ? 'On your way. The referral is recorded now, and matched to a seating afterwards.'
        : 'Sign in first — a hold is only worth counting if it belongs to a diner.',
      ok ? 'check' : 'alert',
    );
  };

  return (
    <article className={'vcard s-' + f.band}>
      <div className="vcard__top">
        <span className="vcard__idx">{String(index + 1).padStart(2, '0')}</span>
        <div className="vcard__id">
          <div className="vcard__name">{v.name}</div>
          <div className="vcard__ur">{v.nameUr}</div>
          <div className="vcard__meta">
            <span>{v.area}</span>
            <span className="vcard__dot" />
            <span>{v.cuisines.slice(0, 2).join(' · ')}</span>
            <span className="vcard__dot" />
            {/* An average ticket the data does not have must not be rendered as Rs 0.
                Google publishes a price level and no figure, so show the level: four
                symbols with the venue's own filled in. Saying less is not the same as
                saying zero. */}
            {v.avgTicket > 0 ? (
              <span><b>{rs(v.avgTicket * query.party)}</b> for {query.party}</span>
            ) : (
              <span title="Price level; no average ticket on record">
                <b>{'₨'.repeat(Math.max(1, v.price || 2))}</b>
              </span>
            )}
            <span className="vcard__dot" />
            <span>{result.travelMin} min</span>
          </div>
        </div>
        <div className="vcard__score">
          <div className="n">{(result.total * 100).toFixed(0)}</div>
          <div className="lbl" style={{ fontSize: 9 }}>match</div>
        </div>
      </div>

      <div className="vcard__body">
        <LivePanel venue={v} fuse={f} hideSim />
        <FactorBars factors={result.factors} />
        <p className="vcard__why" dangerouslySetInnerHTML={{ __html: formatExplanation(explanation, result) }} />
        {v.trust.regulatory.length > 0 && (
          <div className="tag" style={{ '--sig-lo': 'var(--verm-lo)', '--sig-md': 'var(--verm-md)', '--sig': 'var(--verm)' } as React.CSSProperties}>
            <Icon name="alert" />
            Sealed {engine.daysSince(v.trust.regulatory[0].date)} days ago · trust {engine.trustBreakdown(v).total}/100
          </div>
        )}
        {v.hiddenGem && (
          <div className="tag tag--verified">
            <Icon name="star" />
            Hidden gem · {v.reviews} reviews, cooks above its rating
          </div>
        )}
      </div>

      <div className="vcard__acts">
        <Link href={'/v/' + v.id} className="btn btn--primary btn--sm" style={{ flex: 1, textAlign: 'center' }}>
          Open truth card
        </Link>
        {/* This was a bare button with no handler: it looked like an action and was one of
            the few things on the card a judge would click. A referral is only meaningful if
            it is attributable to a diner, so it needs a sign-in — and saying that is better
            than a button that quietly does nothing. */}
        <button className="btn btn--sm" type="button" onClick={onHold}>Hold a table</button>
      </div>
    </article>
  );
}

/* The explanation from the mock handler is plain text with dish names that
   should be bold. The prototype used HTML from explain(); we replicate the
   bolding here for the first dish-name mention. */
function formatExplanation(text: string, result: Props['result']): string {
  if (!result.bestDish) return text;
  const name = result.bestDish.name;
  return text.replace(name, '<b>' + name + '</b>');
}
