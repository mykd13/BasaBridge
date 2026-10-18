export interface ResetEmail {
  to: string;
  url: string;
}

/** The only way auth sends email. A real provider is wired in later (ADR 0005, open items). */
export interface Mailer {
  sendPasswordReset(message: ResetEmail): Promise<void>;
}

/** Local default. Logs that a message was sent, never the address or the link. */
export const consoleMailer: Mailer = {
  async sendPasswordReset() {
    console.info('[auth] password reset email queued (no provider configured)');
  },
};

/**
 * Used in production until a provider is wired in (BB-64). It fails loudly instead of letting a
 * parent believe a reset email was sent. It logs no address and no link.
 */
export const unconfiguredMailer: Mailer = {
  async sendPasswordReset() {
    console.error('[auth] password reset requested but no email provider is configured');
    throw new Error('No email provider is configured, so password reset email cannot be sent.');
  },
};
