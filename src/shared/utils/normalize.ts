export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "imam.hossen@gmail.com" -> "im***@gmail.com" — used in API responses so the client can confirm the right inbox without fully exposing it. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/**
 * Normalizes a Bangladeshi phone number to the local 11-digit format
 * (01XXXXXXXXX), accepting +880/880 prefixes as input.
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("880") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }
  if (digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(normalizeBdPhone(phone));
}
