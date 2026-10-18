import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from './util';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Help under the input, such as "At least 8 letters or numbers." */
  hint?: ReactNode;
  /** An error message. It marks the input invalid and is read with it. */
  error?: ReactNode;
  /** large is the code field from P1. */
  size?: 'md' | 'lg';
}

/** A label, an input, help text and an error, wired together for screen readers (A2, P1). */
export function Field({ label, hint, error, size = 'md', id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId, rest['aria-describedby']].filter(Boolean).join(' ');

  return (
    <div className={cx('bb-field', className)}>
      <label className="bb-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        className={cx('bb-input', size === 'lg' && 'bb-input--lg')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {error ? (
        <p className="bb-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="bb-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /** A second line under the label, such as in the reading help list (I1). */
  description?: ReactNode;
}

/** A checkbox with its label. The whole row is the touch target. */
export function Checkbox({ label, description, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-check`;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <label className={cx('bb-check', className)} htmlFor={inputId}>
      <input {...rest} id={inputId} type="checkbox" aria-describedby={descId} />
      <span className="bb-check__text">
        <span className="bb-check__label">{label}</span>
        {description ? (
          <span className="bb-check__desc" id={descId}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
