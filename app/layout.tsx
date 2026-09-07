import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Shell } from '@/components/chrome/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'HAAZIR — the live truth layer for eating out',
  description:
    'HAAZIR knows what is true about a restaurant, a dish and a moment — right now. Live occupancy fusion, a dish-time graph, and a trust score built on public enforcement records. Karachi.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'HAAZIR' },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2317150F'/%3E%3Cpath d='M9 22V10M9 16h6M15 22V10' stroke='%23A9530B' stroke-width='2.6' stroke-linecap='round'/%3E%3Ccircle cx='22' cy='12' r='2.6' fill='%23A9530B'/%3E%3C/svg%3E",
    apple: '/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F3EA',
};

/* Blocking theme bootstrap — must run before first paint so there is no
   flash. Never clobber a theme the host already stamped on <html>. */
const THEME_BOOTSTRAP = `try{if(!document.documentElement.dataset.theme){var t=localStorage.getItem('hz-theme');if(t)document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="grain">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){})` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <a className="skip" href="#main">Skip to the app</a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
