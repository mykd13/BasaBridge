'use client';

import { Field } from '@basabridge/ui';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import { signUpAction } from '@/server/actions/account';
import { authConfig } from '@/server/auth/config';
import { FormError, SubmitButton, useFormText } from './form-parts';

/**
 * Create an account (A2). A learner picks a username, a password and, if they like, an email.
 * A parent signs up with an email. The age gate and consent (BB-8, BB-11) are not part of this
 * form yet. The server sets the role and never trusts the browser for age.
 */
export function SignUpForm({ role }: { role: 'student' | 'parent' }) {
  const [state, action] = useActionState(signUpAction, EMPTY_FORM);
  const { t, fieldErrors } = useFormText();
  const errors = fieldErrors(state);
  const parent = role === 'parent';
  return (
    <form action={action} className="bb-account__form" noValidate>
      <input type="hidden" name="role" value={role} />
      <FormError state={state} />
      {parent ? null : (
        <Field
          name="username"
          label={t('account.signUp.username')}
          hint={t('account.signUp.usernameHint')}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={authConfig.maxUsernameLength}
          error={errors.username}
        />
      )}
      <Field
        name="password"
        type="password"
        label={t('account.signUp.password')}
        hint={t('account.signUp.passwordHint', { min: authConfig.minPasswordLength })}
        autoComplete="new-password"
        required
        error={errors.password}
      />
      <Field
        name="email"
        type="email"
        label={parent ? t('account.signUp.parentEmail') : t('account.signUp.email')}
        hint={parent ? undefined : t('account.signUp.emailHint')}
        autoComplete="email"
        required={parent}
        error={errors.email}
      />
      <SubmitButton>{t('account.signUp.submit')}</SubmitButton>
    </form>
  );
}
