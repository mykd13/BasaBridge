'use client';

import { Field, Notice } from '@basabridge/ui';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import { changePasswordAction } from '@/server/actions/account';
import { authConfig } from '@/server/auth/config';
import { FormError, SubmitButton, useFormText } from './form-parts';

/** Change password on My account (A4). Needs the current password. Other sessions are signed out. */
export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, EMPTY_FORM);
  const { t, fieldErrors } = useFormText();
  const errors = fieldErrors(state);
  return (
    <form action={action} className="bb-account__form" noValidate>
      <FormError state={state} />
      {state.notice === 'passwordChanged' ? (
        <Notice tone="good" live="polite">
          <p>{t('account.myAccount.passwordChanged')}</p>
        </Notice>
      ) : null}
      <Field
        name="currentPassword"
        type="password"
        label={t('account.myAccount.currentPassword')}
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <Field
        name="password"
        type="password"
        label={t('account.myAccount.newPassword')}
        hint={t('account.signUp.passwordHint', { min: authConfig.minPasswordLength })}
        autoComplete="new-password"
        required
        error={errors.password}
      />
      <SubmitButton variant="secondary">{t('account.myAccount.passwordSubmit')}</SubmitButton>
    </form>
  );
}
