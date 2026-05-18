import { NextRequest, NextResponse } from "next/server";

import { appEnv } from "@/lib/env";
import {
  acceptedEntryText,
  askInstagramText,
  contestTermsText,
  getOrCreateActiveContest,
  participantIntroText,
  statusText,
} from "@/lib/contest";
import { drawWinner } from "@/lib/draw";
import { instagramProfileUrl, normalizeInstagramUsername } from "@/lib/instagram";
import { getPrisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  inlineKeyboard,
  sendTelegramMessage,
  type TelegramUpdate,
  type TelegramUser,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (appEnv.telegramWebhookSecret) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");

    if (secret !== appEnv.telegramWebhookSecret) {
      return NextResponse.json({ error: "Invalid Telegram webhook secret" }, { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;

  try {
    await handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, endpoint: "telegram-webhook" });
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query.id, update.callback_query.data, update.callback_query.from);
    return;
  }

  if (!update.message?.from || !update.message.text) {
    return;
  }

  await handleMessage(update.message.from, update.message.chat.id, update.message.text);
}

async function handleMessage(user: TelegramUser, chatId: number | string, text: string): Promise<void> {
  const db = getPrisma();
  const contest = await getOrCreateActiveContest(db);
  const dbUser = await upsertTelegramUser(user);
  const trimmedText = text.trim();

  if (trimmedText === "/start") {
    await sendStart(chatId, contest.instagramAccount1, contest.instagramAccount2);
    return;
  }

  if (trimmedText === "/stats" && isAdminTelegramUser(user)) {
    const entriesCount = await db.contestEntry.count({ where: { contestId: contest.id } });
    const approvedFinalCount = await db.contestEntry.count({
      where: { contestId: contest.id, status: "approved_final" },
    });

    await sendTelegramMessage(chatId, `Заявок: ${entriesCount}\nФинально допущены: ${approvedFinalCount}`);
    return;
  }

  if (trimmedText === "/draw" && isAdminTelegramUser(user)) {
    try {
      const result = await drawWinner(contest.id, user.id.toString(), db);
      await sendTelegramMessage(
        chatId,
        [
          "Победитель выбран как кандидат.",
          `Telegram: @${result.winnerEntry.user.telegramUsername ?? result.winnerEntry.user.telegramId.toString()}`,
          `Instagram: @${result.winnerEntry.instagramUsername}`,
          `Финально подтверждённых участников: ${result.eligibleCount}`,
        ].join("\n"),
      );
    } catch (error) {
      await sendTelegramMessage(chatId, error instanceof Error ? error.message : "Draw failed");
    }

    return;
  }

  if (trimmedText === "/admin" && isAdminTelegramUser(user)) {
    await sendTelegramMessage(chatId, "Админка доступна на странице /admin после деплоя.");
    return;
  }

  if (trimmedText === "Проверить мой статус" || trimmedText === "/status") {
    await sendStatus(chatId, contest.id, dbUser.id);
    return;
  }

  if (trimmedText === "Изменить Instagram-ник" || trimmedText === "/change_instagram") {
    await db.user.update({ where: { id: dbUser.id }, data: { telegramState: "awaiting_instagram" } });
    await sendTelegramMessage(chatId, askInstagramText());
    return;
  }

  if (dbUser.telegramState === "awaiting_instagram") {
    await saveInstagramEntry(chatId, contest.id, dbUser.id, trimmedText);
    return;
  }

  await sendStart(chatId, contest.instagramAccount1, contest.instagramAccount2);
}

async function handleCallback(callbackQueryId: string, data: string | undefined, user: TelegramUser): Promise<void> {
  const db = getPrisma();
  const contest = await getOrCreateActiveContest(db);
  const dbUser = await upsertTelegramUser(user);
  const chatId = user.id;

  await answerCallbackQuery(callbackQueryId);

  if (data === "participate") {
    await sendTelegramMessage(
      chatId,
      contestTermsText(contest.instagramAccount1, contest.instagramAccount2),
      inlineKeyboard([
        [{ text: `Подписаться на @${contest.instagramAccount1}`, url: instagramProfileUrl(contest.instagramAccount1) }],
        [{ text: `Подписаться на @${contest.instagramAccount2}`, url: instagramProfileUrl(contest.instagramAccount2) }],
        [{ text: "Я выполнил условия", callback_data: "conditions_done" }],
      ]),
    );
    return;
  }

  if (data === "conditions_done" || data === "change_instagram") {
    await db.user.update({ where: { id: dbUser.id }, data: { telegramState: "awaiting_instagram" } });
    await sendTelegramMessage(chatId, askInstagramText());
    return;
  }

  if (data === "check_status") {
    await sendStatus(chatId, contest.id, dbUser.id);
    return;
  }
}

async function saveInstagramEntry(chatId: number | string, contestId: string, userId: string, rawUsername: string) {
  const normalizedUsername = normalizeInstagramUsername(rawUsername);

  if (!normalizedUsername) {
    await sendTelegramMessage(chatId, "Не получилось распознать Instagram-ник. Отправь ник в формате @znamteam или ссылкой на профиль.");
    return;
  }

  const db = getPrisma();

  await db.$transaction([
    db.contestEntry.upsert({
      where: { contestId_userId: { contestId, userId } },
      create: {
        contestId,
        userId,
        instagramUsername: normalizedUsername,
        normalizedInstagramUsername: normalizedUsername,
        status: "pending",
      },
      update: {
        instagramUsername: normalizedUsername,
        normalizedInstagramUsername: normalizedUsername,
        status: "pending",
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { telegramState: "idle" },
    }),
  ]);

  await sendTelegramMessage(
    chatId,
    acceptedEntryText(),
    inlineKeyboard([[{ text: "Проверить мой статус", callback_data: "check_status" }]]),
  );
}

async function sendStart(chatId: number | string, account1: string, account2: string): Promise<void> {
  await sendTelegramMessage(
    chatId,
    participantIntroText(account1, account2),
    inlineKeyboard([[{ text: "Участвовать", callback_data: "participate" }]]),
  );
}

async function sendStatus(chatId: number | string, contestId: string, userId: string): Promise<void> {
  const entry = await getPrisma().contestEntry.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });

  if (!entry) {
    await sendTelegramMessage(chatId, "Заявка пока не найдена. Нажми «Участвовать» и отправь Instagram-ник.");
    return;
  }

  await sendTelegramMessage(chatId, statusText(entry.status));
}

async function upsertTelegramUser(user: TelegramUser) {
  return getPrisma().user.upsert({
    where: { telegramId: BigInt(user.id) },
    update: {
      telegramUsername: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    create: {
      telegramId: BigInt(user.id),
      telegramUsername: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });
}

function isAdminTelegramUser(user: TelegramUser): boolean {
  return appEnv.adminTelegramIds.includes(user.id.toString());
}
