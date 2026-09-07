'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/primitives/Icon';
import { engine } from '@/lib/hz';
import { surfaceFromPath, surfaceHref, type Surface } from '@/lib/surface';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/en';
import { useDirector } from './Director';
import { useAuth } from '@/lib/hooks/useAuth';

const SURFACES: { id: Surface; key: TranslationKey; icon: string }[] = [
  { id: 'diner',   key: 'nav.diner',   icon: 'search' },
  { id: 'group',   key: 'nav.group',   icon: 'users' },
  { id: 'staff',   key: 'nav.staff',   icon: 'store' },
  { id: 'city',    key: 'nav.city',    icon: 'map' },
  { id: 'partner', key: 'nav.partner', icon: 'chart' },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { bump } = useClock();
  const { locale, setLocale, t } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const { running: directorOn, toggle: toggleDirector } = useDirector();
  const surface = surfaceFromPath(pathname);

  // Theme is unknown at server render; read it after mount so the icon flips.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('hz-theme', isDark ? 'light' : 'dark'); } catch {}
    setDark(!isDark);
  };

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand__mark">HAAZIR</span>
        <span className="brand__ur">حاضر</span>
        <span className="brand__tag">{t('brand.tagline')}</span>
      </Link>
      <nav className="surfaces" aria-label="Product surfaces">
        {SURFACES.map((s) => (
          <button
            key={s.id}
            className="surfaces__b"
            aria-current={surface === s.id ? 'page' : undefined}
            onClick={() => router.push(surfaceHref(s.id))}
          >
            <Icon name={s.icon} />
            <span>{t(s.key)}</span>
          </button>
        ))}
      </nav>
      <div className="topbar__right">
        <div className="clock">
          <button
            className="iconbtn clock__play"
            aria-label={(engine.running ? 'Pause' : 'Play') + ' the demo clock'}
            onClick={() => { engine.running = !engine.running; bump(); }}
          >
            <Icon name={engine.running ? 'pause' : 'play'} />
          </button>
          <span className="clock__d">{engine.dayName().slice(0, 3)}</span>
          {/* The demo clock advances, so the time rendered on the server is not the time
              rendered on the client a moment later, and React reports that as a hydration
              failure on every page load. The difference is intended: this is a clock. */}
          <span className="clock__t" suppressHydrationWarning>{engine.timeString()}</span>
          <button
            className="clock__speed"
            data-fast={engine.speed > 1 ? 1 : 0}
            aria-label={`Clock speed, currently ${engine.speed} times`}
            onClick={() => { engine.speed = engine.speed === 1 ? 8 : engine.speed === 8 ? 60 : 1; bump(); }}
          >
            {engine.speed}×
          </button>
        </div>
        <button
          className="iconbtn"
          aria-label={directorOn ? 'Exit the guided demo' : 'Run the guided demo'}
          aria-pressed={directorOn}
          onClick={toggleDirector}
        >
          <Icon name={directorOn ? 'x' : 'play'} />
        </button>
        <button
          className="iconbtn lang-toggle"
          aria-label={`Switch to ${locale === 'en' ? 'Urdu' : 'English'}`}
          onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')}
        >
          <span data-active={locale === 'en' ? 1 : 0}>EN</span>
          <span className="lang-toggle__sep">/</span>
          <span data-active={locale === 'ur' ? 1 : 0}>اردو</span>
        </button>
        {/* Sign-in has to be reachable from the chrome. Everything a diner can read works
            signed out; a check-in, a hold and the staff console do not, and there was no way
            to get to the page that fixes that. */}
        {/* Whether anybody is signed in lives in localStorage, which the server cannot see.
            The icon is therefore the same in both passes — swapping it produced markup React
            could not reconcile, and suppressHydrationWarning does not reach inside a child
            component's dangerouslySetInnerHTML. Only attributes vary, and those are
            suppressed, so there is no mismatch left to hide. */}
        <Link
          href="/auth"
          className="iconbtn"
          aria-label={isAuthenticated ? `Signed in as ${user?.email ?? ''}` : 'Sign in'}
          title={isAuthenticated ? (user?.email ?? 'Signed in') : 'Sign in'}
          data-signed-in={isAuthenticated ? 1 : 0}
          style={isAuthenticated ? { color: 'var(--jade)' } : undefined}
          suppressHydrationWarning
        >
          <Icon name="user" />
        </Link>
        <button className="iconbtn" aria-label="Toggle dark mode" onClick={toggleTheme}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  );
}
