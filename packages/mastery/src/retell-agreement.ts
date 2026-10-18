/**
 * Agreement between retell scoring and human checkers (BB-46). Pure functions: no AI, no I/O.
 * The retell score stays an experiment until a human-checked set shows it agrees well enough.
 * The threshold and why it was chosen are in RETELL.md in this package.
 *
 * This file has no imports, so scripts/retell-agreement.ts can run it with plain Node.
 */

/** One retell judged idea by idea, by the scoring code and by a person. */
export interface RetellJudgement {
  storyId: string;
  /** Per key idea, in the story's order: did the code count it as covered? */
  code: readonly boolean[];
  /** Per key idea, in the same order: did the human checker count it as covered? */
  human: readonly boolean[];
}

export interface AgreementReport {
  retells: number;
  stories: number;
  /** Key ideas judged, summed over all retells. */
  ideas: number;
  /** Share of ideas where code and human agree. */
  percentAgreement: number;
  /** Cohen's kappa over all ideas. null when it is undefined (both sides gave one answer only). */
  kappa: number | null;
  /** Code said covered, human said not. */
  codeOnly: number;
  /** Human said covered, code said not. */
  humanOnly: number;
  /** Share of retells where the code's count of covered ideas is within one of the human count. */
  totalsWithinOne: number;
}

/**
 * The bar the experiment must clear before anyone may propose using retell scores (RETELL.md).
 * Clearing it does not switch anything on: `usableForLevels` stays false until a new decision
 * changes it and packages/levels says how a retell counts.
 */
export const RETELL_GATE = {
  minKappa: 0.7,
  minTotalsWithinOne: 0.9,
  minRetells: 60,
  minStories: 10,
  usableForLevels: false,
} as const;

export function retellAgreement(judgements: readonly RetellJudgement[]): AgreementReport {
  let agree = 0;
  let codeOnly = 0;
  let humanOnly = 0;
  let codeYes = 0;
  let humanYes = 0;
  let ideas = 0;
  let withinOne = 0;
  for (const j of judgements) {
    if (j.code.length !== j.human.length) {
      throw new Error(
        `Retell for story ${j.storyId} has ${j.code.length} code scores and ${j.human.length} human scores.`,
      );
    }
    let codeCount = 0;
    let humanCount = 0;
    j.code.forEach((c, i) => {
      const h = j.human[i]!;
      ideas += 1;
      if (c === h) agree += 1;
      else if (c) codeOnly += 1;
      else humanOnly += 1;
      if (c) codeCount += 1;
      if (h) humanCount += 1;
    });
    codeYes += codeCount;
    humanYes += humanCount;
    if (Math.abs(codeCount - humanCount) <= 1) withinOne += 1;
  }
  const po = ideas === 0 ? 0 : agree / ideas;
  let kappa: number | null = null;
  if (ideas > 0) {
    const pc = codeYes / ideas;
    const ph = humanYes / ideas;
    const pe = pc * ph + (1 - pc) * (1 - ph);
    kappa = pe === 1 ? null : (po - pe) / (1 - pe);
  }
  return {
    retells: judgements.length,
    stories: new Set(judgements.map((j) => j.storyId)).size,
    ideas,
    percentAgreement: po,
    kappa,
    codeOnly,
    humanOnly,
    totalsWithinOne: judgements.length === 0 ? 0 : withinOne / judgements.length,
  };
}

/** Whether a report clears the bar in RETELL_GATE. Retell scores still change no level either way. */
export function retellGateOpen(report: AgreementReport): boolean {
  return (
    report.retells >= RETELL_GATE.minRetells &&
    report.stories >= RETELL_GATE.minStories &&
    report.kappa !== null &&
    report.kappa >= RETELL_GATE.minKappa &&
    report.totalsWithinOne >= RETELL_GATE.minTotalsWithinOne
  );
}
