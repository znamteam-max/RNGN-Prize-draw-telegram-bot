export function csvList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeConfiguredInstagramAccount(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().replace(/^@/, "").toLowerCase();
}

export const appEnv = {
  databaseUrl: process.env.DATABASE_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  adminToken: process.env.ADMIN_TOKEN,
  adminTelegramIds: csvList(process.env.ADMIN_TELEGRAM_IDS),
  contestTitle: process.env.CONTEST_TITLE?.trim() || "Instagram giveaway",
  instagramAccount1: normalizeConfiguredInstagramAccount(process.env.CONTEST_INSTAGRAM_1, "account_1"),
  instagramAccount2: normalizeConfiguredInstagramAccount(process.env.CONTEST_INSTAGRAM_2, "account_2"),
};

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}
