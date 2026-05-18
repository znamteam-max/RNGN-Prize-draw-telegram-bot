import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getOrCreateActiveContest } from "@/lib/contest";
import { toCsv } from "@/lib/csv";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(request.headers);
  } catch {
    return unauthorizedResponse();
  }

  const db = getPrisma();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") ?? "all";
  const contestId = searchParams.get("contestId");
  const contest = contestId
    ? await db.contest.findUnique({ where: { id: contestId } })
    : await getOrCreateActiveContest(db);

  if (!contest) {
    return NextResponse.json({ error: "contest not found" }, { status: 404 });
  }

  const { csv, fileName } = await buildExport(contest.id, type);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}

async function buildExport(contestId: string, type: string): Promise<{ csv: string; fileName: string }> {
  const db = getPrisma();

  if (type === "eligible") {
    const entries = await db.contestEntry.findMany({
      where: { contestId, status: "approved_final" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      fileName: "approved_final.csv",
      csv: toCsv(
        entries.map((entry) => ({
          telegram_id: entry.user.telegramId.toString(),
          telegram_username: entry.user.telegramUsername,
          instagram_username: entry.instagramUsername,
          approved_final: entry.status === "approved_final",
        })),
        ["telegram_id", "telegram_username", "instagram_username", "approved_final"],
      ),
    };
  }

  if (type === "rejected") {
    const entries = await db.contestEntry.findMany({
      where: {
        contestId,
        status: { in: ["missing_account_1", "missing_account_2", "missing_both", "not_found", "not_eligible_final", "rejected"] },
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      fileName: "not_eligible.csv",
      csv: toCsv(
        entries.map((entry) => ({
          telegram_id: entry.user.telegramId.toString(),
          telegram_username: entry.user.telegramUsername,
          instagram_username: entry.instagramUsername,
          reason: entry.status,
        })),
        ["telegram_id", "telegram_username", "instagram_username", "reason"],
      ),
    };
  }

  if (type === "result") {
    const results = await db.drawResult.findMany({
      where: { contestId },
      include: {
        winnerEntry: {
          include: { user: true },
        },
      },
      orderBy: { drawnAt: "desc" },
    });

    return {
      fileName: "draw_results.csv",
      csv: toCsv(
        results.map((result) => ({
          winner_telegram_id: result.winnerEntry.user.telegramId.toString(),
          winner_telegram_username: result.winnerEntry.user.telegramUsername,
          winner_instagram_username: result.winnerEntry.instagramUsername,
          drawn_at: result.drawnAt,
          confirmed_at: result.confirmedAt,
          status: result.status,
        })),
        ["winner_telegram_id", "winner_telegram_username", "winner_instagram_username", "drawn_at", "confirmed_at", "status"],
      ),
    };
  }

  const entries = await db.contestEntry.findMany({
    where: { contestId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    fileName: "contest_entries.csv",
    csv: toCsv(
      entries.map((entry) => ({
        telegram_id: entry.user.telegramId.toString(),
        telegram_username: entry.user.telegramUsername,
        instagram_username: entry.instagramUsername,
        normalized_instagram_username: entry.normalizedInstagramUsername,
        status: entry.status,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      })),
      [
        "telegram_id",
        "telegram_username",
        "instagram_username",
        "normalized_instagram_username",
        "status",
        "created_at",
        "updated_at",
      ],
    ),
  };
}
