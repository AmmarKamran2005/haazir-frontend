/* HAAZIR icon set — ported verbatim from app/assets/js/ui.js.
   One inline SVG set, 1.7px stroke, 24 viewBox. Zero emoji anywhere. */
const P: Record<string, string> = {
  search:  '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  mic:     '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8.5 21h7"/>',
  camera:  '<path d="M4 7h3l1.6-2h6.8L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.6"/>',
  send:    '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>',
  arrowr:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowl:  '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  chev:    '<path d="m9 18 6-6-6-6"/>',
  up:      '<path d="M12 19V6M6 12l6-6 6 6"/>',
  down:    '<path d="M12 5v13M6 12l6 6 6-6"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.2 1.9"/>',
  pin:     '<path d="M20 10.5c0 5.7-8 11.5-8 11.5s-8-5.8-8-11.5a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10.3" r="3"/>',
  users:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M15.5 3.2a4 4 0 0 1 0 7.6"/>',
  user:    '<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-1.2A5.8 5.8 0 0 1 10.3 14h3.4a5.8 5.8 0 0 1 5.8 5.8V21"/>',
  lock:    '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield:  '<path d="M12 22s8-4 8-10V5.2L12 2 4 5.2V12c0 6 8 10 8 10Z"/>',
  alert:   '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 17.2h.01"/>',
  check:   '<path d="M20 6 9 17l-5-5"/>',
  x:       '<path d="M18 6 6 18M6 6l12 12"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  minus:   '<path d="M5 12h14"/>',
  store:   '<path d="M3.2 9h17.6l-1.5-5.3A1 1 0 0 0 18.4 3H5.6a1 1 0 0 0-.9.7L3.2 9Z"/><path d="M4.5 9v11a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M9.5 21v-6h5v6"/>',
  map:     '<path d="m9 4-6 2.8V21l6-2.8 6 2.8 6-2.8V4l-6 2.8Z"/><path d="M9 4v14.2M15 6.8V21"/>',
  chart:   '<path d="M3 3v18h18"/><path d="m7 15 4-4.2 3 3.1L19 7"/>',
  flame:   '<path d="M12 22c4 0 7-2.8 7-6.7 0-4-3-6-4-8.4-1.6 1-2 3-2 3S11 8 9 6c-1 2.4-4 4.4-4 9.3C5 19.2 8 22 12 22Z"/>',
  bowl:    '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>',
  star:    '<path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9L12 3.2Z"/>',
  card:    '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  sun:     '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.2v2.1M12 19.7v2.1M2.2 12h2.1M19.7 12h2.1M5.1 5.1l1.5 1.5M17.4 17.4l1.5 1.5M18.9 5.1l-1.5 1.5M6.6 17.4l-1.5 1.5"/>',
  moon:    '<path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2Z"/>',
  play:    '<path d="M7 4.6v14.8L20 12 7 4.6Z"/>',
  pause:   '<path d="M8 4.5v15M16 4.5v15"/>',
  reset:   '<path d="M3 12a9 9 0 1 0 2.9-6.6L3 8"/><path d="M3 3.2V8h4.8"/>',
  fast:    '<path d="M4 5.5v13l9-6.5-9-6.5Z"/><path d="M13 5.5v13l9-6.5-9-6.5Z"/>',
  info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.8h.01"/>',
  link:    '<path d="M10.6 13.4a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.6 1.6"/><path d="M13.4 10.6a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.6-1.6"/>',
  prayer:  '<path d="M12 3c-3 2.6-4.5 5.4-4.5 8.3V19h9v-7.7C16.5 8.4 15 5.6 12 3Z"/><path d="M5 21h14"/>',
  family:  '<circle cx="8" cy="7.5" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M2.5 20v-1.4A4.6 4.6 0 0 1 7.1 14h1.8a4.6 4.6 0 0 1 4.6 4.6V20M14.5 20v-.9a3.6 3.6 0 0 1 3.6-3.6h.4a3 3 0 0 1 3 3V20"/>',
  ramp:    '<path d="M3 19h18"/><path d="M4 19 15 6"/><circle cx="17.5" cy="16.5" r="2.5"/>',
  parking: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M9.5 17V7.5h3.2a3 3 0 0 1 0 6H9.5"/>',
  bolt:    '<path d="M13.5 2 4 13.5h6L9.5 22 20 10.5h-6.4L13.5 2Z"/>',
  volume:  '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  chair:   '<path d="M6 4v7h12V4"/><path d="M4.5 11h15l-1 5H5.5l-1-5Z"/><path d="M7 16v4M17 16v4"/>',
  tree:    '<path d="M12 3 6.5 11h3L5 17h14l-4.5-6h3L12 3Z"/><path d="M12 17v4"/>',
  eye:     '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  tablet:  '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  sim:     '<path d="M4 20 8 4l4 9 4-6 4 13"/>',
  scale:   '<path d="M12 3v18M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z"/>',
  ticket:  '<path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V10a2 2 0 0 0 0 4v1.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V14a2 2 0 0 0 0-4V8.5Z"/><path d="M14 6.5v11"/>',
};

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P);

/* Every icon carries .hz-i — the size floor. Descendant rules like
   `.btn svg` still win on specificity. */
export function Icon({ name, className }: { name: string; className?: string }) {
  const d = P[name] || P.info;
  return (
    <svg
      className={'hz-i' + (className ? ' ' + className : '')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
