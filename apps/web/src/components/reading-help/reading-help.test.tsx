import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import type { Lang } from '@/i18n/types';
import { DEFAULT_STATE, applyPreset } from '@/lib/reading-help/settings';

let state = DEFAULT_STATE;
vi.mock('./ReadingHelpProvider', () => ({
  useReadingHelp: () => ({ state, persisted: true, update: vi.fn() }),
}));
vi.mock('@/server/reading-help', () => ({ saveMyReadingHelp: vi.fn() }));

const { ReadingHelpText } = await import('./ReadingHelpText');
const { ReadingHelpScreen } = await import('./ReadingHelpScreen');

const text = (lang: Lang = 'en') =>
  renderToStaticMarkup(withIntl(<ReadingHelpText>Story</ReadingHelpText>, lang));
const screen = (lang: Lang = 'en') => renderToStaticMarkup(withIntl(<ReadingHelpScreen />, lang));

describe('reading ruler overlay', () => {
  it('leaves the text plain when the ruler is off', () => {
    state = DEFAULT_STATE;
    const out = text();
    expect(out).not.toContain('bb-ruler__band');
    expect(out).toContain('Story');
  });

  it('wraps the text in the ruler with named controls when it is on', () => {
    state = { ...DEFAULT_STATE, readingRuler: true };
    const out = text();
    expect(out).toContain('bb-ruler__band');
    expect(out).toContain('>Previous line<');
    expect(out).toContain('>Next line<');
    expect(out).toContain('aria-label="Story text"');
  });

  it('names the controls in Filipino', () => {
    state = { ...DEFAULT_STATE, readingRuler: true };
    expect(text('fil')).toContain('>Susunod na linya<');
  });
});

describe('reading help screen', () => {
  it('shows the canvas controls and marks the current preset', () => {
    state = DEFAULT_STATE;
    const out = screen();
    for (const label of [
      'Standard',
      'More help',
      'Speak instructions',
      'Read questions to me',
      'Reading ruler',
      'High contrast',
      'Space between lines',
    ]) {
      expect(out).toContain(label);
    }
    expect(out).toMatch(/checked=""[^>]*value="standard"/);
    expect(out).toContain('<h1');
  });

  it('shows the more help preset and its ruler', () => {
    state = { ...applyPreset(DEFAULT_STATE, 'more') };
    const out = screen();
    expect(out).toMatch(/checked=""[^>]*value="more"/);
    expect(out).toContain('bb-ruler__band');
  });

  it('leaves both presets unchecked for a custom mix', () => {
    state = { ...applyPreset(DEFAULT_STATE, 'more'), textSize: 'small' };
    const out = screen();
    expect(out).not.toMatch(/checked=""[^>]*value="(standard|more)"/);
  });

  it('says where settings are kept, in Filipino too', () => {
    expect(screen()).toContain('Saved on this device');
    expect(screen('fil')).toContain('Naka-save sa device na ito');
  });
});
