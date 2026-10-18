import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { learners, users } from '@basabridge/db/schema';
import { authConfig, AUTH_CODES } from './config';
import type { Auth } from './create-auth';
import type { Db } from './lockout';

/** The reserved domain is for students who gave no email. Nobody may register with it. */
const realEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254)
  .refine((e) => !e.endsWith('.invalid'), { message: AUTH_CODES.emailNotAllowed });

const password = z.string().min(authConfig.minPasswordLength).max(authConfig.maxPasswordLength);

const studentSchema = z.object({
  username: z.string().trim().min(authConfig.minUsernameLength).max(authConfig.maxUsernameLength),
  password,
  /** Optional. Only used for password reset. */
  email: realEmail.optional(),
});

const parentSchema = z.object({ email: realEmail, password });

export type StudentSignUp = z.input<typeof studentSchema>;
export type ParentSignUp = z.input<typeof parentSchema>;

export interface SignUpResult {
  userId: string;
  /** AUTH_CODES.noEmail when password reset will not work for this account, else null. */
  notice: typeof AUTH_CODES.noEmail | null;
}

/**
 * The age band is set by the age gate (BB-8), not at sign-up and never by the person, so it is
 * not accepted here. Parents sign in by email. The username column is unique and required, so
 * they get a random handle. No real name is stored for anyone.
 */
export async function signUpParent(auth: Auth, db: Db, raw: ParentSignUp): Promise<SignUpResult> {
  const input = parentSchema.parse(raw);
  const handle = `p_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const res = await auth.api.signUpEmail({
    body: { email: input.email, password: input.password, name: handle, username: handle },
  });
  await finish(db, res.user.id, async () => {
    await db
      .update(users)
      .set({ role: 'parent', emailReal: true })
      .where(eq(users.id, res.user.id));
  });
  return { userId: res.user.id, notice: null };
}

export async function signUpStudent(auth: Auth, db: Db, raw: StudentSignUp): Promise<SignUpResult> {
  const input = studentSchema.parse(raw);
  // The placeholder is built from a random id, not the username, so a username can never
  // collide with a parent's email or break the address format.
  const email = input.email ?? `${randomUUID()}@${authConfig.noEmailDomain}`;
  const res = await auth.api.signUpEmail({
    body: { email, password: input.password, name: input.username, username: input.username },
  });
  await finish(db, res.user.id, async () => {
    await db
      .update(users)
      .set({ emailReal: input.email !== undefined })
      .where(eq(users.id, res.user.id));
    await db.insert(learners).values({ userId: res.user.id });
  });
  return { userId: res.user.id, notice: input.email ? null : AUTH_CODES.noEmail };
}

/**
 * Better Auth refuses role, emailReal and ageBand in any sign-up body (input: false keeps them
 * out of /update-user too), so the server sets them here. The role defaults to the less
 * powerful 'student'. If a step fails, the half-made user is removed. Rows cascade from the user.
 */
async function finish(db: Db, userId: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (err) {
    await db.delete(users).where(eq(users.id, userId));
    throw err;
  }
}
