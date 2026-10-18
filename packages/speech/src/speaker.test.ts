import { describe, expect, it, vi } from 'vitest';
import { createSpeaker, type SpeakerEnv, type SpeakerState } from './speaker';

const setup = (over: Partial<SpeakerEnv> = {}) => {
  const env: SpeakerEnv = {
    playUrl: vi.fn(async (_u: string, onStart: () => void) => onStart()),
    fetchServiceUrl: vi.fn(async () => 'blob:service'),
    speakBrowser: vi.fn(async (_t, _l, onStart: () => void) => onStart()),
    stopAll: vi.fn(),
    ...over,
  };
  const states: SpeakerState[] = [];
  return { env, states, speaker: createSpeaker(env, (s) => states.push(s)) };
};

describe('createSpeaker', () => {
  it('goes back to idle when the browser blocks autoplay, without trying other sources', async () => {
    const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    const { env, states, speaker } = setup({
      playUrl: vi.fn(async () => {
        throw blocked;
      }),
    });
    await speaker.play({
      text: 'Tap start',
      lang: 'en',
      fixedUrl: '/audio/en/x.mp3',
      autoplay: true,
    });
    expect(env.fetchServiceUrl).not.toHaveBeenCalled();
    expect(env.speakBrowser).not.toHaveBeenCalled();
    expect(states).toEqual(['loading', 'idle']);
  });

  it('after a press, a browser block falls through to the next source', async () => {
    const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    const playUrl = vi.fn(async () => {
      throw blocked;
    });
    const { env, states, speaker } = setup({ playUrl });
    await speaker.play({ text: 'Q', lang: 'en', fixedUrl: '/audio/en/x.mp3' });
    expect(env.fetchServiceUrl).toHaveBeenCalled();
    expect(env.speakBrowser).toHaveBeenCalled();
    expect(states).toEqual(['loading', 'playing', 'idle']);
  });

  it('after a press, a block on every source ends in the error state', async () => {
    const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    const { states, speaker } = setup({
      playUrl: vi.fn(async () => {
        throw blocked;
      }),
      speakBrowser: vi.fn(async () => {
        throw blocked;
      }),
    });
    await speaker.play({ text: 'Q', lang: 'en' });
    expect(states).toEqual(['loading', 'error']);
  });

  it('prime reaches the environment', () => {
    const prime = vi.fn();
    const { speaker } = setup({ prime });
    speaker.prime();
    expect(prime).toHaveBeenCalledOnce();
  });

  it('uses the fixed file first and never asks the service', async () => {
    const { env, states, speaker } = setup();
    await speaker.play({ text: 'Tap start', lang: 'en', fixedUrl: '/audio/en/x.mp3' });
    expect(env.playUrl).toHaveBeenCalledWith('/audio/en/x.mp3', expect.any(Function));
    expect(env.fetchServiceUrl).not.toHaveBeenCalled();
    expect(states).toEqual(['loading', 'playing', 'idle']);
  });

  it('falls back to the service when the fixed file fails', async () => {
    const playUrl = vi.fn(async (url: string, onStart: () => void) => {
      if (url.startsWith('/audio')) throw new Error('404');
      onStart();
    });
    const { env, speaker } = setup({ playUrl });
    await speaker.play({ text: 'Q', lang: 'fil', fixedUrl: '/audio/fil/x.mp3' });
    expect(env.fetchServiceUrl).toHaveBeenCalledWith('Q', 'fil');
    expect(playUrl).toHaveBeenLastCalledWith('blob:service', expect.any(Function));
  });

  it('falls back to the browser voice when the service is unavailable', async () => {
    const { env, states, speaker } = setup({
      fetchServiceUrl: vi.fn(async () => {
        throw new Error('503');
      }),
    });
    await speaker.play({ text: 'Question', lang: 'en' });
    expect(env.speakBrowser).toHaveBeenCalledWith('Question', 'en', expect.any(Function));
    expect(states).toEqual(['loading', 'playing', 'idle']);
  });

  it('shows an error when every source fails', async () => {
    const { states, speaker } = setup({
      fetchServiceUrl: vi.fn(async () => {
        throw new Error('503');
      }),
      speakBrowser: vi.fn(async () => {
        throw new Error('no voice');
      }),
    });
    await speaker.play({ text: 'Q', lang: 'en' });
    expect(states).toEqual(['loading', 'error']);
  });

  it('stop goes back to idle and a stopped run stays quiet', async () => {
    let finish: () => void = () => {};
    const { env, states, speaker } = setup({
      playUrl: vi.fn(
        (_u: string, onStart: () => void) =>
          new Promise<void>((resolve) => {
            finish = () => {
              onStart();
              resolve();
            };
          }),
      ),
    });
    const running = speaker.play({ text: 'Q', lang: 'en', fixedUrl: '/audio/en/x.mp3' });
    speaker.stop();
    finish();
    await running;
    expect(env.stopAll).toHaveBeenCalled();
    expect(states).toEqual(['loading', 'idle']);
  });
});
