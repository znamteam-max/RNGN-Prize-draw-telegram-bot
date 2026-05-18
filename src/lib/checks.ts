import type { PrismaClient } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export type CheckStage = "start" | "middle" | "final";
export type InstagramAccountSlot = "account_1" | "account_2";

export async function runInstagramCheck(contestId: string, stage: CheckStage, db: PrismaClient = getPrisma()) {
  const [account1Batch, account2Batch, entries] = await Promise.all([
    getLatestImportBatch(db, contestId, stage, "account_1"),
    getLatestImportBatch(db, contestId, stage, "account_2"),
    db.contestEntry.findMany({
      where: { contestId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!account1Batch || !account2Batch) {
    throw new Error("Both Instagram follower files must be uploaded before running a check");
  }

  const account1Followers = new Set(jsonFollowersToArray(account1Batch.followers));
  const account2Followers = new Set(jsonFollowersToArray(account2Batch.followers));

  const summary = {
    totalEntries: entries.length,
    approved: 0,
    missingAccount1: 0,
    missingAccount2: 0,
    missingBoth: 0,
    notFound: 0,
  };

  for (const entry of entries) {
    const foundInAccount1 = account1Followers.has(entry.normalizedInstagramUsername);
    const foundInAccount2 = account2Followers.has(entry.normalizedInstagramUsername);
    const result = checkResult(foundInAccount1, foundInAccount2);

    await db.instagramCheck.create({
      data: {
        contestId,
        entryId: entry.id,
        stage,
        foundInAccount1,
        foundInAccount2,
        result,
      },
    });

    await db.contestEntry.update({
      where: { id: entry.id },
      data: { status: entryStatusForStage(stage, result) },
    });

    if (result === "approved") summary.approved += 1;
    if (result === "missing_account_1") summary.missingAccount1 += 1;
    if (result === "missing_account_2") summary.missingAccount2 += 1;
    if (result === "missing_both") summary.missingBoth += 1;
  }

  return {
    stage,
    account1Followers: account1Followers.size,
    account2Followers: account2Followers.size,
    ...summary,
  };
}

export function jsonFollowersToArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

async function getLatestImportBatch(
  db: PrismaClient,
  contestId: string,
  stage: CheckStage,
  instagramAccount: InstagramAccountSlot,
) {
  return db.importBatch.findFirst({
    where: {
      contestId,
      stage,
      instagramAccount,
      parseStatus: "parsed",
    },
    orderBy: { uploadedAt: "desc" },
  });
}

function checkResult(foundInAccount1: boolean, foundInAccount2: boolean) {
  if (foundInAccount1 && foundInAccount2) return "approved" as const;
  if (!foundInAccount1 && foundInAccount2) return "missing_account_1" as const;
  if (foundInAccount1 && !foundInAccount2) return "missing_account_2" as const;
  return "missing_both" as const;
}

function entryStatusForStage(stage: CheckStage, result: ReturnType<typeof checkResult>) {
  if (result === "approved") {
    if (stage === "start") return "approved_start" as const;
    if (stage === "middle") return "approved_middle" as const;
    return "approved_final" as const;
  }

  if (stage === "final") {
    return "not_eligible_final" as const;
  }

  return result;
}
