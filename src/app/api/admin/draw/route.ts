import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getOrCreateActiveContest } from "@/lib/contest";
import { drawWinner } from "@/lib/draw";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let adminId: string;

  try {
    adminId = requireAdmin(request.headers).id;
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

  try {
    const result = await drawWinner(contest.id, adminId, db);

    return NextResponse.json({
      contestId: contest.id,
      drawResultId: result.id,
      eligibleCount: result.eligibleCount,
      winner: {
        telegramId: result.winnerEntry.user.telegramId.toString(),
        telegramUsername: result.winnerEntry.user.telegramUsername,
        instagramUsername: result.winnerEntry.instagramUsername,
      },
      status: result.status,
      drawnAt: result.drawnAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draw failed" }, { status: 400 });
  }
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
