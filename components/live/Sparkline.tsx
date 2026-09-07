import type { HistoryPoint } from '@/lib/hz/types';

interface Props {
  history: HistoryPoint[];
  w?: number;
  h?: number;
  stroke?: string;
  fill?: string;
  rule?: string;
}

export function Sparkline({ history, w = 150, h = 40, stroke = '#62BEE2', fill = 'rgba(98,190,226,.11)', rule = '#332E21' }: Props) {
  const pad = 2;
  if (!history || history.length < 2) return null;
  const xs = history.map(p => p.t), ys = history.map(p => p.x);
  void ys;
  const t0 = Math.min(...xs), t1 = Math.max(...xs);
  const span = Math.max(t1 - t0, 1);
  const X = (t: number) => pad + ((t - t0) / span) * (w - pad * 2);
  const Y = (v: number) => h - pad - v * (h - pad * 2);
  let d = '';
  history.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.x).toFixed(1); });
  const area = d + 'L' + X(t1).toFixed(1) + ' ' + (h - pad) + 'L' + X(t0).toFixed(1) + ' ' + (h - pad) + 'Z';
  const last = history[history.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      {/* 50% / 80% reference rules — the bands the state labels are cut on */}
      <line x1={0} x2={w} y1={Y(0.8).toFixed(1)} y2={Y(0.8).toFixed(1)} stroke={rule} strokeWidth={1} strokeDasharray="2 3" />
      <line x1={0} x2={w} y1={Y(0.5).toFixed(1)} y2={Y(0.5).toFixed(1)} stroke={rule} strokeWidth={1} strokeDasharray="2 3" />
      <path d={area} fill={fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(last.t).toFixed(1)} cy={Y(last.x).toFixed(1)} r={2.4} fill={stroke} />
    </svg>
  );
}
