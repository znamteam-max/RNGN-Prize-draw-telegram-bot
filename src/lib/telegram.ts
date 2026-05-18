import { appEnv, requireEnv } from "@/lib/env";

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string };
  from?: TelegramUser;
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

export type TelegramReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export function inlineKeyboard(rows: InlineKeyboardButton[][]): TelegramReplyMarkup {
  return { inline_keyboard: rows };
}

export async function sendTelegramMessage(
  chatId: number | string | bigint,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<{ message_id?: number }> {
  return telegramApi("sendMessage", {
    chat_id: chatId.toString(),
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

async function telegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = requireEnv(appEnv.telegramBotToken, "TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { ok: boolean; result?: T; description?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API ${method} failed`);
  }

  return data.result as T;
}
