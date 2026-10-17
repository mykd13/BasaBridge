import type { ComprehensionSkill, Story } from '@basabridge/contracts';

/** Mirrors StoryErrorKind in BB-15 errors.ts. Swap to the import once it is on main. */
export type StoryErrorKind =
  'config' | 'model_call' | 'invalid_output' | 'checks_failed' | 'verifier_rejected';

export interface StoryError {
  kind: StoryErrorKind;
  reason: string;
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  attempts: number;
}

export type PipelineOutcome =
  { ok: true; story: Story; usage: Usage } | { ok: false; error: StoryError; usage: Usage };

export interface PipelineInput {
  level: number;
  topic: string;
  focus: ComprehensionSkill | null;
  recentTitles: string[];
}

/** Generate, check, verify, retry. Implemented by composing BB-15, BB-16 and BB-17 later. */
export type StoryPipeline = (input: PipelineInput) => Promise<PipelineOutcome>;

export interface BankEntry {
  id: string;
  level: number;
  topic: string;
  story: Story;
  createdAt: Date;
}

export interface FindQuery {
  level: number;
  excludeIds: readonly string[];
  avoidTopics: readonly string[];
}

export interface StoryBankStore {
  /** Stories in stock at a level, counted by topic. Topics with none may be missing. */
  stockByTopic(level: number): Promise<Map<string, number>>;
  /** One stored story at the level that is not excluded, preferring topics not avoided. Null when none. */
  findUnread(query: FindQuery): Promise<BankEntry | null>;
  save(input: { level: number; topic: string; story: Story }): Promise<BankEntry>;
}

/** Milliseconds, injected so tests control time. */
export type Clock = () => number;
export type Logger = (event: string, data: Record<string, unknown>) => void;
