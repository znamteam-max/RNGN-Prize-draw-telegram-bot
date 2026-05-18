import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getOrCreateActiveContest, middleReminderText } from "@/lib/contest";
import { instagramProfileUrl } from "@/lib/instagram";
import { getPrisma } from "@/lib/prisma";
import { inlineKeyboard, sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(request.headers);
  } catch {
    return unauthorizedResponse();
  }

  const payload = await readPayload(request);
  const db = getPrisma();
  const contest = payload.contestId
    ? await db.contest.findUnique({ where: { id: payload.contestId } })
    : await getOrCreateActiveContest(db);

  if (!contest) {
    return NextResponse.json({ error: "contest not found" }, { status: 404 });
  }

  const entries = await db.contestEntry.findMany({
    where: {
      contestId: contest.id,
      NOT: { status: "approved_middle" },
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const text = middleReminderText(contest.instagramAccount1, contest.instagramAccount2);
  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const message = await sendTelegramMessage(
        entry.user.telegramId,
        text,
        inlineKeyboard([
          [{ text: `Подписаться на @${contest.instagramAccount1}`, url: instagramProfileUrl(contest.instagramAccount1) }],
          [{ text: `Подписаться на @${contest.instagramAccount2}`, url: instagramProfileUrl(contest.instagramAccount2) }],
          [{ text: "Изменить Instagram-ник", callback_data: "change_instagram" }],
          [{ text: "Проверить мой статус", callback_data: "check_status" }],
        ]),
      );

      await db.notification.create({
        data: {
          contestId: contest.id,
          userId: entry.userId,
          type: "middle_reminder",
          text,
          sentAt: new Date(),
          telegramMessageId: message.message_id ? BigInt(message.message_id) : null,
          status: "sent",
        },
      });

      sent += 1;
    } catch (error) {
      await db.notification.create({
        data: {
          contestId: contest.id,
          userId: entry.userId,
          type: "middle_reminder",
          text: `${text}\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`,
          status: "failed",
        },
      });

      failed += 1;
    }
  }

  return NextResponse.json({
    contestId: contest.id,
    recipients: entries.length,
    sent,
    failed,
  });
}

async function readPayload(request: NextRequest): Promise<{ contestId?: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("form")) {
    const formData = await request.formData();
    return { contestId: formData.get("contestId")?.toString() };
  }

  if (contentType.includes("json")) {
    return (await request.json()) as { contestId?: string };
  }

  return {};
}
