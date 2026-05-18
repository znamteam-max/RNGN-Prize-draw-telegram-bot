import { NextRequest, NextResponse } from "next/server";

import { getOrCreateActiveContest } from "@/lib/contest";
import { parseFollowersFile } from "@/lib/followers-parser";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin, unauthorizedResponse } from "@/lib/admin-auth";
import type { CheckStage, InstagramAccountSlot } from "@/lib/checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let adminId: string;

  try {
    adminId = requireAdmin(request.headers).id;
  } catch {
    return unauthorizedResponse();
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const stage = formData.get("stage")?.toString();
  const account = formData.get("account")?.toString();
  const requestedContestId = formData.get("contestId")?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!isCheckStage(stage) || !isInstagramAccountSlot(account)) {
    return NextResponse.json({ error: "stage and account are required" }, { status: 400 });
  }

  const db = getPrisma();
  const contest = requestedContestId
    ? await db.contest.findUnique({ where: { id: requestedContestId } })
    : await getOrCreateActiveContest(db);

  if (!contest) {
    return NextResponse.json({ error: "contest not found" }, { status: 404 });
  }

  const content = await file.text();
  const parsed = parseFollowersFile(file.name, content, file.type);
  const parseStatus = parsed.errors.length > 0 && parsed.usernames.length === 0 ? "failed" : "parsed";

  const batch = await db.importBatch.create({
    data: {
      contestId: contest.id,
      stage,
      instagramAccount: account,
      fileName: file.name,
      uploadedBy: adminId,
      followersCount: parsed.followersCount,
      followers: parsed.usernames,
      parseStatus,
      parseError: parsed.errors.join("\n") || null,
    },
  });

  return NextResponse.json({
    id: batch.id,
    contestId: contest.id,
    stage,
    account,
    fileName: file.name,
    followersCount: parsed.followersCount,
    sourceType: parsed.sourceType,
    parseStatus,
    errors: parsed.errors,
  });
}

function isCheckStage(value: string | undefined): value is CheckStage {
  return value === "start" || value === "middle" || value === "final";
}

function isInstagramAccountSlot(value: string | undefined): value is InstagramAccountSlot {
  return value === "account_1" || value === "account_2";
}
