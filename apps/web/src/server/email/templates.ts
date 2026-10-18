/**
 * Email templates (BB-64). Parents read these on a phone, so the wording is short and plain.
 *
 * Inputs are links and numbers only. There is no field for a name, a username, story text or a
 * score, so none can reach an email. Keep it that way when adding a template.
 *
 * The Filipino wording needs a check by a native speaker before pilot. These strings move into
 * the i18n catalog when it exists (BB-58).
 */
export type EmailLanguage = 'en' | 'fil';

export type TemplateName =
  'guardian_approval_request' | 'guardian_approval_confirmed' | 'password_reset';

export interface RenderedEmail {
  template: TemplateName;
  subject: string;
  text: string;
  html: string;
}

export interface GuardianApprovalRequest {
  approveUrl: string;
  declineUrl: string;
  expiresInDays: number;
}

export interface PasswordReset {
  resetUrl: string;
  expiresInMinutes: number;
}

const copy = {
  en: {
    approvalRequest: {
      subject: 'A child asked you to approve BasaBridge reading',
      lines: (days: number) => [
        'A child gave this email address when they signed up for BasaBridge, a reading app.',
        'They are under 13, so we need a parent or guardian to say yes before the app can listen to them read aloud.',
        'Until you say yes, they can still read and answer questions. The microphone stays off.',
        'If you say yes, the app records their voice to check their reading. The recording is deleted after checking, unless the child chooses to keep their recordings.',
        `This link works for ${days} days.`,
      ],
      approve: 'Yes, I approve',
      decline: 'No, keep the microphone off',
      notYou: 'If you do not know this child, choose No. Nothing else will happen.',
    },
    approvalConfirmed: {
      subject: 'You approved BasaBridge reading',
      lines: [
        'Thank you. The child can now read aloud in BasaBridge.',
        'Recordings are deleted after each reading is checked, unless the child chooses to keep them.',
        'You can change your mind at any time by replying to this email.',
      ],
    },
    reset: {
      subject: 'Reset your BasaBridge password',
      lines: (minutes: number) => [
        'Someone asked to reset the password for the BasaBridge account linked to this email.',
        `Use the button below within ${minutes} minutes.`,
        'If it was not you, ignore this email. Your password stays the same.',
      ],
      button: 'Choose a new password',
    },
  },
  fil: {
    approvalRequest: {
      subject: 'May batang humihingi ng pahintulot mo para sa BasaBridge',
      lines: (days: number) => [
        'Ibinigay ng isang bata ang email address na ito nang mag-sign up siya sa BasaBridge, isang app para sa pagbasa.',
        'Wala pa siyang 13 taong gulang, kaya kailangan muna ng pahintulot ng magulang o tagapag-alaga bago siya pakinggan ng app habang nagbabasa nang malakas.',
        'Habang wala pang pahintulot, puwede pa rin siyang magbasa at sumagot ng mga tanong. Nakapatay ang mikropono.',
        'Kung papayag ka, ire-record ng app ang boses niya para suriin ang pagbasa. Buburahin ang recording pagkatapos suriin, maliban kung piliin ng bata na itago ang mga recording niya.',
        `Gagana ang link na ito sa loob ng ${days} araw.`,
      ],
      approve: 'Oo, pumapayag ako',
      decline: 'Hindi, panatilihing nakapatay ang mikropono',
      notYou: 'Kung hindi mo kilala ang batang ito, piliin ang Hindi. Wala nang ibang mangyayari.',
    },
    approvalConfirmed: {
      subject: 'Pinayagan mo ang pagbasa sa BasaBridge',
      lines: [
        'Salamat. Puwede nang magbasa nang malakas ang bata sa BasaBridge.',
        'Binubura ang mga recording pagkatapos suriin ang bawat pagbasa, maliban kung piliin ng bata na itago ang mga ito.',
        'Puwede mong bawiin ang pahintulot anumang oras sa pag-reply sa email na ito.',
      ],
    },
    reset: {
      subject: 'I-reset ang password mo sa BasaBridge',
      lines: (minutes: number) => [
        'May humiling na i-reset ang password ng BasaBridge account na naka-link sa email na ito.',
        `Gamitin ang button sa ibaba sa loob ng ${minutes} minuto.`,
        'Kung hindi ikaw ito, huwag pansinin ang email na ito. Hindi magbabago ang password mo.',
      ],
      button: 'Pumili ng bagong password',
    },
  },
} as const;

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Email links must be https. Plain http is allowed only for localhost, and only outside
 * production, so local development can click through. Any other scheme is refused.
 */
export function assertSafeUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const u = new URL(url);
  if (u.protocol === 'https:') return u.toString();
  const localDev =
    u.protocol === 'http:' && u.hostname === 'localhost' && env.NODE_ENV !== 'production';
  if (localDev) return u.toString();
  throw new Error('Email links must use https');
}

const p = (line: string) =>
  `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${escapeHtml(line)}</p>`;
const button = (label: string, url: string) =>
  `<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;font-size:16px;text-decoration:none;border:1px solid currentColor;border-radius:8px">${escapeHtml(label)}</a></p>`;
const page = (body: string) =>
  `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px">${body}</body></html>`;

export function guardianApprovalRequest(
  lang: EmailLanguage,
  input: GuardianApprovalRequest,
): RenderedEmail {
  const c = copy[lang].approvalRequest;
  const approve = assertSafeUrl(input.approveUrl);
  const decline = assertSafeUrl(input.declineUrl);
  const lines = c.lines(input.expiresInDays);
  return {
    template: 'guardian_approval_request',
    subject: c.subject,
    text: [...lines, '', `${c.approve}: ${approve}`, `${c.decline}: ${decline}`, '', c.notYou].join(
      '\n',
    ),
    html: page(
      lines.map(p).join('') + button(c.approve, approve) + button(c.decline, decline) + p(c.notYou),
    ),
  };
}

export function guardianApprovalConfirmed(lang: EmailLanguage): RenderedEmail {
  const c = copy[lang].approvalConfirmed;
  return {
    template: 'guardian_approval_confirmed',
    subject: c.subject,
    text: c.lines.join('\n'),
    html: page(c.lines.map(p).join('')),
  };
}

export function passwordReset(lang: EmailLanguage, input: PasswordReset): RenderedEmail {
  const c = copy[lang].reset;
  const url = assertSafeUrl(input.resetUrl);
  const lines = c.lines(input.expiresInMinutes);
  return {
    template: 'password_reset',
    subject: c.subject,
    text: [...lines, '', `${c.button}: ${url}`].join('\n'),
    html: page(lines.map(p).join('') + button(c.button, url)),
  };
}
