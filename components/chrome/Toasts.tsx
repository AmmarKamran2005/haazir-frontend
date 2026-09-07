'use client';

/* One toast surface for the whole app. The prototype raised toasts from a
   global `U.toast`; here it is a provider so any client component can push
   one without owning its own timer or its own fixed-position stack. */
import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/primitives/Icon';

interface Toast { id: number; text: ReactNode; icon: string }

const ToastCtx = createContext<(text: ReactNode, icon?: string) => void>(() => {});

const LIFETIME = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: ReactNode, icon = 'check') => {
    const id = ++seq.current;
    setToasts(t => [...t, { id, text, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), LIFETIME);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              <Icon name={t.icon} />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
