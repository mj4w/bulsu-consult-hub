import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: process.env.SMTP_PORT || "465",
    smtpSecure: process.env.SMTP_SECURE || "true",
    hasSmtpUser: Boolean(process.env.SMTP_USER || process.env.GMAIL_USER),
    hasSmtpPassword: Boolean(
      process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
    ),
    hasEmailFrom: Boolean(process.env.EMAIL_FROM),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasCronSecret: Boolean(process.env.CRON_SECRET),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    hasTestRecipientOverride: Boolean(
      process.env.EMAIL_TEST_RECIPIENT_OVERRIDE?.trim(),
    ),
  });
}
