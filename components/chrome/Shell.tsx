'use client';

import type { ReactNode } from 'react';
import { ClockProvider } from '@/lib/hooks/useDemoClock';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { I18nProvider } from '@/lib/i18n';
import { TopBar } from './TopBar';
import { Rail } from './Rail';
import { DeviceFrame } from './DeviceFrame';
import { EnginePanel } from './EnginePanel';
import { ToastProvider } from './Toasts';
import { DirectorProvider } from './Director';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <ClockProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <DirectorProvider>
              <div className="shell">
                <TopBar />
                <div className="body">
                  <Rail />
                  <main id="main" className="stage">
                    <DeviceFrame>{children}</DeviceFrame>
                  </main>
                  <EnginePanel />
                </div>
              </div>
            </DirectorProvider>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ClockProvider>
  );
}
