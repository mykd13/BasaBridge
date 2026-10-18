/**
 * Evaluation CLI (BB-21). Run with `pnpm --filter @basabridge/story-ai eval <command>`.
 * See README.md in this folder.
 */
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { MAX_LEVEL, MIN_LEVEL, TIERS } from '@basabridge/levels';
import { compareSummaries } from './compare';
import { gate } from './gate';
import { GOLD_SET } from './gold/gold-set';
import { SAFETY_SET } from './gold/safety-set';
import { goldReplayAdapters } from './gold-replay';
import { runExitCode, summarize } from './metrics';
import { formatComparison, formatGate, formatSummary } from './report';
import { runEval, type EvalAdapters } from './runner';
import { listRuns, loadRun, newRunId, RunNotFound, RUNS_DIR, saveRun } from './store';

const USAGE = `Usage: pnpm --filter @basabridge/story-ai eval <command>

  run [--adapters gold-replay|models] [--levels 5,24] [--per-level 1]
      [--include-drafts] [--label name] [--story-model p/m] [--verifier-model p/m]
                                  run the harness and save the run
  show <run>                      print the summary of a saved run
  list                            list saved runs
  compare <baseline> <candidate>  compare two runs, such as two models
  gate <candidate> [--baseline <run>]
                                  exit 1 when the change is blocked

run exits 1 when a counted gold or safety case fails the checks.

<run> is a run id or a path to a .json file. Runs are saved in ${RUNS_DIR}
(override with --dir). Model names come from STORY_MODEL and VERIFIER_MODEL unless
the flags are given. Keys are never printed or saved.`;

class UsageError extends Error {}

/** One level from the middle of each tier, so a default run covers every tier. */
const defaultLevels = () => TIERS.map((t) => Math.floor((t.from + t.to) / 2));

function parseLevels(value: string | undefined): number[] {
  if (value === undefined) return defaultLevels();
  const levels = value.split(',').map((x) => Number(x.trim()));
  if (levels.some((l) => !Number.isInteger(l) || l < MIN_LEVEL || l > MAX_LEVEL)) {
    throw new UsageError(
      `--levels must be whole numbers from ${MIN_LEVEL} to ${MAX_LEVEL}, separated by commas.`,
    );
  }
  return levels;
}

function gitSha(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function adaptersFor(
  name: string,
  includeDrafts: boolean,
  models: { story: string | undefined; verifier: string | undefined },
): EvalAdapters {
  if (name === 'gold-replay')
    return goldReplayAdapters([...GOLD_SET, ...SAFETY_SET], includeDrafts);
  if (name === 'models') {
    if (!models.story || !models.verifier) {
      throw new UsageError(
        'Set STORY_MODEL and VERIFIER_MODEL, or pass --story-model and --verifier-model.',
      );
    }
    throw new UsageError(
      'Model adapters arrive in BB-21 part 2, after story generation (BB-15) and the verifier (BB-17) are merged.',
    );
  }
  throw new UsageError(`Unknown adapters "${name}". Use gold-replay or models.`);
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      adapters: { type: 'string', default: 'gold-replay' },
      levels: { type: 'string' },
      'per-level': { type: 'string', default: '1' },
      'include-drafts': { type: 'boolean', default: false },
      label: { type: 'string' },
      'story-model': { type: 'string' },
      'verifier-model': { type: 'string' },
      baseline: { type: 'string' },
      dir: { type: 'string', default: RUNS_DIR },
      help: { type: 'boolean', default: false },
    },
  });
  const [command, ...refs] = positionals;
  const dir = values.dir;

  if (values.help || command === undefined) {
    console.log(USAGE);
    return command === undefined && !values.help ? 2 : 0;
  }

  if (command === 'run') {
    const perLevel = Number(values['per-level']);
    if (!Number.isInteger(perLevel) || perLevel < 0) {
      throw new UsageError('--per-level must be a whole number.');
    }
    const adapters = adaptersFor(values.adapters, values['include-drafts'], {
      story: values['story-model'] ?? process.env.STORY_MODEL,
      verifier: values['verifier-model'] ?? process.env.VERIFIER_MODEL,
    });
    const startedAt = new Date();
    const run = await runEval({
      id: newRunId(startedAt, values.label ?? adapters.name),
      startedAt,
      gitSha: gitSha(),
      levels: parseLevels(values.levels),
      perLevel,
      cases: [...GOLD_SET, ...SAFETY_SET],
      includeDrafts: values['include-drafts'],
      adapters,
    });
    const path = await saveRun(run, dir);
    const summary = summarize(run);
    console.log(formatSummary(run, summary));
    console.log(`${String.fromCharCode(10)}Saved ${path}`);
    // A counted gold or safety case that fails the checks fails the run, visibly.
    const code = runExitCode(summary);
    if (code !== 0)
      console.error('A counted gold or safety case fails the checks. See the list above.');
    return code;
  }

  if (command === 'show') {
    if (refs.length !== 1) throw new UsageError('show needs one run.');
    const run = await loadRun(refs[0]!, dir);
    console.log(formatSummary(run, summarize(run)));
    return 0;
  }

  if (command === 'list') {
    const ids = await listRuns(dir);
    console.log(ids.length ? ids.join('\n') : `No runs in ${dir}`);
    return 0;
  }

  if (command === 'compare') {
    if (refs.length !== 2)
      throw new UsageError('compare needs a baseline run and a candidate run.');
    const [baseline, candidate] = await Promise.all(refs.map((r) => loadRun(r, dir)));
    console.log(
      formatComparison(
        baseline!,
        candidate!,
        compareSummaries(summarize(baseline!), summarize(candidate!)),
      ),
    );
    return 0;
  }

  if (command === 'gate') {
    if (refs.length !== 1) throw new UsageError('gate needs one candidate run.');
    const candidate = await loadRun(refs[0]!, dir);
    const baseline = values.baseline ? await loadRun(values.baseline, dir) : null;
    const result = gate(candidate, baseline);
    console.log(formatGate(result));
    return result.pass ? 0 : 1;
  }

  throw new UsageError(`Unknown command "${command}".`);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Our own errors are safe to print. Anything else could carry file or model text, so only its
    // kind is shown.
    const ours = error instanceof UsageError || error instanceof RunNotFound;
    console.error(ours ? error.message : `Failed: ${(error as Error).name}`);
    console.error('Run with --help for usage.');
    process.exitCode = 2;
  },
);
