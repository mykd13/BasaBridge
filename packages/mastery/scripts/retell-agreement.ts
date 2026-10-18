/**
 * Score a human-checked set of retells and report agreement (BB-46). See RETELL.md.
 *
 *   pnpm --filter @basabridge/mastery retell:agreement path/to/set.json
 *
 * The set holds transcripts, so it stays on the checker's machine and is never committed.
 * This script prints counts only, never transcript text.
 */
import { readFileSync } from 'node:fs';
import { RETELL_GATE, retellAgreement, retellGateOpen } from '../src/retell-agreement.ts';
import type { RetellJudgement } from '../src/retell-agreement.ts';
import { retellWords, scoreRetell } from '../src/retell.ts';
import type { RetellIdea } from '../src/retell.ts';

interface CheckedRetell {
  storyId: string;
  keyIdeas: RetellIdea[];
  transcript: string;
  human: boolean[];
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: retell-agreement <set.json>');
  process.exit(1);
}

const set = JSON.parse(readFileSync(file, 'utf8')) as { retells: CheckedRetell[] };
const judgements: RetellJudgement[] = set.retells.map((r) => ({
  storyId: r.storyId,
  code: scoreRetell(retellWords(r.transcript), r.keyIdeas).ideas.map((i) => i.covered),
  human: r.human,
}));

const report = retellAgreement(judgements);
console.log(
  JSON.stringify(
    { report, gate: RETELL_GATE, gateOpen: retellGateOpen(report) },
    (_key, value: unknown) =>
      typeof value === 'number' && !Number.isInteger(value) ? Number(value.toFixed(3)) : value,
    2,
  ),
);
