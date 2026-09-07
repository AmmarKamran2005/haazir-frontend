'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/primitives/Icon';
import { engine } from '@/lib/hz';
import { surfaceFromPath } from '@/lib/surface';
import { useClock } from '@/lib/hooks/useDemoClock';
import { TabBar } from './TabBar';

export function DeviceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useClock();
  const surface = surfaceFromPath(pathname);

  return (
    <div className="stage">
      <div className={'device' + (surface === 'staff' ? ' device--tablet' : '')}>
        <div className="device__status">
          <span>{engine.timeString()}</span>
          <span className="device__bars">
            <Icon name="sim" />
            <span>HAAZIR</span>
            <Icon name="bolt" />
          </span>
        </div>
        <div className="app">
          {children}
          <TabBar />
        </div>
      </div>
    </div>
  );
}
