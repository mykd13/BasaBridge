'use client';

import { Button, Notice, Spinner } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { authConfig } from '@/server/auth/config';
import type { FieldName, FormErrorKey, FormState } from '@/lib/account-forms';

/** Turns the error keys a form action returns into catalog text. */
export function useFormText() {
  const t = useTranslations();
  const error = (key: FormErrorKey | undefined, state?: FormState): string | undefined => {
    if (!key) return undefined;
    return t(`account.errors.${key}`, {
      min: key === 'usernameLength' ? authConfig.minUsernameLength : authConfig.minPasswordLength,
      max: authConfig.maxUsernameLength,
      minutes: state?.retryAfterMinutes ?? authConfig.lockoutWindowMinutes,
    });
  };
  /** The message for each field that has one, ready to pass as `error`. */
  const fieldErrors = (state: FormState): Partial<Record<FieldName, string>> =>
    Object.fromEntries(
      Object.entries(state.fields ?? {}).map(([name, key]) => [name, error(key, state)]),
    );
  return { t, error, fieldErrors };
}

/** The error banner for a whole form. It is announced when it appears. */
export function FormError({ state }: { state: FormState }) {
  const { error } = useFormText();
  const text = error(state.error, state);
  if (!text) return null;
  return (
    <Notice tone={state.error === 'notWired' ? 'warn' : 'bad'} live="assertive">
      <p>{text}</p>
    </Notice>
  );
}

/** A submit button that shows a spinner while the action runs and cannot be pressed twice. */
export function SubmitButton({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const { pending } = useFormStatus();
  const t = useTranslations();
  return (
    <Button type="submit" variant={variant} block disabled={pending} aria-busy={pending}>
      {pending ? <Spinner size="sm" label={t('account.state.pending')} /> : children}
    </Button>
  );
}
