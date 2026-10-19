import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Button,
  ButtonLink,
  Checkbox,
  Chip,
  Field,
  IconButton,
  LevelCard,
  LineSpacingControl,
  Notice,
  OptionCard,
  ProgressBar,
  ReadingRuler,
  SpeakerButton,
  Spinner,
  StepDots,
  Tabs,
  TextSizeControl,
} from '../index';

const html = (el: ReactElement) => renderToStaticMarkup(el);
const noop = () => {};

describe('buttons', () => {
  it('renders a real button that does not submit forms by default', () => {
    expect(html(<Button>Start</Button>)).toMatch(
      /^<button type="button" class="bb-btn bb-btn--primary bb-btn--lg">Start<\/button>$/,
    );
  });

  it('renders a link as an anchor with the button look', () => {
    const out = html(
      <ButtonLink href="/learn" variant="brand" size="md">
        Learn
      </ButtonLink>,
    );
    expect(out).toMatch(/^<a class="bb-btn bb-btn--brand bb-btn--md" href="\/learn">/);
  });

  it('hides button icons from screen readers', () => {
    expect(html(<Button icon={<svg />}>Go</Button>)).toContain(
      '<span class="bb-btn__icon" aria-hidden="true">',
    );
  });

  it('shows the short word on an icon button', () => {
    const out = html(<IconButton icon={<svg />} label="Again" />);
    expect(out).toContain('<span class="bb-iconbtn__label">Again</span>');
    expect(out).toMatch(/^<button type="button"/);
  });
});

describe('option card', () => {
  it('is a pressable button while answering', () => {
    const out = html(
      <OptionCard letter="A" state="selected">
        Calm
      </OptionCard>,
    );
    expect(out).toMatch(
      /^<button type="button" class="bb-option bb-option--selected" aria-pressed="true">/,
    );
  });

  it('becomes plain text with a spoken status after scoring', () => {
    const out = html(
      <OptionCard letter="B" state="correct" statusLabel="Correct answer">
        Waiting without getting upset
      </OptionCard>,
    );
    expect(out).toMatch(/^<div class="bb-option bb-option--correct">/);
    expect(out).toContain('Correct answer: ');
    expect(out).not.toContain('<button');
  });
});

describe('progress', () => {
  it('reports its value and clamps it', () => {
    const out = html(<ProgressBar value={140} max={100} label="Level progress" />);
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="100"');
    expect(out).toContain('width:100%');
  });

  it('can stay silent when text beside it says the same thing (BB-37)', () => {
    const bar = html(<ProgressBar value={3} max={10} decorative />);
    expect(bar).toContain('aria-hidden="true"');
    expect(bar).not.toContain('progressbar');
    expect(bar).not.toContain('aria-valuetext');
    const card = html(
      <LevelCard eyebrow="Level" level={4} progress={{ value: 0.3, decorative: true }} />,
    );
    expect(card).toContain('aria-hidden="true"');
    expect(card).not.toContain('progressbar');
  });

  it('fills whole segments', () => {
    const out = html(<ProgressBar value={6} max={10} segments={5} label="Stories" />);
    expect(out.match(/bb-fill--accent/g)).toHaveLength(3);
  });

  it('marks done, current and todo steps', () => {
    const out = html(<StepDots current={3} total={5} label="Question 3 of 5" />);
    expect(out.match(/--done/g)).toHaveLength(2);
    expect(out.match(/--current/g)).toHaveLength(1);
    expect(out.match(/--todo/g)).toHaveLength(2);
    expect(out).toContain('Question 3 of 5');
  });

  it('shows the level from props and its bar', () => {
    const out = html(
      <LevelCard
        eyebrow="Your level"
        level={12}
        suffix="of 100"
        progress={{ value: 0.4, label: 'Progress in level 12' }}
      />,
    );
    expect(out).toContain('12<span class="bb-level__suffix"> of 100</span>');
    expect(out).toContain('aria-valuenow="0.4"');
  });
});

describe('form fields', () => {
  it('ties the label, hint and error to the input', () => {
    const out = html(
      <Field
        id="name"
        label="First name"
        hint="Only your first name."
        error="Type your first name."
      />,
    );
    expect(out).toContain('<label class="bb-field__label" for="name">First name</label>');
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain('aria-describedby="name-error name-hint"');
    expect(out).toContain('id="name-error"');
  });

  it('leaves a valid field unmarked', () => {
    const out = html(<Field id="code" label="Code" />);
    expect(out).not.toContain('aria-invalid');
    expect(out).not.toContain('aria-describedby');
  });

  it('wraps a checkbox in its label', () => {
    const out = html(
      <Checkbox id="ruler" label="Reading ruler" description="Highlight one line." />,
    );
    expect(out).toMatch(
      /^<label class="bb-check" for="ruler"><input id="ruler" type="checkbox" aria-describedby="ruler-desc"\/>/,
    );
  });
});

describe('status and surfaces', () => {
  it('announces the spinner label', () => {
    const out = html(<Spinner label="Checking your reading" />);
    expect(out).toContain('role="status"');
    expect(out).toContain('<span class="bb-sr-only">Checking your reading</span>');
  });

  it('only makes a notice live when asked', () => {
    expect(html(<Notice>Plain</Notice>)).not.toContain('role=');
    expect(
      html(
        <Notice live="assertive" tone="bad">
          Oops
        </Notice>,
      ),
    ).toContain('role="alert"');
  });

  it('renders a chip as a span', () => {
    expect(html(<Chip tone="good">Learned</Chip>)).toMatch(
      /^<span class="bb-chip bb-chip--good bb-chip--sm">/,
    );
  });

  it('renders tabs with matching tab and panel ids', () => {
    const out = html(
      <Tabs
        label="Sections"
        value="b"
        onChange={noop}
        tabs={[
          { id: 'a', label: 'Progress', content: 'A' },
          { id: 'b', label: 'Readings', content: 'B' },
        ]}
      />,
    );
    expect(out.match(/role="tab"/g)).toHaveLength(2);
    expect(out).toContain('aria-selected="true" tabindex="0"');
    expect(out).toContain('aria-selected="false" tabindex="-1"');
    const panel = /role="tabpanel" id="([^"]+)" aria-labelledby="([^"]+)"/.exec(out);
    expect(out).toContain(`aria-controls="${panel?.[1]}"`);
    expect(out).toContain(`id="${panel?.[2]}"`);
  });
});

describe('reading support', () => {
  it('names the speaker button and reports playing', () => {
    expect(html(<SpeakerButton label="Listen to the question" />)).toContain(
      'aria-label="Listen to the question"',
    );
    expect(html(<SpeakerButton label="Stop" playing />)).toContain('aria-pressed="true"');
  });

  it('builds text size from radio inputs with spoken names', () => {
    const out = html(
      <TextSizeControl
        legend="Text size"
        value="large"
        onChange={noop}
        labels={{ small: 'Small text', medium: 'Medium text', large: 'Large text' }}
      />,
    );
    expect(out).toContain('<fieldset');
    expect(out).toContain('<legend class="bb-seg__legend">Text size</legend>');
    expect(out.match(/type="radio"/g)).toHaveLength(3);
    expect(out).toContain('aria-label="Large text" name="');
    expect(out).toMatch(/checked="" value="large"/);
  });

  it('offers normal and wide spacing', () => {
    const out = html(
      <LineSpacingControl
        legend="Line spacing"
        value="normal"
        onChange={noop}
        labels={{ normal: 'Normal', wide: 'Wide' }}
      />,
    );
    expect(out).toContain('>Wide</span>');
  });

  it('starts the ruler on the first line and disables going up', () => {
    const out = html(
      <ReadingRuler label="Story" previousLabel="Up" nextLabel="Down">
        Mia waited for the bus.
      </ReadingRuler>,
    );
    expect(out).toContain('--ruler-line:0');
    expect(out).toMatch(/disabled=""[^>]*>.*Up/);
  });
});

describe('stylesheet', () => {
  const css = readFileSync(new URL('../components.css', import.meta.url), 'utf8');

  it('uses tokens, not raw colours', () => {
    expect(css.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    expect(css).not.toMatch(/rgba?\(/);
  });

  it('gives every control at least the touch size', () => {
    for (const cls of [
      '.bb-btn {',
      '.bb-iconbtn {',
      '.bb-tabs__tab {',
      '.bb-input {',
      '.bb-check {',
      '.bb-seg__item {',
    ]) {
      const start = css.indexOf(cls);
      expect(start, cls).toBeGreaterThan(-1);
      expect(css.slice(start, css.indexOf('}', start)), cls).toMatch(
        /min-height: (max\()?var\(--touch\)/,
      );
    }
  });

  it('stops motion when reduced motion is asked for', () => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start)).toContain('animation: none');
    // A catch-all, so a more specific rule such as `button.bb-option` cannot keep a transition.
    expect(css.slice(start)).toMatch(
      /\*,\s*\*::before,\s*\*::after\s*{[^}]*transition: none !important/,
    );
  });
});

describe('small phones (BB-71)', () => {
  const css = readFileSync(new URL('../components.css', import.meta.url), 'utf8');

  it('sets a 360px minimum width', () => {
    expect(css).toMatch(/html\s*{\s*min-inline-size:\s*360px;/);
  });

  it.each(['.bb-btn', '.bb-option', '.bb-tabs__tab'])(
    'gives %s a 48px minimum height',
    (selector) => {
      const rule = css.match(/([^{}]+){\s*min-block-size:\s*48px;\s*}/)?.[1] ?? '';
      expect(rule).toContain(selector);
    },
  );
});
