import { cx } from './util';

export interface SpinnerProps {
  /** What is happening, read by screen readers, such as "Checking your reading". */
  label: string;
  size?: 'sm' | 'lg';
}

/**
 * The ring from the loading screen (S3). It turns slowly, and stands still
 * when the learner asked for reduced motion.
 */
export function Spinner({ label, size = 'lg' }: SpinnerProps) {
  return (
    <span className={cx('bb-spinner', `bb-spinner--${size}`)} role="status">
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle className="bb-spinner__track" cx="32" cy="32" r="26" />
        <path className="bb-spinner__arc" d="M32 6a26 26 0 0 1 26 26" />
      </svg>
      <span className="bb-sr-only">{label}</span>
    </span>
  );
}
