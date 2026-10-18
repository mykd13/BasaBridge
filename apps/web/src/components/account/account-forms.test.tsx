import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import type { Lang, Wording } from '@/i18n/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/server/actions/account', () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
  requestResetAction: vi.fn(),
  resetPasswordAction: vi.fn(),
  changePasswordAction: vi.fn(),
}));
vi.mock('@/server/actions/sharing', () => ({
  linkChildAction: vi.fn(),
  makeLinkCodeAction: vi.fn(),
  setShareFlagAction: vi.fn(),
  stopSharingAction: vi.fn(),
}));

const { SignInForm } = await import('./SignInForm');
const { SignUpForm } = await import('./SignUpForm');
const { ResetPasswordForm, ResetRequestForm } = await import('./ResetForms');
const { ChangePasswordForm } = await import('./ChangePasswordForm');
const { LinkChildForm } = await import('./LinkChildForm');
const { LinkCodePanel, LinkedParent } = await import('./ShareControls');

const render = (node: React.ReactNode, lang: Lang = 'en', wording: Wording = 'standard') =>
  renderToStaticMarkup(withIntl(node, lang, wording));

describe('account forms', () => {
  it('sign in has labelled username and password fields and a reset link', () => {
    const out = render(<SignInForm />);
    expect(out).toContain('Username or email');
    expect(out).toMatch(
      /type="password"[^>]*autoComplete="current-password"|autoComplete="current-password"[^>]*type="password"/i,
    );
    expect(out).toContain('href="/reset-password"');
    expect(out).toContain('Sign in</button>');
  });

  it('student sign up has a username and an optional email, parent sign up has neither a username', () => {
    const student = render(<SignUpForm role="student" />);
    expect(student).toContain('name="username"');
    expect(student).toContain('Email (optional)');
    expect(student).toContain('value="student"');
    const parent = render(<SignUpForm role="parent" />);
    expect(parent).not.toContain('name="username"');
    expect(parent).toContain('value="parent"');
    expect(parent).toContain('Your email');
  });

  it('never asks for age, role or name from the browser beyond the role switch', () => {
    const out = render(<SignUpForm role="student" />);
    expect(out).not.toMatch(/name="(age|ageBand|name|fullName)"/);
  });

  it('uses simple and Filipino wording', () => {
    expect(render(<SignInForm />, 'en', 'standard')).toContain('Forgot your password?');
    expect(render(<SignInForm />, 'fil')).toContain('Nakalimutan ang password?');
  });

  it('reset forms render', () => {
    expect(render(<ResetRequestForm />)).toContain('Send link');
    const out = render(<ResetPasswordForm token="abc" />);
    expect(out).toContain('name="token"');
    expect(out).toContain('Save password');
  });

  it('change password asks for the current password', () => {
    expect(render(<ChangePasswordForm />)).toContain('Current password');
  });

  it('link child needs a code and a guardian confirmation', () => {
    const out = render(<LinkChildForm />);
    expect(out).toContain('name="code"');
    expect(out).toMatch(/name="confirm"[^>]*required|required[^>]*name="confirm"/);
  });
});

describe('sharing controls', () => {
  it('shows an empty state, not a fake code, when there is no code', () => {
    const out = render(<LinkCodePanel code={null} />);
    expect(out).toContain('You have no code yet.');
    expect(out).toContain('Make a code');
  });

  it('shows the code a learner made', () => {
    expect(render(<LinkCodePanel code="BB-TEST-01" />)).toContain('BB-TEST-01');
  });

  it('shows switches that reflect the link and no voice switch', () => {
    const out = render(
      <LinkedParent link={{ id: 'l1', sharesProgress: true, sharesAnalysis: false }} />,
    );
    expect(out).toContain('My level and skills');
    expect(out).toContain('Reading analysis');
    expect(out.match(/checked=""/g)).toHaveLength(1);
    expect(out).toContain('Stop sharing');
    expect(out).not.toMatch(/voice/i);
  });
});
