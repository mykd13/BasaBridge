// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SpeakerEnv } from '@basabridge/speech';
import { SpeakButton } from './SpeakButton';

const env: SpeakerEnv = {
  prime: vi.fn(),
  playUrl: vi.fn(async (_url: string, onStart: () => void) => onStart()),
  fetchServiceUrl: vi.fn(async () => 'blob:service'),
  speakBrowser: vi.fn(async (_t: string, _l: string, onStart: () => void) => onStart()),
  stopAll: vi.fn(),
};

vi.mock('../lib/browser-speaker-env', () => ({ createBrowserSpeakerEnv: () => env }));

const labels = { play: 'Listen', stop: 'Stop', error: 'No sound' };

const noSound = () =>
  vi.mocked(env.playUrl).mock.calls.length +
  vi.mocked(env.fetchServiceUrl).mock.calls.length +
  vi.mocked(env.speakBrowser).mock.calls.length;

beforeEach(() => {
  vi.mocked(env.stopAll).mockClear();
  vi.mocked(env.prime!).mockClear();
  vi.mocked(env.playUrl).mockClear();
  vi.mocked(env.fetchServiceUrl).mockClear();
  vi.mocked(env.speakBrowser).mockClear();
});

afterEach(() => cleanup());

describe('SpeakButton', () => {
  it('makes no sound and no request until the learner presses it', () => {
    render(<SpeakButton text="Read the story" lang="en" labels={labels} />);
    expect(noSound()).toBe(0);
    expect(screen.getByRole('button', { name: 'Listen' })).toBeTruthy();
  });

  it('plays after a press, reports it as not autoplay, and primes inside the tap', async () => {
    const onSpoken = vi.fn();
    render(<SpeakButton text="Read the story" lang="en" onSpoken={onSpoken} labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(env.prime).toHaveBeenCalledOnce();
    await waitFor(() => expect(onSpoken).toHaveBeenCalledWith({ autoplay: false }));
    expect(env.fetchServiceUrl).toHaveBeenCalledWith('Read the story', 'en');
  });

  it('starts by itself only when autoplay is on, and reports that', async () => {
    const onSpoken = vi.fn();
    render(
      <SpeakButton text="Read the story" lang="fil" autoplay onSpoken={onSpoken} labels={labels} />,
    );
    await waitFor(() => expect(onSpoken).toHaveBeenCalledWith({ autoplay: true }));
    expect(noSound()).toBeGreaterThan(0);
  });

  it('stops the speaker when it leaves the screen', () => {
    const { unmount } = render(<SpeakButton text="Hi" lang="en" labels={labels} />);
    unmount();
    expect(env.stopAll).toHaveBeenCalled();
  });

  it('does not use aria-pressed', () => {
    render(<SpeakButton text="Hi" lang="en" labels={labels} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBeNull();
  });
});
