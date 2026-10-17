/**
 * Account tiers for limits (BB-63). A new account with no email gets lower limits until it
 * finishes its first story. An email or a finished story moves it to the standard tier.
 * The limit values themselves are configuration (BB-39 env vars), never set here.
 */
export type LearnerTier = 'new' | 'standard';

export interface TierInput {
  /** True when the account has an email that can receive mail (users.email_real, BB-7). */
  emailReal: boolean;
  /** True once any reading session of this learner reached `done`. */
  hasFinishedStory: boolean;
}

export function learnerTier({ emailReal, hasFinishedStory }: TierInput): LearnerTier {
  return emailReal || hasFinishedStory ? 'standard' : 'new';
}
