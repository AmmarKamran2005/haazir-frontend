/* Groups this browser has made or joined, so the organiser can find their group again.

   The server has no "my groups" list on purpose — the creator can be anonymous — so the list
   lives where the person is: in this browser. Expired groups drop off after the server's
   36-hour lifetime. */

const KEY = 'hz-my-groups';
const LIFETIME_MS = 36 * 60 * 60 * 1000;

export interface RememberedGroup {
  id: string;
  title: string;
  at: number;
}

export function myGroups(): RememberedGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) || '[]') as RememberedGroup[];
    return list.filter(g => Date.now() - g.at < LIFETIME_MS).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export function rememberGroup(id: string, title: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const rest = myGroups().filter(g => g.id !== id);
    const existing = myGroups().find(g => g.id === id);
    const entry = { id, title: title || existing?.title || 'Group', at: existing?.at ?? Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, 20)));
  } catch {
    /* private mode: nothing to remember with */
  }
}
