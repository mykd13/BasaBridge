'use client';

import { Field, Notice } from '@basabridge/ui';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import { requestResetAction, resetPasswordAction } from '@/server/actions/account';
import { authConfig } from '@/server/auth/config';
import { FormError, SubmitButton, useFormText } from './form-parts';

/** Ask for a reset link. The answer is the same whether or not the email is known. */
export function ResetRequestForm() {
  const [state, action] = useActionState(requestResetAction, EMPTY_FORM);
  const { t, fieldErrors } = useFormText();
  const errors = fieldErrors(state);
  if (state.notice === 'resetSent') {
    return (
      <Notice tone="good" live="polite">
        <p>{t('account.reset.sent')}</p>
      </Notice>
    );
  }
  return (
    <form action={action} className="bb-account__form" noValidate>
      <FormError state={state} />
      <Field
        name="email"
        type="email"
        label={t('account.reset.email')}
        autoComplete="email"
        required
        error={errors.email}
      />
      <SubmitButton>{t('account.reset.submit')}</SubmitButton>
    </form>
  );
}

/** Choose a new password with the token from the email link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, EMPTY_FORM);
  const { t, fieldErrors } = useFormText();
  const errors = fieldErrors(state);
  if (state.notice === 'passwordReset') {
    return (
      <Notice tone="good" live="polite">
        <p>{t('account.reset.done')}</p>
      </Notice>
    );
  }
  return (
    <form action={action} className="bb-account__form" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <Field
        name="password"
        type="password"
        label={t('account.reset.newPassword')}
        hint={t('account.signUp.passwordHint', { min: authConfig.minPasswordLength })}
        autoComplete="new-password"
        required
        error={errors.password}
      />
      <SubmitButton>{t('account.reset.newSubmit')}</SubmitButton>
    </form>
  );
}
