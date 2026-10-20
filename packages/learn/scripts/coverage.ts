/**
 * Print which lessons exist and which still need writing or review.
 * Usage: pnpm --filter @basabridge/learn coverage
 */
import { formatCoverage, lessonCoverage } from '../src/coverage';
import { LESSON_FILES } from '../src/lessons';

console.log(formatCoverage(lessonCoverage(LESSON_FILES)));
