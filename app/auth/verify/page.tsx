'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  /* A magic link is redeemable exactly once, and React's dev StrictMode runs this effect
     twice. Both calls fire, one consumes the token and the other gets a 400 — which half the
     user sees is a race. Remembering the token we have already attempted makes the second
     invocation a no-op instead of a coin toss. */
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && attempted.current === token) return;
    if (token) attempted.current = token;
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    let cancelled = false;
    login(token).then(
      ok => {
        if (cancelled) return;
        if (ok) {
          setStatus('success');
          setMessage('You are signed in. Redirecting...');
          setTimeout(() => router.push('/'), 1200);
        } else {
          setStatus('error');
          setMessage('This link is invalid or has expired.');
        }
      },
      // An expired link and an unreachable API both leave you signed out, but only one of
      // them is worth trying again in a minute.
      (err: Error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage('Could not verify the link: ' + err.message);
      },
    );
    return () => { cancelled = true; };
  }, [searchParams, login, router]);

  return (
    <div className="app__scroll scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 'var(--sp-6)' }}>
        <div className="bignum" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="bignum__v" style={{ fontSize: 48 }}>
            {status === 'verifying' ? '...' : status === 'success' ? 'OK' : '!'}
          </div>
          <div className="bignum__l" style={{ fontSize: 15 }}>
            {status === 'verifying' ? 'Verifying your link...' : message}
          </div>
        </div>
        {status === 'error' && (
          <button className="btn btn--primary" onClick={() => router.push('/')} style={{ marginTop: 'var(--sp-3)' }}>
            Return home
          </button>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <div className="ahead">
        <div style={{ flex: 1 }}>
          <div className="ahead__t">Sign in</div>
          <div className="ahead__s">Magic link verification</div>
        </div>
      </div>
      <Suspense fallback={<div className="app__scroll scroll"><div style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>Loading...</div></div>}>
        <VerifyContent />
      </Suspense>
    </>
  );
}
