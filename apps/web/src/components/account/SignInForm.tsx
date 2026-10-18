'use client';

import { Field } from '@basabridge/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { EMPTY_FORM } from '@/lib/account-forms';
import { signInAction } from '@/server/actions/account';
import { FormError, SubmitButton, useFormText } from './form-parts';

/** Sign in (A1). Username or email, and a password. The server answers; the browser never decides. */
export function SignInForm() {
  const [state, action] = useActionState(signInAction, EMPTY_FORM);
  const { t, fieldErrors } = useFormText();
  const errors = fieldErrors(state);
  return (
    <form action={action} className="bb-account__form" noValidate>
      <FormError state={state} />
      <Field
        name="identifier"
        label={t('account.signIn.identifier')}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={errors.identifier}
      />
      <Field
        name="password"
        type="password"
        label={t('account.signIn.password')}
        autoComplete="current-password"
        required
        error={errors.password}
      />
      <SubmitButton>{t('account.signIn.submit')}</SubmitButton>
      <Link className="bb-account__link" href="/reset-password">
        {t('account.signIn.forgot')}
      </Link>
    </form>
  );
}
