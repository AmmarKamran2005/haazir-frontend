import { HZ } from '@/lib/hz';
import { USE_REAL_API } from '@/lib/api/config';

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

/* `friday-dinner` is a group that exists only inside the offline mock. Against the real API
   it is not a UUID and not a group, so pointing the Group tab at it landed people on an empty
   lobby and a form whose submit had nobody to submit to. In that mode the way into the group
   surface is to make a group. */
export const groupHome = (): string => (USE_REAL_API ? '/g' : `/g/${DEMO_GROUP_ID}`);

export function surfaceHref(surface: Surface): string {
  switch (surface) {
    case 'diner': return '/';
    case 'group': return groupHome();
    case 'staff': return '/staff';
    case 'city': return '/city';
    case 'partner': return `/partner/${HZ.partner.venueId}`;
  }
}
