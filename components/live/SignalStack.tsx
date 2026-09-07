import type { FuseResult, SourceKey } from '@/lib/hz/types';

const NAMES: Record<SourceKey, string> = { payment: 'Payment', staff: 'Staff', checkin: 'Check-ins', prior: 'Prior' };
const KEY_COLOR: Record<SourceKey, string> = {
  payment: 'var(--p-teal)', staff: 'var(--p-saf)', checkin: 'var(--p-jade)', prior: '#6A6352',
};

export function SignalStack({ fuse }: { fuse: FuseResult }) {
  return (
    <div className="sig">
      <div
        className="sig__bar"
        role="img"
        aria-label={'Sensor weights: ' + fuse.parts.map(p => NAMES[p.source] + ' ' + Math.round(p.weight * 100) + '%').join(', ')}
      >
        {fuse.parts.map(p => (
          <div key={p.source} className="sig__seg" data-src={p.source} style={{ width: (p.weight * 100).toFixed(1) + '%' }} />
        ))}
      </div>
      <div className="sig__legend">
        {fuse.parts.map(p => (
          <div key={p.source} className="sig__i">
            <span className="sig__k" style={{ background: KEY_COLOR[p.source] }} />
            {NAMES[p.source]} <span className="sig__w">{Math.round(p.weight * 100)}%</span>
            {p.source !== 'prior' && <> <span className="sig__age">{p.age < 1 ? 'now' : Math.round(p.age) + 'm'}</span></>}
          </div>
        ))}
      </div>
    </div>
  );
}
