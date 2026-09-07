import { engine } from '@/lib/hz';

const W = 320, H = 108, L = 22, R = 6, T = 8, B = 20;
const PW = W - L - R, PH = H - T - B;
const X = (hr: number) => L + (hr / 24) * PW;
const Y = (q: number) => T + (1 - (q - 4) / 6) * PH;

export function DishChart({ dish, nowHour }: { dish: any; nowHour: number }) {
  let path = '';
  let soldFrom: number | null = null;
  let started = false;

  for (let hr = 0; hr <= 24; hr += 0.5) {
    const q = engine.dishQualityAt(dish, hr % 24);
    if (q === null) {
      if (soldFrom === null) soldFrom = hr;
      continue;
    }
    path += (started ? 'L' : 'M') + X(hr).toFixed(1) + ' ' + Y(q).toFixed(1);
    started = true;
  }

  const pa = dish.peak[0];
  const pb = Math.min(dish.peak[1], 24);
  const nowQ = engine.dishQualityAt(dish, nowHour);

  const xTicks = [0, 6, 12, 18, 24].map(hr => {
    const lbl = hr === 0 || hr === 24 ? '12a' : hr === 12 ? '12p' : hr < 12 ? hr + 'a' : (hr - 12) + 'p';
    return { hr, lbl };
  });
  const yTicks = [5, 7, 9];

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" role="img"
      aria-label={dish.name + ' quality by hour. Peak ' + engine.dishBestWindow(dish) +
        '. Right now it scores ' + (nowQ === null ? 'not available, sold out' : nowQ.toFixed(1)) + ' out of 10.'}>
      <defs>
        <pattern id={'hatch-' + dish.id} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--rule-strong)" strokeWidth="1.4" />
        </pattern>
      </defs>

      <rect x={X(pa)} y={T} width={X(pb) - X(pa)} height={PH} fill="var(--jade-lo)" />
      {soldFrom !== null && (
        <rect x={X(soldFrom)} y={T} width={X(24) - X(soldFrom)} height={PH} fill={'url(#hatch-' + dish.id + ')'} />
      )}

      {yTicks.map(q => (
        <g key={q}>
          <line x1={L} x2={L + PW} y1={Y(q)} y2={Y(q)} stroke="var(--rule)" strokeWidth="1" strokeDasharray="1 4" />
          <text x={L - 5} y={Y(q) + 3} fontSize="8.5" fill="var(--ink-4)" textAnchor="end" fontFamily="var(--mono)">{q}</text>
        </g>
      ))}

      {xTicks.map(({ hr, lbl }) => (
        <g key={hr}>
          <line x1={X(hr)} x2={X(hr)} y1={T + PH} y2={T + PH + 3} stroke="var(--rule-strong)" strokeWidth="1" />
          <text x={X(hr)} y={H - 6} fontSize="8.5" fill="var(--ink-4)" textAnchor="middle" fontFamily="var(--mono)">{lbl}</text>
        </g>
      ))}

      <line x1={L} x2={L + PW} y1={T + PH} y2={T + PH} stroke="var(--rule-strong)" strokeWidth="1" />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />

      <line x1={X(nowHour)} x2={X(nowHour)} y1={T} y2={T + PH} stroke="var(--saffron)" strokeWidth="1.4" strokeDasharray="3 2" />
      {nowQ !== null && (
        <circle cx={X(nowHour)} cy={Y(nowQ)} r="3.6" fill="var(--saffron)" stroke="var(--surface)" strokeWidth="1.6" />
      )}
      <text x={X(nowHour)} y={T - 1} fontSize="8" fill="var(--saffron)" textAnchor="middle" fontWeight="700" letterSpacing=".08em">NOW</text>
    </svg>
  );
}
