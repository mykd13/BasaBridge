/**
 * Thrown by the parts of Learn that wait on another issue (sign-in BB-12, the authorization layer
 * BB-10, practice item generation BB-54, the question and result screens). It fails visibly. It is
 * never caught and turned into fake data.
 */
export class NotWiredError extends Error {
  constructor(readonly what: string) {
    super(`${what} is not wired yet`);
    this.name = 'NotWiredError';
  }
}
