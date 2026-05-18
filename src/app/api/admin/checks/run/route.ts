import { NextRequest, NextResponse } from "next/server";

import { getOrCreateActiveContest } from "@/lib/contest";
import { runInstagramCheck, type CheckStage } from "@/lib/checks";
import { requireAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(request.headers);
  } catch {
    return unauthorizedResponse();
  }

  const payload = await readPayload(request);
  const stage = payload.stage;

  if (!isCheckStage(stage)) {
    return NextResponse.json({ error: "stage must be start, middle, or final" }, { status: 400 });
  }

  const db = getPrisma();
  const contest = payload.contestId
    ? await db.contest.findUnique({ where: { id: payload.contestId } })
    : await getOrCreateActiveContest(db);

  if (!contest) {
    return NextResponse.json({ error: "contest not found" }, { status: 404 });
  }

  try {
    const result = await runInstagramCheck(contest.id, stage, db);
    return NextResponse.json({ contestId: contest.id, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Check failed" }, { status: 400 });
  }
}

async function readPayload(request: NextRequest): Promise<{ contestId?: string; stage?: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("form")) {
    const formData = await request.formData();
    return {
      contestId: formData.get("contestId")?.toString(),
      stage: formData.get("stage")?.toString(),
    };
  }

  return (await request.json()) as { contestId?: string; stage?: string };
}

function isCheckStage(value: string | undefined): value is CheckStage {
  return value === "start" || value === "middle" || value === "final";
}
