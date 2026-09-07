export const rs = (n: number) => 'Rs ' + Math.round(n).toLocaleString('en-PK');
export const pct = (n: number) => Math.round(n * 100) + '%';
export const mins = (n: number) => (n < 1 ? '<1' : String(Math.round(n)));
export function ago(m: number): string {
  if (m < 1) return 'just now';
  if (m < 60) return Math.round(m) + ' min ago';
  return Math.round(m / 60) + ' hr ago';
}
export type Band = 'free' | 'moderate' | 'busy' | 'full';
export const bandLabel: Record<Band, string> = { free: 'Free', moderate: 'Steady', busy: 'Busy', full: 'Full' };
export const bandVerb: Record<Band, string> = {
  free: 'seated on arrival', moderate: 'short wait', busy: 'queue forming', full: 'at capacity',
};
