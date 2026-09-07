import { Icon } from '@/components/primitives/Icon';

const FACT_META: Record<string, { icon: string; label: string }> = {
  prayer_area:      { icon: 'prayer',  label: 'Prayer area' },
  family_section:   { icon: 'family',  label: 'Family section' },
  wheelchair_ramp:  { icon: 'ramp',    label: 'Step-free access' },
  parking:          { icon: 'parking', label: 'Parking' },
  generator_backup: { icon: 'bolt',    label: 'Generator backup' },
  high_chairs:      { icon: 'chair',   label: 'High chairs' },
  outdoor_seating:  { icon: 'tree',    label: 'Outdoor seating' },
  noise_level:      { icon: 'volume',  label: 'Noise' },
  card_accepted:    { icon: 'card',    label: 'Card accepted' },
  iftar_service:    { icon: 'clock',   label: 'Iftar service' },
};

export function FactsGrid({ venue }: { venue: any }) {
  const keys = Object.keys(venue.facts || {});
  return (
    <div className="facts">
      {keys.map(k => {
        const f = venue.facts[k];
        const m = FACT_META[k] || { icon: 'check', label: k.replace(/_/g, ' ') };
        const yes = f.v === true || typeof f.v === 'string';
        let val = m.label;
        if (typeof f.v === 'string') val = m.label + ': ' + f.v;
        if (k === 'card_accepted' && f.v === true && f.reliability !== undefined && f.reliability < 0.8) {
          val = 'Card accepted — ' + Math.round(f.reliability * 100) + '% of the time';
        }
        if (k === 'iftar_service' && f.seating_from) val = 'Iftar seating from ' + f.seating_from;
        return (
          <div key={k} className={'fact fact--' + (yes ? 'yes' : 'no')}>
            <div className="fact__k">
              <Icon name={yes ? 'check' : 'x'} />
              <span>{val}</span>
            </div>
            <div className="fact__c">
              <span className="fact__t"><span className="fact__f" style={{ width: (f.c * 100).toFixed(0) + '%' }} /></span>
              <span className="fact__v">{Math.round(f.c * 100)}% · n={f.n || 0}</span>
            </div>
            {f.note && <div className="fact__n">{f.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
