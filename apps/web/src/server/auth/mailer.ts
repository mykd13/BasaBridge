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
