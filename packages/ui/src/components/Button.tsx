import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './util';

export type ButtonVariant = 'primary' | 'secondary' | 'brand' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonStyleProps {
  /** primary: filled teal. secondary: neutral outline. brand: teal outline. ghost: no border. danger: red outline. */
  variant?: ButtonVariant;
  /** lg is the 62px flow button from the canvas. md is 48px, the smallest touch target. */
  size?: ButtonSize;
  /** An icon shown before the label. Pair every icon with a short word (ADR 0004). */
  icon?: ReactNode;
  /** Stretch to the width of the container. */
  block?: boolean;
}

/** Class names for a button look, for links rendered by a router (for example next/link). */
export function buttonClassName({
  variant = 'primary',
  size = 'lg',
  block = false,
}: ButtonStyleProps = {}): string {
  return cx('bb-btn', `bb-btn--${variant}`, `bb-btn--${size}`, block && 'bb-btn--block');
}

export type ButtonProps = ButtonStyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  size,
  icon,
  block,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClassName({ variant, size, block }), className)}
      {...rest}
    >
      {icon ? (
        <span className="bb-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

export type ButtonLinkProps = ButtonStyleProps & AnchorHTMLAttributes<HTMLAnchorElement>;

/** A real link that looks like a button. Use it when the action goes to another page. */
export function ButtonLink({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={cx(buttonClassName({ variant, size, block }), className)} {...rest}>
      {icon ? (
        <span className="bb-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </a>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** A short word shown under the icon, such as "Listen" or "Again". */
  label: string;
  variant?: 'secondary' | 'brand' | 'primary';
}

/** A square button with an icon and a short visible word (ADR 0004). */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button type={type} className={cx('bb-iconbtn', `bb-iconbtn--${variant}`, className)} {...rest}>
      <span className="bb-iconbtn__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="bb-iconbtn__label">{label}</span>
    </button>
  );
}
