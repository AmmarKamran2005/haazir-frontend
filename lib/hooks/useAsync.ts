'use client';

/* useAsync — run a promise-returning function and render its result.
 *
 * The pages used to call the mock handlers straight through and render the return value,
 * because it arrived synchronously. Against a real API it does not. This is the smallest
 * thing that closes that gap without dragging a data-fetching library and its provider into
 * a codebase that had neither.
 *
 * `deps` behaves like useEffect's: the call re-runs when they change. A result from a call
 * that has since been superseded is discarded rather than rendered, which is the bug this
 * kind of hook exists to prevent — type two queries quickly and the slower one must not win.
 */

import { useEffect, useRef, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  // Monotonic, so a late response from an earlier call can be recognised and dropped.
  const run = useRef(0);

  useEffect(() => {
    const mine = ++run.current;
    setState((s) => ({ ...s, loading: true }));

    fn().then(
      (data) => {
        if (run.current === mine) setState({ data, error: null, loading: false });
      },
      (error: unknown) => {
        if (run.current === mine) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          });
        }
      },
    );

    return () => {
      // Nothing to cancel — fetch is left to finish — but bumping the counter means whatever
      // it returns is ignored.
      run.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
