import { HZ } from '@/lib/hz';

export type Surface = 'diner' | 'group' | 'staff' | 'city' | 'partner';

export function surfaceFromPath(pathname: string): Surface {
  if (pathname.startsWith('/g/') || pathname === '/g') return 'group';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/city')) return 'city';
  if (pathname.startsWith('/partner')) return 'partner';
  return 'diner';
}

/* Which venue the engine panel watches, derived from the route. */
export function focusVenueFromPath(pathname: string): string {
  const v = pathname.match(/^\/v\/([^/]+)/);
  if (v) return v[1];
  const p = pathname.match(/^\/partner\/([^/]+)/);
  if (p) return p[1];
  if (pathname.startsWith('/staff')) return 'kolachi';
  return 'kolachi';
}

export const DEMO_GROUP_ID = 'friday-dinner';

export function surfaceHref(surface: Surface): string {
  switch (surface) {
    case 'diner': return '/';
    case 'group': return `/g/${DEMO_GROUP_ID}`;
    case 'staff': return '/staff';
    case 'city': return '/city';
    case 'partner': return `/partner/${HZ.partner.venueId}`;
  }
}
