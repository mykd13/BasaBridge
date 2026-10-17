import type { ReactNode } from 'react';
import { cx } from './util';

function stepState(step: number, current: number): 'done' | 'current' | 'todo' {
  return step < current ? 'done' : step === current ? 'current' : 'todo';
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.min(Math.max(value, 0), max);
}

export interface ProgressBarProps {
  /** How far along, from 0 to max. The number comes from the server. */
  value: number;
  max?: number;
  /** What the bar measures, read by screen readers, such as "Level progress". */
  label: string;
  /** Read instead of the raw number, such as "6 of 10 stories". */
  valueText?: string;
  /** Split the bar into equal blocks, as on My progress (S14). */
  segments?: number;
  tone?: 'accent' | 'good' | 'mark';
  size?: 'sm' | 'md' | 'lg';
}

/** The linear and segmented bars from S2, S6, S11 and S14. */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  segments,
  tone = 'accent',
  size = 'md',
}: ProgressBarProps) {
  const v = clamp(value, max);
  const pct = max > 0 ? (v / max) * 100 : 0;
  const common = {
    role: 'progressbar' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuenow': v,
    'aria-valuetext': valueText,
  };

  if (segments && segments > 0) {
    const filled = Math.round((pct / 100) * segments);
    return (
      <div {...common} className={cx('bb-segments', `bb-progress--${size}`)}>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={cx('bb-segments__item', i < filled && `bb-fill--${tone}`)} />
        ))}
      </div>
    );
  }

  return (
    <div {...common} className={cx('bb-progress', `bb-progress--${size}`)}>
      <span className={cx('bb-progress__fill', `bb-fill--${tone}`)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface StepDotsProps {
  /** The current step, counting from 1. */
  current: number;
  total: number;
  /** The visible words, such as "Question 3 of 5". Also read by screen readers. */
  label: string;
  /** dots: the question dots (S8). bars: the lesson steps (H3). */
  variant?: 'dots' | 'bars';
}

/** Where the learner is in a short flow. The current step has a mark colour and an outline. */
export function StepDots({ current, total, label, variant = 'dots' }: StepDotsProps) {
  return (
    <div className="bb-steps">
      <ol className={cx('bb-steps__list', `bb-steps--${variant}`)} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const state = stepState(step, current);
          return <li key={step} className={`bb-steps__item bb-steps__item--${state}`} />;
        })}
      </ol>
      <span className="bb-steps__label">{label}</span>
    </div>
  );
}

export interface LevelCardProps {
  /** The small heading, such as "Your level". */
  eyebrow: string;
  /** The level number from the server. */
  level: number;
  /** Words after the number, such as "of 100". */
  suffix?: string;
  /** Progress inside the level, from 0 to 1, with its label. */
  progress?: { value: number; label: string; valueText?: string };
  /** hero is the large centred number from Level up (S12) and the placement result (G3). */
  variant?: 'card' | 'hero';
  children?: ReactNode;
}

/** The level card from Home (S2) and the hero number from S12 and G3. */
export function LevelCard({
  eyebrow,
  level,
  suffix,
  progress,
  variant = 'card',
  children,
}: LevelCardProps) {
  return (
    <section className={cx('bb-level', `bb-level--${variant}`)}>
      <p className="bb-eyebrow">{eyebrow}</p>
      <p className="bb-level__number">
        {level}
        {suffix ? <span className="bb-level__suffix"> {suffix}</span> : null}
      </p>
      {progress ? (
        <ProgressBar
          value={progress.value}
          max={1}
          label={progress.label}
          valueText={progress.valueText}
        />
      ) : null}
      {children}
    </section>
  );
}
