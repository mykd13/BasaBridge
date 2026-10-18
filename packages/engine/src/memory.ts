/**
 * In-memory implementations of the engine's ports, for tests and for local wiring before the
 * database repositories exist. They hold data in process memory only and are not for production.
 */
import type {
  AnalysisSource,
  LearnerProfile,
  LearnerRepository,
  PlacementRecord,
  PlacementRepository,
  SessionRecord,
  SessionRepository,
  StoredStory,
  StoryBank,
} from './types';
import type { TryAnalysis } from '@basabridge/contracts';

const clone = <T>(x: T): T => structuredClone(x);

export class MemoryLearners implements LearnerRepository {
  readonly profiles = new Map<string, LearnerProfile>();
  async getProfile(id: string) {
    const p = this.profiles.get(id);
    return p ? clone(p) : null;
  }
  async saveProgress(id: string, progress: LearnerProfile['progress']) {
    const p = this.profiles.get(id);
    if (p) p.progress = clone(progress);
  }
  async savePlacement(
    id: string,
    placement: LearnerProfile['placement'],
    progress: LearnerProfile['progress'] | null,
  ) {
    const p = this.profiles.get(id);
    if (!p) return;
    p.placement = clone(placement);
    if (progress) p.progress = clone(progress);
  }
}

export class MemorySessions implements SessionRepository {
  readonly rows = new Map<string, SessionRecord>();
  async get(id: string) {
    const r = this.rows.get(id);
    return r ? clone(r) : null;
  }
  async findActive(learnerId: string) {
    const r = [...this.rows.values()].find((x) => x.learnerId === learnerId && x.status !== 'done');
    return r ? clone(r) : null;
  }
  async create(record: SessionRecord) {
    this.rows.set(record.id, clone(record));
  }
  async save(record: SessionRecord) {
    this.rows.set(record.id, clone(record));
  }
  async recentStoryIds(learnerId: string, limit: number) {
    return [...this.rows.values()]
      .filter((x) => x.learnerId === learnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((x) => x.storyId);
  }
}

export class MemoryPlacements implements PlacementRepository {
  readonly rows = new Map<string, PlacementRecord>();
  async get(id: string) {
    const r = this.rows.get(id);
    return r ? clone(r) : null;
  }
  async findInProgress(learnerId: string) {
    const r = [...this.rows.values()].find((x) => x.learnerId === learnerId && x.status !== 'done');
    return r ? clone(r) : null;
  }
  async create(record: PlacementRecord) {
    this.rows.set(record.id, clone(record));
  }
  async save(record: PlacementRecord) {
    this.rows.set(record.id, clone(record));
  }
}

/** A bank over a fixed list. Picks the story closest to the level that is not excluded. */
export class MemoryStoryBank implements StoryBank {
  constructor(readonly stories: StoredStory[]) {}
  async pick(input: { level: number; excludeStoryIds: string[] }) {
    const open = this.stories.filter((s) => !input.excludeStoryIds.includes(s.id));
    open.sort((a, b) => Math.abs(a.level - input.level) - Math.abs(b.level - input.level));
    return open[0] ? clone(open[0]) : null;
  }
  async get(id: string) {
    const s = this.stories.find((x) => x.id === id);
    return s ? clone(s) : null;
  }
}

/** Analyses keyed by capture id, handed out once. */
export class MemoryAnalyses implements AnalysisSource {
  readonly byCapture = new Map<string, { learnerId: string; analysis: TryAnalysis }>();
  add(learnerId: string, captureId: string, analysis: TryAnalysis) {
    this.byCapture.set(captureId, { learnerId, analysis });
  }
  async take(learnerId: string, captureId: string) {
    const hit = this.byCapture.get(captureId);
    if (!hit || hit.learnerId !== learnerId) return null;
    this.byCapture.delete(captureId);
    return hit.analysis;
  }
}
