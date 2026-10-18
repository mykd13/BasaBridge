import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SayIt } from './say-it';

// The shell around every page already has the one main landmark, the header and the brand.
describe('SayIt inside the student shell', () => {
  it.each([
    ['with words', ['light', 'night']],
    ['with no words', []],
  ])('has one h1 and no main, header or brand of its own %s', (_name, words) => {
    const html = renderToStaticMarkup(<SayIt words={words} lang="en" wording="standard" />);
    expect(html).not.toMatch(/<main[\s>]/);
    expect(html).not.toMatch(/<header[\s>]/);
    expect(html).not.toContain('BasaBridge');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });
});
