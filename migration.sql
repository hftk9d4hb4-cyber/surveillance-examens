import crypto from "node:crypto";

export function baseUrl() {
  const raw =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
  );
}

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || process.env.SMTP_USER || "").trim().toLowerCase();
}

export function setupTokenConfigured() {
  return Boolean(process.env.SETUP_TOKEN?.trim());
}

export function setupTokenMatches(candidate: string | undefined) {
  const expected = process.env.SETUP_TOKEN?.trim();
  if (!expected || !candidate) return false;
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}
