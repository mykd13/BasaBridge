import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tierFor } from '@basabridge/levels';
import { alignToReference, editAlign } from './align.ts';
import {
  DataError,
  dataDir,
  isInsideRepository,
  loadDataset,
  loadPassages,
  mergeLabels,
  parseManifest,
  parseTranscript,
  passageWords,
  readAllResults,
  transcriptTemplate,
  writeResult,
} from './data.ts';
import { formatLog } from './log.ts';
import { scoreRecording } from './metrics.ts';
import { passagePhrases } from './providers/assemblyai.ts';
import { parseAssessment } from './providers/azure.ts';
import { COMPANIES, PROVIDER_NAMES, companyOf } from './providers/index.ts';
import { buildReport } from './report.ts';
import { auroc, clusterBootstrapRatio, cohenKappa, percentile } from './stats.ts';
import { normaliseWords } from './text.ts';
import type { HeardWord, TruthRow } from './types.ts';
import { readWav, writeWav } from './wav.ts';

const heard = (text: string, confidence = 0.9, start = 0, end = 0): HeardWord => ({
  text,
  start,
  end,
  confidence,
});

const row = (
  index: number | null,
  expected: string | null,
  outcome: TruthRow['outcome'],
  said: string,
  start: number | null = null,
  end: number | null = null,
): TruthRow => ({ index, expected, outcome, said: said ? said.split(' ') : [], start, end });

describe('normaliseWords', () => {
  it('lower cases, drops punctuation and apostrophes, spells small numbers', () => {
    expect(normaliseWords("It's 5 o'clock, Mia!")).toEqual(['its', 'five', 'oclock', 'mia']);
    expect(normaliseWords('well-known 100')).toEqual(['well', 'known', '100']);
  });
});

describe('alignToReference', () => {
  it('matches, substitutes, omits and inserts', () => {
    const a = alignToReference(
      ['the', 'cat', 'sat', 'down'],
      ['the', 'bat', 'sat', 'um', 'down', 'now'],
    );
    expect(a.words.map((w) => w.kind)).toEqual(['match', 'sub', 'match', 'match']);
    expect(a.insertions).toEqual([3, 5]);
    const b = alignToReference(['the', 'cat', 'sat'], ['the', 'sat']);
    expect(b.words.map((w) => w.kind)).toEqual(['match', 'omit', 'match']);
  });

  it('treats a self-correction as a match plus an insertion', () => {
    const a = alignToReference(['the', 'cat'], ['the', 'bat', 'cat']);
    expect(a.words.map((w) => w.kind)).toEqual(['match', 'match']);
    expect(a.insertions).toEqual([1]);
  });
});

describe('editAlign', () => {
  it('counts substitutions, deletions and insertions', () => {
    const e = editAlign(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'e']);
    expect([e.substitutions, e.deletions, e.insertions]).toEqual([1, 0, 1]);
    expect(editAlign(['a', 'b'], []).deletions).toBe(2);
  });
});

describe('stats', () => {
  it('computes percentiles with interpolation', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([], 50)).toBeNull();
  });

  it('computes AUROC', () => {
    expect(auroc([0.9, 0.8, 0.1, 0.2], [true, true, false, false])).toBe(1);
    expect(auroc([0.5, 0.5], [true, false])).toBe(0.5);
    expect(auroc([1, 2], [true, true])).toBeNull();
  });

  it('bootstraps a stable interval around the ratio', () => {
    const clusters: Array<[number, number]> = Array.from({ length: 20 }, () => [5, 100]);
    expect(clusterBootstrapRatio(clusters)).toEqual([0.05, 0.05]);
    const mixed: Array<[number, number]> = Array.from({ length: 20 }, (_, i) => [
      i % 2 ? 10 : 0,
      100,
    ]);
    const [lo, hi] = clusterBootstrapRatio(mixed)!;
    expect(lo).toBeLessThan(0.05);
    expect(hi).toBeGreaterThan(0.05);
  });

  it("computes Cohen's kappa", () => {
    expect(cohenKappa([true, false, true, false], [true, false, true, false])).toBe(1);
    expect(cohenKappa([true, false], [false, true])).toBe(-1);
  });
});

describe('scoreRecording', () => {
  const passage = ['the', 'cat', 'sat', 'on', 'the', 'mat'];

  it('separates false errors from missed errors', () => {
    const truth = [
      row(0, 'the', 'correct', 'the'),
      row(1, 'cat', 'correct', 'cat'),
      row(2, 'sat', 'substitution', 'sit'),
      row(3, 'on', 'correct', 'on'),
      row(4, 'the', 'omission', ''),
      row(5, 'mat', 'correct', 'mat'),
    ];
    // Provider mishears "cat" as "cap" (false error), hears "sat" although the child said
    // "sit" (missed error), and correctly hears nothing for the skipped "the".
    const s = scoreRecording(passage, truth, [
      heard('The'),
      heard('cap', 0.3),
      heard('sat'),
      heard('on'),
      heard('mat.'),
    ]);
    expect(s.errors).toEqual({ falseErrors: 1, readWords: 4, missedErrors: 1, miscueWords: 2 });
    // "cap" has confidence 0.3, so flagging below 0.5 removes the false error.
    expect(s.flagged[0.5]!.falseErrors).toBe(0);
    expect(s.flagged[0.3]!.falseErrors).toBe(1);
    // Against what was said (the cat sit on mat): cap/cat and sat/sit are substitutions.
    expect(s.wordEdits).toBe(2);
    expect(s.wordRefLength).toBe(5);
    expect(s.wrong).toEqual([false, true, true, false, false]);
  });

  it('counts self-corrections and repetitions as read, and skips unclear words', () => {
    const truth = [
      row(0, 'the', 'repetition', 'the the'),
      row(1, 'cat', 'self_correction', 'bat cat'),
      row(2, 'sat', 'unclear', ''),
      row(3, 'on', 'correct', 'on'),
      row(4, 'the', 'correct', 'the'),
      row(5, 'mat', 'correct', 'mat'),
    ];
    const s = scoreRecording(
      passage,
      truth,
      ['the', 'the', 'bat', 'cat', 'on', 'the', 'mat'].map((w) => heard(w)),
    );
    expect(s.errors).toEqual({ falseErrors: 0, readWords: 5, missedErrors: 0, miscueWords: 0 });
  });

  it('measures timestamp error on correct words with human times', () => {
    const truth = passage.map((w, i) => row(i, w, 'correct', w, i, i + 0.5));
    const s = scoreRecording(
      passage,
      truth,
      passage.map((w, i) => heard(w, 0.9, i + 0.1, i + 0.4)),
    );
    expect(s.startErrorsMs.map(Math.round)).toEqual([100, 100, 100, 100, 100, 100]);
    expect(s.endErrorsMs.map(Math.round)).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it("scores a provider's own assessment when it has one per passage word", () => {
    const truth = passage.map((w, i) =>
      row(i, w, i === 2 ? 'substitution' : 'correct', i === 2 ? 'sit' : w),
    );
    const s = scoreRecording(passage, truth, [], ['ok', 'miscue', 'miscue', 'ok', 'ok', 'ok']);
    expect(s.assessment).toEqual({ falseErrors: 1, readWords: 5, missedErrors: 0, miscueWords: 1 });
  });
});

describe('passages', () => {
  it('fit the story length of their tier in packages/levels', () => {
    for (const p of loadPassages().values()) {
      const { min, max } = tierFor(p.level).words;
      const n = passageWords(p).length;
      expect(n, p.id).toBeGreaterThanOrEqual(min);
      expect(n, p.id).toBeLessThanOrEqual(max);
    }
  });
});

describe('data folder', () => {
  it('refuses a folder inside a repository', () => {
    expect(isInsideRepository(import.meta.dirname ?? '.')).toBe(true);
    expect(() => dataDir({ BAKEOFF_DATA_DIR: '.' })).toThrow(DataError);
    expect(() => dataDir({})).toThrow(DataError);
  });

  it('refuses a synced folder unless allowed', () => {
    expect(isInsideRepository(tmpdir())).toBe(false);
    const synced = mkdtempSync(join(tmpdir(), 'OneDrive-'));
    expect(() => dataDir({ BAKEOFF_DATA_DIR: synced })).toThrow(/synced/);
    expect(dataDir({ BAKEOFF_DATA_DIR: synced, BAKEOFF_ALLOW_SYNCED: '1' })).toBe(synced);
  });
});

describe('manifest and transcripts', () => {
  const passages = loadPassages();
  const header = 'recording_id,reader_code,passage_id,age_band,first_language,device,noise,vendors';

  it('accepts the group fields and nothing else', () => {
    const [r] = parseManifest(
      `${header}\nrec-0001,R01,P01,6-8,cebuano,phone,quiet,deepgram;azure\n`,
      passages,
      ['deepgram', 'azure'],
    );
    expect(r!.vendors).toEqual(['deepgram', 'azure']);
    expect(() =>
      parseManifest(`${header}\nrec-0001,R01,P01,7,cebuano,phone,quiet,\n`, passages, []),
    ).toThrow(/age_band/);
    expect(() => parseManifest('recording_id,name\n', passages, [])).toThrow(/header/);
    expect(() =>
      parseManifest(`${header}\nrec-0001,R01,P01,6-8,cebuano,phone,quiet,acme\n`, passages, [
        'azure',
      ]),
    ).toThrow(/vendors/);
  });

  it('round-trips a template and rejects transcripts that drift from the passage', () => {
    const words = passageWords(passages.get('P01')!);
    const tpl = transcriptTemplate(words);
    expect(parseTranscript(tpl, words, 't')).toHaveLength(words.length);
    const missing = tpl
      .split('\n')
      .filter((_, i) => i !== 3)
      .join('\n');
    expect(() => parseTranscript(missing, words, 't')).toThrow(/expected index/);
    const insertion = tpl.replace('\n1\t', '\n\t\tinsertion\tum\t\t\n1\t');
    expect(parseTranscript(insertion, words, 't').filter((r) => r.index === null)).toHaveLength(1);
  });

  it('merges Audacity labels onto rows with something said', () => {
    const words = ['the', 'cat'];
    const tsv = transcriptTemplate(words).replace('1\tcat\tcorrect\tcat', '1\tcat\tomission\t');
    const merged = mergeLabels(tsv, '0.50\t0.70\tthe\n', 'x');
    const rows = parseTranscript(merged, words, 'x');
    expect(rows[0]).toMatchObject({ start: 0.5, end: 0.7 });
    expect(rows[1]).toMatchObject({ start: null, end: null });
    expect(() => mergeLabels(tsv, '0.5\t0.7\ta\n0.8\t0.9\tb\n', 'x')).toThrow(/labels/);
  });
});

describe('wav', () => {
  it('reads what it writes', () => {
    const wav = readWav(writeWav(new Uint8Array(32000), 16000));
    expect(wav).toMatchObject({ sampleRate: 16000, channels: 1, bitsPerSample: 16, seconds: 1 });
  });
});

describe('log', () => {
  it('drops fields that are not on the allow list', () => {
    const fields = { recordingId: 'rec-0001', readerCode: 'R01', text: 'the cat' } as never;
    expect(formatLog('call', fields)).toBe('call recordingId=rec-0001');
  });
});

describe('report', () => {
  it('shows aggregates only and hides small groups', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bakeoff-test-'));
    mkdirSync(join(dir, 'transcripts'));
    const passages = loadPassages();
    const words = passageWords(passages.get('P01')!);
    const lines = [
      'recording_id,reader_code,passage_id,age_band,first_language,device,noise,vendors',
    ];
    for (let i = 1; i <= 6; i++) {
      const id = `rec-000${i}`;
      lines.push(`${id},R0${i},P01,${i <= 5 ? '6-8' : '15-17'},waray,phone,quiet,deepgram`);
      writeFileSync(join(dir, 'transcripts', `${id}.tsv`), transcriptTemplate(words));
      writeResult(dir, {
        provider: 'deepgram',
        mode: 'plain',
        transport: 'batch',
        recordingId: id,
        latencyMs: 1000,
        audioSeconds: 4,
        ok: true,
        words: words.map((w) => heard(w)),
      });
    }
    writeFileSync(join(dir, 'manifest.csv'), lines.join('\n'));
    const ds = loadDataset(dir, ['deepgram']);
    const md = buildReport(ds, [], [], { generatedOn: '2026-10-17' });
    expect(md).toContain('6 transcribed recordings from 6 readers');
    const withResults = buildReport(ds, readAllResults(dir), [], { generatedOn: '2026-10-17' });
    expect(withResults).toContain(
      '| deepgram plain batch | 0 of 6 | 0.0% (0.0 to 0.0) | 0.0% (0.0 to 0.0)',
    );
    expect(withResults).toContain('| ageBand | 15-17 | fewer than 5 |');
    expect(withResults).toMatch(/\| deepgram plain batch \| hidden \| 0\.0% \/ 0\.0% \|/);
    expect(withResults).not.toContain('R01');
  });
});

describe('adapter helpers', () => {
  it('cuts a passage into phrases of at most six words', () => {
    const phrases = passagePhrases('The cat sat on the big red mat today. It slept.');
    expect(phrases).toEqual(['The cat sat on the big', 'red mat today', 'It slept']);
  });

  it('turns Azure assessment words into heard words and one verdict per passage word', () => {
    const tick = 1e7;
    const pa = (AccuracyScore: number, ErrorType: string) => ({
      PronunciationAssessment: { AccuracyScore, ErrorType },
    });
    const { words, assessment } = parseAssessment([
      { Word: 'the', Offset: 0, Duration: tick / 2, ...pa(98, 'None') },
      { Word: 'cat', Offset: tick, Duration: tick / 2, ...pa(40, 'Mispronunciation') },
      { Word: 'um', Offset: 2 * tick, Duration: tick / 4, ...pa(0, 'Insertion') },
      { Word: 'sat', Offset: 0, Duration: 0, ...pa(0, 'Omission') },
      {
        Word: 'down',
        Offset: 3 * tick,
        Duration: tick / 2,
        AccuracyScore: 90,
        ErrorType: 'UnexpectedBreak',
      },
    ]);
    expect(assessment).toEqual(['ok', 'miscue', 'miscue', 'ok']);
    expect(words.map((w) => w.text)).toEqual(['the', 'cat', 'um', 'down']);
    expect(words[1]).toMatchObject({ start: 1, end: 1.5, confidence: 0.4 });
  });

  it('maps both Azure adapters to the same company for consent', () => {
    expect(companyOf('azure-pa')).toBe('azure');
    expect(companyOf('deepgram')).toBe('deepgram');
    expect(PROVIDER_NAMES.map(companyOf).every((c) => COMPANIES.includes(c))).toBe(true);
  });
});
