'use client';

/* The demo clock drives everything. Ticking bumps a counter so every
   subscriber re-reads the engine singleton — mirrors the prototype's 900ms
   re-render loop. `bump` lets controls (play/pause, speed, theme) force an
   immediate repaint of the chrome. */
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { engine } from '@/lib/hz';

const ClockCtx = createContext<{ tick: number; bump: () => void }>({ tick: 0, bump: () => {} });

export function ClockProvider({ children }: { children: ReactNode }) {
  const [tick, bump] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (!engine.running) return;
      engine.tick(dt * engine.speed);
      bump();
    }, 900);
    return () => clearInterval(id);
  }, []);

  return <ClockCtx.Provider value={{ tick, bump }}>{children}</ClockCtx.Provider>;
}

export const useClock = () => useContext(ClockCtx);
