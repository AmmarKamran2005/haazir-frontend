import type { CSSProperties, ReactNode } from 'react';

export function Label({ children, panel, style }: {
  children: ReactNode; panel?: boolean; style?: CSSProperties;
}) {
  return <div className={'lbl' + (panel ? ' lbl--panel' : '')} style={style}>{children}</div>;
}
