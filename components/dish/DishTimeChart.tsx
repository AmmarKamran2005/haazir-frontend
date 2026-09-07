import { useId } from 'react';
import { engine } from '@/lib/hz';
import type { Dish } from '@/lib/hz/types';

export function DishTimeChart({ dish, nowHour }: { dish: Dish; nowHour: number }) {
  const hatchId = useId();
  const w = 320, h = 108, L = 22, R = 6, T = 8, B = 20;
  const pw = w - L - R, ph = h - T - B;
  const X = (hr: number) => L + (hr / 24) * pw;
  const Y = (q: number) => T + (1 - (q - 4) / 6) * ph;          // y-axis spans 4..10

  let path = '', soldFrom: number | null = null, started = false;
  for (let hr = 0; hr <= 24; hr += 0.5) {
    const q = engine.dishQualityAt(dish, hr % 24) as number | null;
    if (q === null) { if (soldFrom === null) soldFrom = hr; continue; }
    path += (started ? 'L' : 'M') + X(hr).toFixed(1) + ' ' + Y(q).toFixed(1);
    started = true;
  }

  const pa = dish.peak[0], pb = Math.min(dish.peak[1], 24);
  const nowQ = engine.dishQualityAt(dish, nowHour) as number | null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={
        dish.name + ' quality by hour. Peak ' + engine.dishBestWindow(dish) +
        '. Right now it scores ' + (nowQ === null ? 'not available, sold out' : nowQ.toFixed(1)) + ' out of 10.'
      }
    >
      <rect x={X(pa).toFixed(1)} y={T} width={(X(pb) - X(pa)).toFixed(1)} height={ph} fill="var(--jade-lo)" />
      {soldFrom !== null && (
        <rect x={X(soldFrom).toFixed(1)} y={T} width={(X(24) - X(soldFrom)).toFixed(1)} height={ph} fill={`url(#${hatchId})`} />
      )}
      <defs>
        <pattern id={hatchId} width={5} height={5} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={0} y2={5} stroke="var(--rule-strong)" strokeWidth={1.4} />
        </pattern>
      </defs>
      {[5, 7, 9].map(q => (
        <g key={q}>
          <line x1={L} x2={L + pw} y1={Y(q).toFixed(1)} y2={Y(q).toFixed(1)} stroke="var(--rule)" strokeWidth={1} strokeDasharray="1 4" />
          <text x={L - 5} y={(Y(q) + 3).toFixed(1)} fontSize="8.5" fill="var(--ink-4)" textAnchor="end" fontFamily="var(--mono)">{q}</text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map(hr => {
        const lbl = hr === 0 || hr === 24 ? '12a' : hr === 12 ? '12p' : hr < 12 ? hr + 'a' : (hr - 12) + 'p';
        return (
          <g key={hr}>
            <line x1={X(hr).toFixed(1)} x2={X(hr).toFixed(1)} y1={T + ph} y2={T + ph + 3} stroke="var(--rule-strong)" strokeWidth={1} />
            <text x={X(hr).toFixed(1)} y={h - 6} fontSize="8.5" fill="var(--ink-4)" textAnchor="middle" fontFamily="var(--mono)">{lbl}</text>
          </g>
        );
      })}
      <line x1={L} x2={L + pw} y1={T + ph} y2={T + ph} stroke="var(--rule-strong)" strokeWidth={1} />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
      {/* "now" marker */}
      <line x1={X(nowHour).toFixed(1)} x2={X(nowHour).toFixed(1)} y1={T} y2={T + ph} stroke="var(--saffron)" strokeWidth={1.4} strokeDasharray="3 2" />
      {nowQ !== null && (
        <circle cx={X(nowHour).toFixed(1)} cy={Y(nowQ).toFixed(1)} r={3.6} fill="var(--saffron)" stroke="var(--surface)" strokeWidth={1.6} />
      )}
      <text x={X(nowHour).toFixed(1)} y={T - 1} fontSize="8" fill="var(--saffron)" textAnchor="middle" fontWeight="700" letterSpacing=".08em">NOW</text>
    </svg>
  );
}
