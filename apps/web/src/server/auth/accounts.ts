import { randomUUID } from 'node:crypto';
import { learners } from '@basabridge/db/schema';
import { authConfig, NO_EMAIL_NOTICE } from './config';
import type { Auth } from './create-auth';
import type { Db } from './lockout';

export interface StudentSignUp {
  username: string;
  password: string;
  /** Optional. Only used for password reset. */
  email?: string;
  ageBand?: string;
}

export interface ParentSignUp {
  email: string;
  password: string;
}

export interface SignUpResult {
  userId: string;
  /** Set when password reset will not work for this account. Show it to the person plainly. */
  notice: string | null;
}

/** Parents sign in by email. The username column is unique and required, so they get a handle. */
export async function signUpParent(auth: Auth, input: ParentSignUp): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  const res = await auth.api.signUpEmail({
    body: {
      email,
      password: input.password,
      name: email,
      username: `p_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      role: 'parent',
      emailReal: true,
    } as never,
  });
  return { userId: res.user.id, notice: null };
}

export async function signUpStudent(
  auth: Auth,
  db: Db,
  input: StudentSignUp,
): Promise<SignUpResult> {
  const name = input.username.trim();
  const realEmail = input.email?.trim().toLowerCase() || null;
  const email = realEmail ?? `${name.toLowerCase()}@${authConfig.noEmailDomain}`;
  const res = await auth.api.signUpEmail({
    body: {
      email,
      password: input.password,
      name,
      username: name,
      role: 'student',
      emailReal: realEmail !== null,
      ageBand: input.ageBand,
    } as never,
  });
  await db.insert(learners).values({ userId: res.user.id }).onConflictDoNothing();
  return { userId: res.user.id, notice: realEmail ? null : NO_EMAIL_NOTICE };
}
