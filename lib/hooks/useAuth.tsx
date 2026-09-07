'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { verifyToken, logout as apiLogout, me as apiMe, setAccessToken, type AuthUser, type AuthSession } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'hz-auth-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') {
      return { user: null, accessToken: null, isAuthenticated: false, isLoading: false };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const user = JSON.parse(saved) as AuthUser;
        return { user, accessToken: null, isAuthenticated: true, isLoading: false };
      }
    } catch {}
    return { user: null, accessToken: null, isAuthenticated: false, isLoading: false };
  });

  const login = useCallback(async (token: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true }));
    const session: AuthSession | null = await verifyToken(token);
    if (!session) {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session.user)); } catch {}
    // `setAccessToken` is what every later request reads for its Authorization header. The
    // rest.ts session() helper already sets it; doing it here too keeps the mock path — which
    // never touches http.ts — behaving the same way.
    setAccessToken(session.accessToken);
    setState({ user: session.user, accessToken: session.accessToken, isAuthenticated: true, isLoading: false });
    return true;
  }, []);

  /* Clears the server session too. Dropping only the local copy would leave the refresh
     cookie alive, so the next refresh would silently sign the person back in — which is not
     what "sign out" means to anybody. */
  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* the local half still has to happen */ }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setAccessToken(null);
    setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  }, []);

  /* The localStorage copy is a cache, and it went stale in exactly the way caches do: an
     account was granted the admin role server-side and the browser went on believing it was a
     diner, hiding every admin control from the only person allowed to use them. Asking the
     server once on mount costs one request and makes that impossible. */
  useEffect(() => {
    let alive = true;
    if (typeof window === 'undefined') return;
    apiMe()
      .then(fresh => {
        if (!alive || !fresh) return;
        setState(s =>
          s.user && s.user.id === fresh.id && s.user.role === fresh.role
            ? s
            : { ...s, user: fresh, isAuthenticated: true, isLoading: false },
        );
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch {}
      })
      .catch(() => { /* offline, or signed out; the cached copy stands */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!state.accessToken || !state.user) return;
    const expiresIn = 3600_000;
    const timer = setTimeout(() => {
      logout();
    }, expiresIn);
    return () => clearTimeout(timer);
  }, [state.accessToken, state.user, logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
