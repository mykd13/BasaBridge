import { notFound } from 'next/navigation';
import { DecisionsScreen } from '@/components/parent/DecisionsScreen';
import * as sample from '@/components/parent/fixtures';
import { LevelsScreen } from '@/components/parent/LevelsScreen';
import { PrivacyScreen } from '@/components/parent/PrivacyScreen';
import { ProgressScreen } from '@/components/parent/ProgressScreen';
import { ReadingsScreen } from '@/components/parent/ReadingsScreen';
import { SectionNav } from '@/components/parent/SectionNav';
import { ParentShell } from '@/components/shell/ParentShell';
import type { ScreenState } from '@/server/parent/types';

const KINDS = ['loading', 'empty', 'not-shared', 'not-wired', 'error', 'ready'] as const;

/**
 * Developer preview of the parent screens with typed sample data, for checking them against the
 * canvas. Use ?screen=progress|readings|levels|decisions|privacy&state=ready|empty|...
 * It does not exist in production builds, so the sample data never reaches a parent.
 */
export default async function ParentPreview({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string; state?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { screen = 'progress', state = 'ready' } = await searchParams;
  const kind = KINDS.find((k) => k === state) ?? 'ready';
  const pick = <T,>(data: T): ScreenState<T> =>
    kind === 'ready' ? { kind, data } : ({ kind } as ScreenState<T>);
  return (
    <ParentShell>
      <SectionNav learner="preview" />
      {screen === 'readings' ? (
        <ReadingsScreen state={pick(sample.readings)} />
      ) : screen === 'levels' ? (
        <LevelsScreen state={pick(sample.levels)} />
      ) : screen === 'decisions' ? (
        <DecisionsScreen state={pick(sample.decisions)} />
      ) : screen === 'privacy' ? (
        <PrivacyScreen state={pick(sample.privacy)} />
      ) : (
        <ProgressScreen state={pick(sample.progressWithNotes)} />
      )}
    </ParentShell>
  );
}
