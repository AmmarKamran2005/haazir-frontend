'use client';

/* Voice input, using the browser's own speech recognition.
 *
 * This replaces a button that opened a toast saying voice was stubbed. The plan called for
 * Whisper-large-v3 server-side, and that is still the right answer for Urdu script and for
 * the noise of an actual restaurant — but a browser that already ships a recogniser gets a
 * working microphone today, for no key, no upload and no latency, and the deterministic
 * Roman-Urdu parser downstream does not care how the words arrived.
 *
 * Support is genuinely partial: Chrome and Edge have it, Firefox does not, and Safari's is
 * inconsistent. `supported` is what the UI should read — a mic button that silently does
 * nothing is worse than one that is not there.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function recogniser(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface Dictation {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: (lang?: string) => void;
  stop: () => void;
}

/** `onText` receives the transcript as it firms up, final results only. */
export function useDictation(onText: (text: string, isFinal: boolean) => void): Dictation {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  // Checked after mount, never during render: the server has no SpeechRecognition and a
  // mismatch here would be a hydration error on the home page.
  useEffect(() => setSupported(recogniser() !== null), []);

  useEffect(() => () => ref.current?.abort(), []);

  const start = useCallback((lang = 'ur-PK') => {
    const Ctor = recogniser();
    if (!Ctor) {
      setError('This browser has no speech recognition. Chrome and Edge do.');
      return;
    }
    ref.current?.abort();
    const r = new Ctor();
    ref.current = r;
    // Urdu by default because that is what people say out loud here, and the parser reads
    // Roman-Urdu, Urdu script and English alike. `continuous` off: this is one sentence.
    r.lang = lang;
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      if (final) cb.current(final.trim(), true);
      else if (interim) cb.current(interim.trim(), false);
    };

    r.onerror = (e: any) => {
      // 'no-speech' and 'aborted' are ordinary: somebody pressed the button and said nothing,
      // or pressed it again. Only report what a person can act on.
      const kind = e?.error;
      if (kind === 'not-allowed' || kind === 'service-not-allowed') {
        setError('Microphone permission was declined.');
      } else if (kind && kind !== 'no-speech' && kind !== 'aborted') {
        setError('Could not hear that. Try again, or type it.');
      }
      setListening(false);
    };

    r.onend = () => setListening(false);

    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      // start() throws if it is already running; treat that as already listening.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
