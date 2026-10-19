import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TIERS } from '@basabridge/levels';
import { en } from '@/i18n/catalog/en';
import { fil } from '@/i18n/catalog/fil';
import { entries } from '@/i18n/messages';
import { withIntl } from '@/i18n/test-intl';
import type { Lang } from '@/i18n/types';
import { NotWiredError } from '@/server/errors';
import {
  loadDecisions,
  loadLevels,
  loadPrivacy,
  loadProgress,
  loadReadings,
  toScreenState,
} from '@/server/parent/loaders';
import type { ScreenState } from '@/server/parent/types';
import { DecisionsScreen, decisionMessage } from './DecisionsScreen';
import * as sample from './fixtures';
import { LevelsScreen, TIER_KEYS } from './LevelsScreen';
import { PrivacyScreen } from './PrivacyScreen';
import { ProgressScreen } from './ProgressScreen';
import { ReadingsScreen } from './ReadingsScreen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
  usePathname: () => '/',
}));

type Render = (state: ScreenState<never>, lang?: Lang) => string;

function screens(): Array<{ name: string; ready: ScreenState<never>; render: Render }> {
  const make =
    (Screen: (props: { state: never }) => React.ReactNode): Render =>
    (state, lang = 'en') =>
      renderToStaticMarkup(withIntl(<Screen state={state as never} />, lang));
  return [
    {
      name: 'progress',
      ready: { kind: 'ready', data: sample.progress } as never,
      render: make(ProgressScreen as never),
    },
    {
      name: 'readings',
      ready: { kind: 'ready', data: sample.readings } as never,
      render: make(ReadingsScreen as never),
    },
    {
      name: 'levels',
      ready: { kind: 'ready', data: sample.levels } as never,
      render: make(LevelsScreen as never),
    },
    {
      name: 'decisions',
      ready: { kind: 'ready', data: sample.decisions } as never,
      render: make(DecisionsScreen as never),
    },
    {
      name: 'privacy',
      ready: { kind: 'ready', data: sample.privacy } as never,
      render: make(PrivacyScreen as never),
    },
  ];
}

const h1 = (html: string) => html.match(/<h1[\s>]/g)?.length ?? 0;

describe.each(screens())('$name screen', ({ ready, render }) => {
  it.each(['loading', 'empty', 'not-shared', 'not-wired', 'error'] as const)(
    'renders the %s state with one h1',
    (kind) => {
      const html = render({ kind } as ScreenState<never>);
      expect(h1(html)).toBe(1);
      expect(html).not.toContain('<main');
      if (kind === 'loading') expect(html).toContain('aria-busy="true"');
      if (kind === 'not-wired') expect(html).toContain('This part is not ready yet');
      if (kind === 'error') expect(html).toContain('role="alert"');
    },
  );

  it('renders the filled state in both languages with one h1, no main and no audio', () => {
    for (const lang of ['en', 'fil'] as const) {
      const html = render(ready, lang);
      expect(h1(html)).toBe(1);
      expect(html).not.toContain('<main');
      expect(html).not.toMatch(/<audio|<source|<video|type="audio|\.mp3|\.wav|\.webm/i);
      expect(html).not.toContain('MISSING_MESSAGE');
    }
  });
});

describe('not shared', () => {
  it('says what to do', () => {
    const html = screens()[0]!.render({ kind: 'not-shared' } as ScreenState<never>);
    expect(html).toContain('Progress is not shared with you');
    expect(html).toContain('Share with a parent');
    const fil = screens()[0]!.render({ kind: 'not-shared' } as ScreenState<never>, 'fil');
    expect(fil).toContain('Ibahagi sa magulang');
  });
});

describe('filled content', () => {
  const byName = Object.fromEntries(screens().map((s) => [s.name, s])) as Record<
    string,
    ReturnType<typeof screens>[number]
  >;
  const progress = byName.progress!;
  const readings = byName.readings!;
  const levels = byName.levels!;
  const decisions = byName.decisions!;
  const privacy = byName.privacy!;

  it('progress shows code facts, the focus rule and the standard home activity', () => {
    const html = progress.render(progress.ready);
    expect(html).toContain('91%'); // 1046 of 1150 words, shown as the server's counts
    expect(html).toContain('Often leaves off word endings such as “-ed”.');
    expect(html).toContain('Often reads “was” as “saw”.');
    expect(html).toContain('Focus: Vocabulary.');
    expect(html).toContain('Word detective'); // standardActivity('vocabulary')
    expect(html).toContain('The AI Teacher’s notes are not ready yet');
  });

  it('progress shows the AI notes when they exist', () => {
    const html = renderToStaticMarkup(
      withIntl(<ProgressScreen state={{ kind: 'ready', data: sample.progressWithNotes }} />),
    );
    expect(html).toContain('Four of five answers were right.');
    expect(html).toContain('Written by the AI Teacher');
    expect(html).not.toContain('notes are not ready yet');
  });

  it('progress says how far along the learner is once, not twice (BB-37)', () => {
    const html = progress.render(progress.ready);
    expect(html).not.toContain('aria-valuetext');
    expect(html.match(/stories passed toward Level/g)).toHaveLength(1);
  });

  it('readings puts each reading under an h2 so its sections are h3, not h3 under h1 (BB-37)', () => {
    const html = readings.render(readings.ready);
    expect(html).toMatch(/<h2 class="bb-reading__title">The Mango Tree<\/h2>/);
    expect(html.indexOf('<h2')).toBeGreaterThan(-1);
    expect(html.indexOf('<h2')).toBeLessThan(html.indexOf('<h3'));
  });

  it('readings lists tries, words to check and questions with no control for audio', () => {
    const html = readings.render(readings.ready);
    expect(html).toContain('The Mango Tree');
    expect(html).toContain('2 (counted)');
    expect(html).toContain('passion');
    expect(html).toContain('Marked as heard wrongly');
    expect(html).toContain('Chose: Full of energy');
    expect(html).not.toMatch(/<button/);
  });

  it('levels takes every number from packages/levels', () => {
    const html = levels.render(levels.ready);
    expect(html).toContain('Moved up from Level 23 to Level 24');
    expect(html).toContain('Started at Level 23');
    expect(html).toContain('Your child is here, Level 24');
    expect(html).toContain('85%');
    expect(html).toContain('Unlimited');
    expect(html).not.toContain('Claude');
  });

  it('decisions uses catalog wording and falls back for unknown ones', () => {
    const html = decisions.render(decisions.ready);
    expect(html).toContain('Focus skill is now Vocabulary');
    expect(html).toContain('Moved up to Level 24');
    expect(html).toContain('5 answers were counted, 1 counted for less.');
    expect(html).toContain('A decision with no catalog message.');
    expect(html).toContain('Based on The Mango Tree');
  });

  it('privacy names the AI model without a provider and offers no unfinished controls', () => {
    const html = privacy.render(privacy.ready);
    expect(html).toContain('What the AI model sees.');
    expect(html).not.toMatch(/Claude|Gemini/);
    expect(html).toContain('Sharing: Progress and Readings');
    expect(html).toContain('Not sharing anything yet');
    expect(html).toContain('Some account tools are not ready yet');
    expect(html).not.toMatch(/<button/);
  });
});

describe('decisionMessage', () => {
  it('returns null for unknown keys and bad params', () => {
    expect(decisionMessage({})).toBeNull();
    expect(decisionMessage({ messageKey: 'decision.other' })).toBeNull();
    expect(decisionMessage({ messageKey: 'decision.focus', params: { skill: 'nope' } })).toBeNull();
    expect(decisionMessage({ messageKey: 'decision.level.up', params: { level: 'x' } })).toBeNull();
  });
});

describe('loaders', () => {
  it.each<[string, () => Promise<never>]>([
    ['progress', () => loadProgress('l') as Promise<never>],
    ['readings', () => loadReadings('l') as Promise<never>],
    ['levels', () => loadLevels('l') as Promise<never>],
    ['decisions', () => loadDecisions('l') as Promise<never>],
    ['privacy', () => loadPrivacy() as Promise<never>],
  ])('%s goes through authorization and throws NotWiredError', async (_name, load) => {
    await expect(load()).rejects.toBeInstanceOf(NotWiredError);
    expect(await toScreenState(load)).toEqual({ kind: 'not-wired' });
  });

  it('maps outcomes to screen states', async () => {
    expect(await toScreenState(async () => ({ kind: 'not-shared' }))).toEqual({
      kind: 'not-shared',
    });
    expect(await toScreenState(async () => ({ kind: 'empty' }))).toEqual({ kind: 'empty' });
    expect(await toScreenState(async () => ({ kind: 'ok', data: 1 }))).toEqual({
      kind: 'ready',
      data: 1,
    });
    expect(
      await toScreenState(async () => {
        throw new Error('boom');
      }),
    ).toEqual({ kind: 'error' });
  });
});

describe('catalog', () => {
  it('has a wording for every level tier', () => {
    expect(TIER_KEYS).toHaveLength(TIERS.length);
  });

  it('marks every new Filipino parent key as not reviewed', () => {
    const parent = entries(fil).filter((e) => e.key.startsWith('parent.'));
    expect(parent.length).toBe(entries(en).filter((e) => e.key.startsWith('parent.')).length);
    for (const { key, entry } of parent) expect(entry.reviewed, key).toBe(false);
  });
});
