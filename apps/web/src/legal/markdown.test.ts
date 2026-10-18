import { describe, expect, it } from 'vitest';
import { catalogKeys, headingOutline, parseInline, parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('reads headings with ids, notes, lists, paragraphs and the provider table', () => {
    const blocks = parseMarkdown(
      '# Title {#t}\n\n> note\n\n## Part {#p}\n\nOne\ntwo.\n\n- a\n- b\n\n{{providers}}\n',
    );
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'note',
      'heading',
      'paragraph',
      'list',
      'providers',
    ]);
    expect(headingOutline(blocks)).toEqual(['1:t', '2:p']);
    expect(blocks[3]).toEqual({ type: 'paragraph', inline: [{ type: 'text', value: 'One two.' }] });
  });

  it('refuses a heading with no id', () => {
    expect(() => parseMarkdown('## No id here')).toThrow(/needs the form/);
  });

  it('skips html comments', () => {
    expect(parseMarkdown('<!-- hidden -->\n\n# T {#t}')).toHaveLength(1);
  });

  it('reads bold, links, the contact token and catalog keys', () => {
    expect(parseInline('a **b** [c](/privacy) {{contact}} [[legal.kids.what1]]')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'strong', value: 'b' },
      { type: 'text', value: ' ' },
      { type: 'link', text: 'c', href: '/privacy' },
      { type: 'text', value: ' ' },
      { type: 'contact' },
      { type: 'text', value: ' ' },
      { type: 'key', key: 'legal.kids.what1' },
    ]);
  });

  it('keeps plain square brackets as text', () => {
    expect(parseInline('[Awaiting review: x]')).toEqual([
      { type: 'text', value: '[Awaiting review: x]' },
    ]);
  });

  it('refuses links that could run script or leave the site oddly', () => {
    for (const href of [
      'javascript:alert(1)',
      '//evil.example',
      'http://plain.example',
      'data:text/html,x',
    ]) {
      expect(() => parseInline(`[x](${href})`), href).toThrow(/Unsafe link/);
    }
    expect(parseInline('[x](mailto:a@b.co)')).toHaveLength(1);
    expect(parseInline('[x](https://a.example)')).toHaveLength(1);
  });

  it('lists catalog keys in order', () => {
    expect(catalogKeys(parseMarkdown('> [[a.b]]\n\n[[c.d]] [[e.f]]'))).toEqual([
      'a.b',
      'c.d',
      'e.f',
    ]);
  });
});
