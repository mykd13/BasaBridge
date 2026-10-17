import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './util';

export type Tone = 'accent' | 'warn' | 'good' | 'bad';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone | 'mark';
  /** sm is the status pill (H2, P2). lg is the result pill (S11, G3). */
  size?: 'sm' | 'lg';
  icon?: ReactNode;
}

/** A small label such as "New" or "Learned". It is not a control. */
export function Chip({
  tone = 'accent',
  size = 'sm',
  icon,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span className={cx('bb-chip', `bb-chip--${tone}`, `bb-chip--${size}`, className)} {...rest}>
      {icon ? (
        <span className="bb-chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

const NOTICE_ICONS = {
  accent: Info,
  warn: TriangleAlert,
  good: CircleCheck,
  bad: CircleAlert,
} as const;

export interface NoticeProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  /**
   * polite: announce when it appears (role="status").
   * assertive: interrupt, for errors that block the learner (role="alert").
   * Leave unset for notices that are there when the page loads.
   */
  live?: 'polite' | 'assertive';
}

/** A callout. The canvas draws the amber one (S4, S13, A2); the other tones use the same shape. */
export function Notice({ tone = 'warn', title, children, live }: NoticeProps) {
  const Icon = NOTICE_ICONS[tone];
  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;
  return (
    <div className={cx('bb-notice', `bb-notice--${tone}`)} role={role}>
      <Icon className="bb-notice__icon" size={22} aria-hidden="true" />
      <div className="bb-notice__body">
        {title ? <p className="bb-notice__title">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** strong uses the 2px border from the teacher note and the recommended lesson. */
  emphasis?: 'normal' | 'strong' | 'accent';
  as?: 'section' | 'div' | 'article' | 'aside';
}

/** The white surface used for asides, teacher notes and settings lists. */
export function Card({
  emphasis = 'normal',
  as: Tag = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag className={cx('bb-card', `bb-card--${emphasis}`, className)} {...rest}>
      {children}
    </Tag>
  );
}

/** The small bold heading above a card, such as "Your level". */
export function Eyebrow({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent';
}) {
  return <p className={cx('bb-eyebrow', tone === 'accent' && 'bb-eyebrow--accent')}>{children}</p>;
}
