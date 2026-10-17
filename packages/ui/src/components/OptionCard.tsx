import { Check, X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx, VisuallyHidden } from './util';

/**
 * idle and selected are answer choices the learner can press.
 * correct, wrong and dimmed show the result after the server scored the answer.
 */
export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

export interface OptionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The badge letter, such as "A". */
  letter: string;
  children: ReactNode;
  state?: OptionState;
  /**
   * Words read by screen readers for a result state, such as "Correct answer".
   * Colour and icon show it visually; this says it out loud.
   */
  statusLabel?: string;
}

const RESULT_STATES: OptionState[] = ['correct', 'wrong', 'dimmed'];

/** An answer choice from the question screen (S8) and its result (S9). */
export function OptionCard({
  letter,
  children,
  state = 'idle',
  statusLabel,
  className,
  type = 'button',
  ...rest
}: OptionCardProps) {
  const classes = cx('bb-option', `bb-option--${state}`, className);
  const badge = (
    <span className="bb-option__badge" aria-hidden="true">
      {state === 'correct' ? <Check size={20} strokeWidth={3} /> : null}
      {state === 'wrong' ? <X size={20} strokeWidth={3} /> : null}
      {state !== 'correct' && state !== 'wrong' ? letter : null}
    </span>
  );
  const status = statusLabel ? <VisuallyHidden>{`${statusLabel}: `}</VisuallyHidden> : null;

  // A scored option is no longer a control, so it is not a button.
  if (RESULT_STATES.includes(state)) {
    return (
      <div className={classes}>
        {badge}
        <span className="bb-option__text">
          {status}
          <VisuallyHidden>{`${letter}. `}</VisuallyHidden>
          {children}
        </span>
      </div>
    );
  }

  return (
    <button type={type} className={classes} aria-pressed={state === 'selected'} {...rest}>
      {badge}
      <span className="bb-option__text">
        <VisuallyHidden>{`${letter}. `}</VisuallyHidden>
        {children}
      </span>
    </button>
  );
}

/** Stacks option cards with the canvas spacing. */
export function OptionList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="bb-options" role="group" aria-label={label}>
      {children}
    </div>
  );
}
