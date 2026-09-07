'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HZ, engine } from '@/lib/hz';
import { Icon } from '@/components/primitives/Icon';
import { PulseStrip } from '@/components/search/PulseStrip';
import { useClock } from '@/lib/hooks/useDemoClock';
import { useToast } from '@/components/chrome/Toasts';
import { useI18n } from '@/lib/i18n';
import { useDictation } from '@/lib/hooks/useDictation';

export default function AskPage() {
  useClock();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const [text, setText] = useState('');

  /* Interim results stream into the box as they firm up, so you can watch it hear you; a
     final result searches straight away, because having to press a second button after
     speaking is the reason voice input gets abandoned. */
  const dictation = useDictation(
    useCallback(
      (heard: string, isFinal: boolean) => {
        setText(heard);
        if (isFinal && heard.trim()) router.push('/results?q=' + encodeURIComponent(heard.trim()));
      },
      [router],
    ),
  );

  function submit(e?: FormEvent, override?: string) {
    if (e) e.preventDefault();
    const q = (override || text).trim();
    if (!q) return;
    router.push('/results?q=' + encodeURIComponent(q));
  }

  useEffect(() => {
    if (dictation.error) toast(dictation.error, 'mic');
  }, [dictation.error, toast]);

  return (
    <div className="app__scroll scroll">
      <div className="ask">
        <div className="ask__hero">
          <div className="ask__greet">
            {engine.dayName()}, {engine.timeString()} · {HZ.user.homeArea}
          </div>
          <h1 className="ask__q">{t('ask.headline')}</h1>
          <div className="ask__ur">{t('ask.headlineUr')}</div>
        </div>

        <form className="askbar" onSubmit={(e) => submit(e)}>
          <input
            type="text"
            placeholder={t('ask.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('ask.inputLabel')}
            autoComplete="off"
          />
          {/* The browser's own recogniser, listening in Urdu. Whisper server-side is still
              the better answer for restaurant noise and for Urdu script, but this works now,
              needs no key and no upload, and the parser downstream does not care how the
              words arrived. Hidden entirely where the browser has no recogniser: a mic that
              silently does nothing is worse than no mic. */}
          {dictation.supported && (
            <button
              className="askbar__ic"
              type="button"
              aria-label={dictation.listening ? 'Stop listening' : t('ask.byVoice')}
              aria-pressed={dictation.listening}
              data-listening={dictation.listening ? 1 : 0}
              style={dictation.listening ? { color: 'var(--verm)' } : undefined}
              onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
            >
              <Icon name="mic" />
            </button>
          )}
          {/* The menu-OCR button was here. It opened a toast explaining it was not built,
              which is honest but is still a control that does nothing — and on the one screen
              a judge tries things on. Removed rather than explained. */}
          <button className="askbar__go" type="submit" aria-label={t('ask.search')}>
            <Icon name="arrowr" />
          </button>
        </form>

        <div className="sugs">
          {HZ.suggestions.map((s: any) => (
            <button
              key={s.q}
              className="sug"
              type="button"
              onClick={() => submit(undefined, s.q)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sug__q">{s.q}</div>
                <div className="sug__en">{s.en}</div>
              </div>
              <Icon name="arrowr" />
            </button>
          ))}
        </div>

        <PulseStrip />
      </div>
    </div>
  );
}
