function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="color: #0f766e; margin-bottom: 4px;">Drive Offer</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export function otpEmailTemplate(params: {
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}): {
  subject: string;
  html: string;
} {
  const { code, purposeLabel, expiresInMinutes } = params;
  return {
    subject: `Your Drive Offer verification code: ${code}`,
    html: wrapper(`
      <p>Your verification code for <strong>${purposeLabel}</strong> is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${code}</p>
      <p>This code expires in ${expiresInMinutes} minutes. Never share it with anyone — Drive Offer staff will never ask for it.</p>
    `),
  };
}

export function temporaryPinEmailTemplate(params: {
  email: string;
  temporaryPin: string;
}): {
  subject: string;
  html: string;
} {
  const { email, temporaryPin } = params;
  return {
    subject: "Your Drive Offer account has been created",
    html: wrapper(`
      <p>An account has been created for you on Drive Offer.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary PIN:</strong></p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${temporaryPin}</p>
      <p>Log in with this email and PIN. You'll be required to set a new PIN on your first login.</p>
    `),
  };
}

export function pinResetEmailTemplate(params: { temporaryPin: string }): {
  subject: string;
  html: string;
} {
  const { temporaryPin } = params;
  return {
    subject: "Your Drive Offer PIN has been reset",
    html: wrapper(`
      <p>Your PIN was reset. Use this temporary PIN to log in:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${temporaryPin}</p>
      <p>You'll be required to set a new PIN on your next login. All other active sessions have been signed out.</p>
    `),
  };
}
