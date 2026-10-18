import { describe, expect, it, vi } from 'vitest';
import { speakSentences, type Synth } from './speak';

function setup() {
  const spoken: SpeechSynthesisUtterance[] = [];
  const synth: Synth = { speak: vi.fn((u) => void spoken.push(u)), cancel: vi.fn() };
  const make = (text: string) =>
    ({ text, lang: '', onend: null, onerror: null }) as unknown as SpeechSynthesisUtterance;
  return { spoken, synth, make };
}

describe('speakSentences', () => {
  it('clears anything already speaking, then queues each sentence in order in the language voice', () => {
    const { spoken, synth, make } = setup();
    speakSentences(synth, make, ['One.', 'Two.'], 'fil', () => {});
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.']);
    expect(spoken.every((u) => u.lang === 'fil-PH')).toBe(true);
    expect(speakSentences(synth, make, ['Hi.'], 'en', () => {})).toBeTypeOf('function');
    expect(spoken.at(-1)?.lang).toBe('en-US');
  });

  it('reports done once, when the last sentence ends', () => {
    const { spoken, synth, make } = setup();
    const done = vi.fn();
    speakSentences(synth, make, ['One.', 'Two.'], 'en', done);
    spoken[0]!.onend?.(new Event('end') as SpeechSynthesisEvent);
    expect(done).not.toHaveBeenCalled();
    spoken[1]!.onend?.(new Event('end') as SpeechSynthesisEvent);
    spoken[1]!.onerror?.(new Event('error') as SpeechSynthesisErrorEvent);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('reports done when the last sentence fails', () => {
    const { spoken, synth, make } = setup();
    const done = vi.fn();
    speakSentences(synth, make, ['One.'], 'en', done);
    spoken[0]!.onerror?.(new Event('error') as SpeechSynthesisErrorEvent);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stops without reporting done, even if the browser then fires an error', () => {
    const { spoken, synth, make } = setup();
    const done = vi.fn();
    const stop = speakSentences(synth, make, ['One.'], 'en', done);
    stop();
    spoken[0]!.onerror?.(new Event('error') as SpeechSynthesisErrorEvent);
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(done).not.toHaveBeenCalled();
  });
});
