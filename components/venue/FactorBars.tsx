const KEYS: [string, string][] = [
  ['palate', 'Taste'], ['live', 'Live'], ['value', 'Value'], ['trust', 'Trust'], ['travel', 'Near'],
];

interface Props {
  factors: Record<string, number>;
}

export function FactorBars({ factors }: Props) {
  let best = -1;
  let topKey = '';
  for (const [k] of KEYS) {
    if (factors[k] > best) { best = factors[k]; topKey = k; }
  }

  return (
    <div className="factors">
      {KEYS.map(([k, label]) => (
        <div key={k} className={'factor' + (k === topKey ? ' factor--top' : '')}>
          <div className="factor__l">{label}</div>
          <div className="factor__t">
            <div className="factor__f" style={{ width: (factors[k] * 100).toFixed(0) + '%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
