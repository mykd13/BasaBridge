import { describe, expect, it } from 'vitest';
import { lessonHref, safeReturnPath } from './return-path';

describe('return path', () => {
  it('accepts the allow-listed paths', () => {
    expect(safeReturnPath('/read/questions')).toBe('/read/questions');
    expect(safeReturnPath('/learn')).toBe('/learn');
  });

  it('ignores anything else', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/read/questions/../../admin',
      '/read/questions?x=1',
      '/admin',
      '',
      undefined,
      ['/read/questions'],
    ]) {
      expect(safeReturnPath(bad as string | undefined), String(bad)).toBeNull();
    }
  });

  it('carries a safe return on the lesson link and drops an unsafe one', () => {
    expect(lessonHref('why-did-it-happen', '/read/questions')).toBe(
      '/learn/why-did-it-happen?return=%2Fread%2Fquestions',
    );
    expect(lessonHref('why-did-it-happen', 'https://evil.example', '/practice')).toBe(
      '/learn/why-did-it-happen/practice',
    );
  });
});
