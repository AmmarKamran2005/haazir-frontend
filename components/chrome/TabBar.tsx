'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/primitives/Icon';
import { surfaceFromPath, surfaceHref, type Surface } from '@/lib/surface';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/en';

/* One persistent tab bar on every surface — five items, the Material cap.
   It is the product's own navigation; the top row is the desktop shell's. */
const TABS: [Surface, TranslationKey, string][] = [
  ['diner', 'nav.ask', 'search'],
  ['group', 'nav.group', 'users'],
  ['city', 'nav.city', 'map'],
  ['staff', 'nav.venue', 'store'],
  ['partner', 'nav.partner', 'chart'],
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const surface = surfaceFromPath(pathname);
  const { t } = useI18n();

  return (
    <nav className="tabs" aria-label="App navigation">
      {TABS.map(([id, key, icon]) => (
        <button
          key={id}
          className="tabs__b"
          aria-current={surface === id ? 'page' : undefined}
          onClick={() => router.push(surfaceHref(id))}
        >
          <Icon name={icon} />
          <span>{t(key)}</span>
        </button>
      ))}
    </nav>
  );
}
