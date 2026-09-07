'use client';

/* Device enrolment, from the far end of the link an admin generated.
 *
 * This is the page a tablet in a restaurant opens once. It stores the device token and
 * nothing else: the token is what binds this browser to one venue, with a geofence, and it
 * is not a person's session — a diner signing in on the same tablet does not become the
 * venue, and the venue does not become them.
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { enrolDevice } from '@/lib/api';
import { Icon } from '@/components/primitives/Icon';

function SetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'working' | 'done' | 'missing'>('working');
  const done = useRef(false);

  useEffect(() => {
    const token = params.get('t');
    if (!token) {
      setState('missing');
      return;
    }
    if (done.current) return;
    done.current = true;
    enrolDevice(token);
    setState('done');
    const id = setTimeout(() => router.push('/staff'), 1200);
    return () => clearTimeout(id);
  }, [params, router]);

  return (
    <div className="app__scroll scroll">
      <div className="ahead">
        <Link href="/staff" className="ahead__back" aria-label="Back"><Icon name="arrowl" /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ahead__t">
            {state === 'done' ? 'Device enrolled' : state === 'missing' ? 'No token' : 'Enrolling…'}
          </div>
          <div className="ahead__s">
            {state === 'done'
              ? 'This tablet now reports for its venue. Opening the console…'
              : state === 'missing'
                ? 'This link needs the token an admin generated with it.'
                : 'Storing the device token.'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffSetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupInner />
    </Suspense>
  );
}
