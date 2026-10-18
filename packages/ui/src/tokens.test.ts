import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { TOKEN_NAMES } from './index';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** Colour tokens declared in the first rule whose selector matches exactly. */
function palette(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No rule for ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/gi)) out[m[1]!] = m[2]!;
  return out;
}

const THEMES = {
  light: palette(':root'),
  dark: palette(":root[data-theme='dark']"),
  'high contrast': palette(":root[data-contrast='more']"),
};

/** Text colour on background colour, as the components use them. */
const PAIRS: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['accent-ink', 'accent'],
  ['ink', 'accent-soft'],
  ['mark-ink', 'mark'],
  ['ink', 'mark-soft'],
  ['warn', 'mark-soft'],
  ['good', 'good-soft'],
  ['good', 'surface'],
  ['bad', 'bad-soft'],
  ['bad', 'surface'],
  ['accent-ink', 'good'],
  ['accent-ink', 'bad'],
];

describe('tokens', () => {
  for (const [theme, colours] of Object.entries(THEMES)) {
    it(`${theme} declares every colour token`, () => {
      for (const name of TOKEN_NAMES) expect(colours[name], name).toMatch(/^#/);
    });

    for (const [fg, bg] of PAIRS) {
      it(`${theme}: ${fg} on ${bg} is at least 4.5:1`, () => {
        const ratio = contrastRatio(colours[fg]!, colours[bg]!);
        expect(ratio, `${colours[fg]} on ${colours[bg]}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  for (const [theme, colours] of Object.entries(THEMES)) {
    it(`${theme}: control borders and focus rings are at least 3:1`, () => {
      for (const fg of ['line-strong', 'ink', 'accent']) {
        for (const bg of ['bg', 'surface']) {
          expect(
            contrastRatio(colours[fg]!, colours[bg]!),
            `${fg} on ${bg}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  it('the system high-contrast rule matches the chosen one', () => {
    const start = css.indexOf('@media (prefers-contrast: more)');
    const body = css.slice(start, css.indexOf('}', css.indexOf('{', start) + 1));
    for (const [name, hex] of Object.entries(THEMES['high contrast'])) {
      expect(body).toContain(`--${name}: ${hex};`);
    }
  });
});
