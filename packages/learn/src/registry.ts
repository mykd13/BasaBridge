/**
 * The lesson registry. Every lesson file is validated when the registry is built. Only reviewed
 * lessons go in, so nothing downstream can show a draft to a learner.
 */
import { LESSON_FILES } from './lessons';
import { LessonFile, type Lesson } from './lesson';

export class LessonFileError extends Error {
  constructor(
    readonly file: string,
    readonly issues: string[],
  ) {
    super(`Lesson file ${file} is invalid: ${issues.join('; ')}`);
    this.name = 'LessonFileError';
  }
}

export interface LessonRegistry {
  /** Reviewed lessons, in file order. */
  readonly lessons: readonly Lesson[];
  get(id: string): Lesson | undefined;
}

/**
 * Build a registry from parsed lesson files. Throws on an invalid file or a repeated id, so a bad
 * file fails the build and tests instead of reaching a learner. Drafts are checked and left out.
 */
export function createRegistry(files: readonly unknown[]): LessonRegistry {
  const byId = new Map<string, Lesson>();
  const seen = new Set<string>();
  files.forEach((file, index) => {
    const parsed = LessonFile.safeParse(file);
    const name = labelFor(file, index);
    if (!parsed.success) {
      throw new LessonFileError(
        name,
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      );
    }
    const lesson = parsed.data;
    if (seen.has(lesson.id)) throw new LessonFileError(name, [`id ${lesson.id} is used twice`]);
    seen.add(lesson.id);
    if (lesson.status === 'reviewed') byId.set(lesson.id, lesson);
  });
  const lessons = [...byId.values()];
  return { lessons, get: (id) => byId.get(id) };
}

function labelFor(file: unknown, index: number): string {
  const id = (file as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : `#${index}`;
}

let loaded: LessonRegistry | undefined;

/** The registry built from the lesson files in `src/lessons`. */
export function lessonRegistry(): LessonRegistry {
  loaded ??= createRegistry(LESSON_FILES);
  return loaded;
}
