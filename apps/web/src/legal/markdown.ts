/**
 * A small reader for the legal documents (BB-69). It handles only what they use, and it returns
 * data that React renders as elements, so no HTML string is ever injected.
 *
 * Supported, one block per blank-line-separated chunk:
 * - `# Title {#id}`, `## Heading {#id}`. Every heading needs an id, and the English and Filipino
 *   files must use the same ids in the same order (a test checks it).
 * - `> note`: the box that says the text is awaiting review.
 * - `- item` lines: a list.
 * - `{{providers}}` alone on a line: the provider table, drawn from `providers.ts`.
 * - anything else: a paragraph.
 * Inline: `**bold**`, `[text](/path or https://... or mailto:...)`, `{{contact}}` for the privacy
 * address, `[[catalog.key]]` for one sentence from the i18n catalog (the kids summary).
 */
export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'contact' }
  | { type: 'key'; key: string };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; id: string; text: string }
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'note'; inline: Inline[] }
  | { type: 'list'; items: Inline[][] }
  | { type: 'providers' };

const HEADING = /^(#{1,3})\s+(.+?)\s+\{#([a-z0-9-]+)\}$/;
const INLINE = /\[\[([A-Za-z0-9_.]+)\]\]|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{contact\}\}/g;
const SAFE_HREF = /^(\/(?!\/)|https:\/\/|mailto:)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: 'text', value: text.slice(last, index) });
    const [whole, key, strong, linkText, href] = match;
    if (key !== undefined) out.push({ type: 'key', key });
    else if (strong !== undefined) out.push({ type: 'strong', value: strong });
    else if (linkText !== undefined && href !== undefined) {
      if (!SAFE_HREF.test(href)) throw new Error(`Unsafe link in a legal document: ${href}`);
      out.push({ type: 'link', text: linkText, href });
    } else if (whole === '{{contact}}') out.push({ type: 'contact' });
    last = index + whole.length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  for (const chunk of withoutComments.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;
    const first = lines[0]!;
    if (first.startsWith('#')) {
      const match = HEADING.exec(first);
      if (!match || lines.length !== 1) {
        throw new Error(`A heading needs the form "## Text {#id}" on its own line: ${first}`);
      }
      blocks.push({
        type: 'heading',
        level: match[1]!.length as 1 | 2 | 3,
        text: match[2]!,
        id: match[3]!,
      });
    } else if (first === '{{providers}}' && lines.length === 1) {
      blocks.push({ type: 'providers' });
    } else if (first.startsWith('>')) {
      blocks.push({
        type: 'note',
        inline: parseInline(lines.map((l) => l.replace(/^>\s?/, '')).join(' ')),
      });
    } else if (first.startsWith('- ')) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => parseInline(l.replace(/^-\s+/, ''))),
      });
    } else {
      blocks.push({ type: 'paragraph', inline: parseInline(lines.join(' ')) });
    }
  }
  return blocks;
}

/** The headings of a document as "level:id", which English and Filipino must share. */
export function headingOutline(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.type === 'heading' ? [`${b.level}:${b.id}`] : []));
}

/** Every `[[key]]` in a document, in order. */
export function catalogKeys(blocks: Block[]): string[] {
  const inlines = blocks.flatMap((b) =>
    b.type === 'paragraph' || b.type === 'note'
      ? b.inline
      : b.type === 'list'
        ? b.items.flat()
        : [],
  );
  return inlines.flatMap((i) => (i.type === 'key' ? [i.key] : []));
}
